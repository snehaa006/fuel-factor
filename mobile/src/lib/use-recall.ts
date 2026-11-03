import { useCallback, useEffect, useState } from 'react';

import {
  DEMO_PROFILE,
  DEMO_RECALL_DAYS,
  DEMO_RECALL_NUTRITION,
  demoProgrammeStart,
} from './__fixtures__/today';
import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { FOLLOW_UP_OPEN_FOR_TESTING, recallWindow, type RecallWindow } from './recall-window';
import {
  fetchRecall,
  fetchRecallEntries,
  fetchRecallFoods,
  fetchRecalls,
  saveRecall,
  saveRecallFoods,
  type RecallDay,
  type RecallEntry,
} from './recall';
import { computeNutrition, type RecallNutrition } from './recall-nutrition';
import { todayIso } from './today';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type RecallStatus =
  | { status: 'loading' }
  /** No claimed athlete: the gate, same as Today. */
  | { status: 'needs-onboarding' }
  | {
      status: 'ready';
      participantId: string;
      days: RecallDay[];
      window: RecallWindow;
      programmeStartsOn: string | null;
      /** The follow-up round is open now, for testing. See FOLLOW_UP_OPEN_FOR_TESTING. */
      followUpOpenEarly?: boolean;
    }
  | { status: 'error'; message: string };

/**
 * Which recall is due, and what is already on record.
 *
 * The window is derived on every read from the day numbers that exist and the
 * coach's programme date — there is no "recall due" flag anywhere, the same
 * way there is no awards table behind the badges. Nothing can drift out of
 * step with the rows, and no midnight job has to run.
 */
export function useRecallStatus(): RecallStatus & { reload: () => void } {
  const [state, setState] = useState<RecallStatus>(() => {
    if (!USE_FIXTURE) return { status: 'loading' };
    const today = todayIso();
    const programmeStartsOn = demoProgrammeStart();
    return {
      status: 'ready',
      participantId: DEMO_PROFILE.participantId,
      days: DEMO_RECALL_DAYS,
      window: recallWindow(
        DEMO_RECALL_DAYS.map((d) => d.dayNumber),
        programmeStartsOn,
        today,
        FOLLOW_UP_OPEN_FOR_TESTING
      ),
      followUpOpenEarly: FOLLOW_UP_OPEN_FOR_TESTING,
      programmeStartsOn,
    };
  });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    if (USE_FIXTURE) return;
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    async function load() {
      try {
        const profile = await fetchProfile();
        if (!active) return;
        if (profile === null || profile.kind !== 'athlete') {
          setState({ status: 'needs-onboarding' });
          return;
        }

        const days = await fetchRecalls(profile.participantId);
        if (!active) return;
        setState({
          status: 'ready',
          participantId: profile.participantId,
          days,
          window: recallWindow(
            days.map((d) => d.dayNumber),
            profile.programmeStartsOn,
            todayIso(),
            FOLLOW_UP_OPEN_FOR_TESTING
          ),
          followUpOpenEarly: FOLLOW_UP_OPEN_FOR_TESTING,
          programmeStartsOn: profile.programmeStartsOn,
        });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [nonce]);

  return { ...state, reload };
}

export type RecallFormState =
  | { status: 'loading' }
  | { status: 'needs-onboarding' }
  | {
      status: 'ready';
      /** The answer already on record, or a blank one. */
      entry: RecallEntry;
      /** Set once the day has been saved at least once. */
      recallId: string | null;
      nutrition: RecallNutrition | null;
    }
  | { status: 'error'; message: string };

export type RecallFormController = RecallFormState & {
  save: (entry: RecallEntry) => Promise<void>;
  saving: boolean;
  saveError: string | null;
};

/**
 * One recall day's form.
 *
 * Saving writes the row and then asks the backend to put it through the food
 * database, in that order and never the other way round: the figures belong to
 * a saved day, and a computation against an unsaved form would have nothing to
 * key on.
 */
export function useRecallForm(dayNumber: number): RecallFormController {
  const [state, setState] = useState<RecallFormState>(() =>
    USE_FIXTURE
      ? { status: 'ready', entry: blankEntry(), recallId: null, nutrition: null }
      : { status: 'loading' }
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(
    USE_FIXTURE ? DEMO_PROFILE.participantId : null
  );

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    async function load() {
      try {
        const profile = await fetchProfile();
        if (!active) return;
        if (profile === null || profile.kind !== 'athlete') {
          setState({ status: 'needs-onboarding' });
          return;
        }
        setParticipantId(profile.participantId);

        const [existing, foods] = await Promise.all([
          fetchRecall(profile.participantId, dayNumber),
          fetchRecallFoods(profile.participantId, [dayNumber]),
        ]);
        if (!active) return;
        setState({
          status: 'ready',
          entry: { ...(existing?.entry ?? blankEntry()), foods: foods[dayNumber] ?? [] },
          recallId: existing?.id ?? null,
          nutrition: null,
        });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [dayNumber]);

  const save = useCallback(
    async (entry: RecallEntry) => {
      if (saving) return;
      setSaving(true);
      setSaveError(null);
      try {
        if (USE_FIXTURE) {
          // Nothing to write to, and nothing to compute against. The screen
          // shows the same "not computed yet" the real backend returns.
          setState({ status: 'ready', entry, recallId: 'demo', nutrition: DEMO_RECALL_NUTRITION });
          return;
        }
        if (participantId === null) throw new Error('No athlete is claimed on this device.');

        const recallId = await saveRecall(participantId, dayNumber, entry);
        if (entry.foods !== undefined) await saveRecallFoods(recallId, entry.foods);
        // The figures are the backend's answer. A failure here must not lose a
        // saved recall, so it is reported and the day stays saved.
        let nutrition: RecallNutrition | null = null;
        try {
          nutrition = await computeNutrition(recallId);
        } catch (error) {
          setSaveError(messageOf(error));
        }
        setState({ status: 'ready', entry, recallId, nutrition });
      } catch (error) {
        setSaveError(messageOf(error));
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [dayNumber, participantId, saving]
  );

  return { ...state, save, saving, saveError };
}

export type RecallRoundState =
  | { status: 'loading' }
  | { status: 'needs-onboarding' }
  | {
      status: 'ready';
      /** The answer on record for each day of the round. Missing days are absent. */
      entries: Record<number, RecallEntry>;
      /** Day numbers saved, whether on record already or saved just now. */
      savedDays: number[];
    }
  | { status: 'error'; message: string };

export type RecallRoundController = RecallRoundState & {
  save: (dayNumber: number, entry: RecallEntry) => Promise<void>;
  /** The day currently being written, or null. One save at a time. */
  savingDay: number | null;
  saveError: string | null;
};

/**
 * A whole round of three days, for filling them in one sitting.
 *
 * Still three rows and three saves: a day is saved as it is finished, so a
 * refused write loses the day being typed and not the two already in. Doing
 * it the other way -- hold all three and write them at the end -- means a
 * network blip at the end of twenty minutes' typing costs all of it, and
 * there is no transaction to be had across three upserts anyway.
 *
 * `est_calories` is not written here either. `saveRecall` is the one writer.
 */
export function useRecallRound(dayNumbers: readonly number[]): RecallRoundController {
  const key = dayNumbers.join(',');
  const [state, setState] = useState<RecallRoundState>(() =>
    USE_FIXTURE ? { status: 'ready', entries: {}, savedDays: [] } : { status: 'loading' }
  );
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(
    USE_FIXTURE ? DEMO_PROFILE.participantId : null
  );

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    async function load() {
      try {
        const profile = await fetchProfile();
        if (!active) return;
        if (profile === null || profile.kind !== 'athlete') {
          setState({ status: 'needs-onboarding' });
          return;
        }
        setParticipantId(profile.participantId);

        const days = key === '' ? [] : key.split(',').map(Number);
        const [loaded, foods] = await Promise.all([
          fetchRecallEntries(profile.participantId, days),
          fetchRecallFoods(profile.participantId, days),
        ]);
        if (!active) return;
        const entries: Record<number, RecallEntry> = {};
        for (const [day, entry] of Object.entries(loaded)) {
          entries[Number(day)] = { ...entry, foods: foods[Number(day)] ?? [] };
        }
        setState({ status: 'ready', entries, savedDays: Object.keys(entries).map(Number) });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }

    load();
    return () => {
      active = false;
    };
    // The day numbers are a fresh array on every render; the joined key is
    // what actually changes when the round does.
  }, [key]);

  const save = useCallback(
    async (dayNumber: number, entry: RecallEntry) => {
      if (savingDay !== null) return;
      setSavingDay(dayNumber);
      setSaveError(null);
      try {
        if (!USE_FIXTURE) {
          if (participantId === null) throw new Error('No athlete is claimed on this device.');
          const recallId = await saveRecall(participantId, dayNumber, entry);
          if (entry.foods !== undefined) await saveRecallFoods(recallId, entry.foods);
          // The figures are the backend's answer and a failure there must not
          // lose a saved day, so it is reported and the day stays saved.
          try {
            await computeNutrition(recallId);
          } catch (error) {
            setSaveError(messageOf(error));
          }
        }
        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                entries: { ...current.entries, [dayNumber]: entry },
                savedDays: current.savedDays.includes(dayNumber)
                  ? current.savedDays
                  : [...current.savedDays, dayNumber],
              }
            : current
        );
      } catch (error) {
        setSaveError(messageOf(error));
        throw error;
      } finally {
        setSavingDay(null);
      }
    },
    [participantId, savingDay]
  );

  return { ...state, save, savingDay, saveError };
}

/** A blank answer. Built fresh each time, so no screen shares a draft. */
function blankEntry(): RecallEntry {
  return {
    recall_date: null,
    day_type: null,
    sleep_hours: null,
    breakfast: null,
    lunch: null,
    dinner: null,
    activities: null,
    supplements: null,
    fluid_ml: null,
    energy: null,
    recovery: null,
    urine_colour: null,
    notes: null,
  };
}
