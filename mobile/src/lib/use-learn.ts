import { useCallback, useEffect, useState } from 'react';

import { DEMO_FOODS, DEMO_LESSON_CARDS, DEMO_WEEKS } from './__fixtures__/today';
import { messageOf } from './errors';
import { listFoods, type FoodWithPortions } from './food';
import {
  completeChallenge,
  fetchWeek,
  fetchWeeks,
  undoChallenge,
  type Week,
  type WeekDetail,
} from './learn';
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
};

/** The fixture's answer for a week, known without a round trip. */
function fixtureWeek(weekNumber: number): WeekState {
  const week = DEMO_WEEKS.find((w) => w.weekNumber === weekNumber);
  if (!week) return { status: 'error', message: 'That week is not part of the programme.' };
  return {
    status: 'ready',
    detail: { week, cards: week.unlocked ? DEMO_LESSON_CARDS : [], completedOn: null },
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
  const today = todayIso();

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

  return { ...state, toggleChallenge };
}
