import { useCallback, useEffect, useState } from 'react';

import {
  DEMO_PROFILE,
  DEMO_RECALL_DAYS,
  DEMO_RECALL_NUTRITION,
  demoProgrammeStart,
} from './__fixtures__/today';
import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { recallWindow, type RecallWindow } from './recall-window';
import { fetchRecall, fetchRecalls, saveRecall, type RecallDay, type RecallEntry } from './recall';
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
    const programmeStartsOn = demoProgrammeStart(today);
    return {
      status: 'ready',
      participantId: DEMO_PROFILE.participantId,
      days: DEMO_RECALL_DAYS,
      window: recallWindow(
        DEMO_RECALL_DAYS.map((d) => d.dayNumber),
        programmeStartsOn,
        today
      ),
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
            todayIso()
          ),
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

        const existing = await fetchRecall(profile.participantId, dayNumber);
        if (!active) return;
        setState({
          status: 'ready',
          entry: existing?.entry ?? blankEntry(),
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
