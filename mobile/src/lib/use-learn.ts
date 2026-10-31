import { useCallback, useEffect, useState } from 'react';

import { DEMO_FOODS, DEMO_LESSON_CARDS, DEMO_WEEKS } from './__fixtures__/today';
import { messageOf } from './errors';
import { listFoods, type FoodWithPortions } from './food';
import {
  completeChallenge,
  fetchWeek,
  fetchWeeks,
  setChallengePhoto,
  undoChallenge,
  type Week,
  type WeekDetail,
} from './learn';
import {
  removeChallengePhoto,
  signedPhotoUrl,
  uploadChallengePhoto,
  type PickedPhoto,
} from './photos';
import { todayIso } from './today';

/**
 * Same development flag the Today screen uses: draw from the fixture instead
 * of the network. It matters more here than anywhere else, because the
 * project still has anonymous sign-ins switched off, so without it the Learn
 * section cannot be looked at on a device at all.
 */
const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type WeeksState =
  | { status: 'loading' }
  | { status: 'ready'; weeks: Week[] }
  | { status: 'error'; message: string };

export function useWeeks(): WeeksState {
  // The fixture is known at first render, so it is the initial state rather
  // than something an effect sets afterwards -- which would cost a render and
  // a flash of the spinner for data that was already in hand.
  const [state, setState] = useState<WeeksState>(() =>
    USE_FIXTURE ? { status: 'ready', weeks: DEMO_WEEKS } : { status: 'loading' }
  );

  useEffect(() => {
    let active = true;
    if (USE_FIXTURE) return;

    fetchWeeks()
      .then((weeks) => active && setState({ status: 'ready', weeks }))
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, []);

  return state;
}

export type WeekState =
  | { status: 'loading' }
  | { status: 'ready'; detail: WeekDetail; foods: FoodWithPortions[] }
  | { status: 'error'; message: string };

export type WeekController = WeekState & {
  /** Mark today done, or undo it. A no-op without a claimed athlete. */
  toggleChallenge: () => void;
  /** Upload a picked photo for today and mark the day done. */
  attachPhoto: (photo: PickedPhoto) => void;
  /** Take the photo back. The completion stays. */
  clearPhoto: () => void;
  /** A short-lived URL for today's photo, or null while there is none. */
  photoUrl: string | null;
  /** Set while a photo is uploading, so the screen can say so. */
  uploading: boolean;
  /** The last photo error, in words the athlete can read. */
  photoError: string | null;
  /** For the picker to report a failure of its own. */
  reportPhotoError: (message: string) => void;
};

/** The fixture's answer for a week, known without a round trip. */
function fixtureWeek(weekNumber: number): WeekState {
  const week = DEMO_WEEKS.find((w) => w.weekNumber === weekNumber);
  if (!week) return { status: 'error', message: 'That week is not part of the programme.' };
  return {
    status: 'ready',
    detail: {
      week,
      cards: week.unlocked ? DEMO_LESSON_CARDS : [],
      completedOn: null,
      photoPath: null,
    },
    foods: DEMO_FOODS,
  };
}

export function useWeek(weekNumber: number, participantId: string | null): WeekController {
  const valid = Number.isInteger(weekNumber);
  // Initial state, not an effect, for the same reason as above. Each week is
  // its own pushed screen, so weekNumber does not change under a mounted
  // hook.
  const [state, setState] = useState<WeekState>(() =>
    USE_FIXTURE && valid ? fixtureWeek(weekNumber) : { status: 'loading' }
  );
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const today = todayIso();

  const currentPath =
    state.status === 'ready' && state.detail.completedOn === today
      ? state.detail.photoPath
      : null;

  // The bucket is private, so drawing the image means asking for a signed URL
  // that expires in minutes. Re-signed whenever the stored path changes, and
  // never kept in the database.
  useEffect(() => {
    let active = true;
    // In fixture mode the path is already a local URI and needs no signing.
    if (currentPath === null || USE_FIXTURE) return;

    signedPhotoUrl(currentPath)
      .then((url) => active && setPhotoUrl(url))
      .catch(() => active && setPhotoUrl(null));

    return () => {
      active = false;
    };
  }, [currentPath]);

  useEffect(() => {
    let active = true;
    if (!valid || USE_FIXTURE) return;

    Promise.all([fetchWeek(weekNumber), listFoods()])
      .then(([detail, foods]) => {
        if (!active) return;
        setState(
          detail
            ? { status: 'ready', detail, foods }
            : { status: 'error', message: 'That week is not part of the programme.' }
        );
      })
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, [weekNumber, valid]);

  /**
   * The screen moves first and the write follows, as everywhere else here. A
   * refused write puts the old state back, so the button never claims a
   * completion the database did not take.
   */
  const toggleChallenge = useCallback(() => {
    setState((current) => {
      if (current.status !== 'ready' || saving) return current;
      const { challengeId } = current.detail.week;
      if (!challengeId) return current;

      const wasDone = current.detail.completedOn === today;
      const previous = current.detail.completedOn;

      if (!USE_FIXTURE) {
        if (!participantId) return current;
        setSaving(true);
        const write = wasDone
          ? undoChallenge(challengeId, participantId, today)
          : completeChallenge(challengeId, participantId, today);

        write
          .catch(() =>
            setState((latest) =>
              latest.status === 'ready'
                ? { ...latest, detail: { ...latest.detail, completedOn: previous } }
                : latest
            )
          )
          .finally(() => setSaving(false));
      }

      return { ...current, detail: { ...current.detail, completedOn: wasDone ? null : today } };
    });
  }, [participantId, saving, today]);

  /**
   * Upload a photo for today and mark the day done with it.
   *
   * The upload happens before the row is touched: a completion pointing at a
   * path that does not exist would draw a broken image, and the athlete would
   * have no way to tell the upload had failed.
   */
  const attachPhoto = useCallback(
    (photo: PickedPhoto) => {
      if (state.status !== 'ready' || uploading) return;
      const { challengeId } = state.detail.week;
      if (!challengeId) return;

      // In fixture mode there is nothing to upload to, so the picked file is
      // previewed from its own local URI. The picker, the preview and
      // removing it all behave as they will against the real bucket; only
      // the round trip is absent.
      if (USE_FIXTURE) {
        setPhotoUrl(photo.uri);
        setState((latest) =>
          latest.status === 'ready'
            ? {
                ...latest,
                detail: { ...latest.detail, completedOn: today, photoPath: photo.uri },
              }
            : latest
        );
        return;
      }

      if (!participantId) return;
      setUploading(true);
      setPhotoError(null);

      uploadChallengePhoto(participantId, challengeId, today, photo)
        .then(async (path) => {
          await setChallengePhoto(challengeId, participantId, today, path);
          setState((latest) =>
            latest.status === 'ready'
              ? { ...latest, detail: { ...latest.detail, completedOn: today, photoPath: path } }
              : latest
          );
        })
        .catch((error) => setPhotoError(messageOf(error)))
        .finally(() => setUploading(false));
    },
    [participantId, state, today, uploading]
  );

  /** Take the photo back, leaving the day marked done. */
  const clearPhoto = useCallback(() => {
    if (state.status !== 'ready' || uploading) return;
    const { challengeId } = state.detail.week;
    const path = state.detail.photoPath;
    if (!challengeId || !path) return;

    if (USE_FIXTURE) {
      setPhotoUrl(null);
      setState((latest) =>
        latest.status === 'ready'
          ? { ...latest, detail: { ...latest.detail, photoPath: null } }
          : latest
      );
      return;
    }

    if (!participantId) return;
    setUploading(true);
    setPhotoError(null);

    // The row first, then the object: a row pointing at a deleted file draws
    // a broken image, while an orphaned file draws nothing at all.
    setChallengePhoto(challengeId, participantId, today, null)
      .then(() => removeChallengePhoto(path))
      .then(() =>
        setState((latest) =>
          latest.status === 'ready'
            ? { ...latest, detail: { ...latest.detail, photoPath: null } }
            : latest
        )
      )
      .catch((error) => setPhotoError(messageOf(error)))
      .finally(() => setUploading(false));
  }, [participantId, state, today, uploading]);

  return {
    ...state,
    toggleChallenge,
    attachPhoto,
    clearPhoto,
    // Gated on the path rather than cleared in the effect, so a URL signed
    // for a photo that has since been removed can never be drawn.
    photoUrl: currentPath === null ? null : photoUrl,
    uploading,
    photoError,
    reportPhotoError: setPhotoError,
  };
}
