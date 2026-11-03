import { useEffect, useState } from 'react';

import {
  challengeWeek,
  CHALLENGES,
  fetchChallengeLogs,
  programmeWeek,
  type ChallengeWeek,
} from './meal-challenge';
import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { todayIso } from './today';

export type MealChallengeState =
  | { status: 'loading' }
  | {
      status: 'ready';
      /** Which programme week today is in. Zero or less before day one. */
      programmeWeek: number;
      /** The checked challenge, or null when that week has none the log can answer. */
      week: ChallengeWeek | null;
      today: string;
    }
  /** No programme date, or nobody claimed: nothing to count weeks from. */
  | { status: 'none' }
  | { status: 'error'; message: string };

function build(
  logsFor: (week: number) => Promise<Awaited<ReturnType<typeof fetchChallengeLogs>>>,
  startsOn: string,
  today: string,
  weekNumber: number | undefined
) {
  const current = programmeWeek(startsOn, today);
  const spec = CHALLENGES[weekNumber ?? current];
  if (!spec) return Promise.resolve({ programmeWeek: current, week: null });
  return logsFor(spec.week).then((logs) => ({
    programmeWeek: current,
    week: challengeWeek(logs, startsOn, today, spec),
  }));
}

/**
 * A week's challenge for the signed-in athlete, as of today -- the time
 * machine's today when one is set.
 *
 * With no `weekNumber` it is the week today falls in, which is what Today
 * shows; Learn passes the week it is showing. `reloadKey` re-reads it, so
 * Today can refresh the card when the athlete comes back from logging.
 */
export function useMealChallenge(weekNumber?: number, reloadKey = 0): MealChallengeState {
  const [state, setState] = useState<MealChallengeState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const today = todayIso();

    async function load() {
      try {
        const profile = await fetchProfile();
        const startsOn = profile?.kind === 'athlete' ? profile.programmeStartsOn : null;
        if (startsOn === null) {
          if (active) setState({ status: 'none' });
          return;
        }
        const result = await build(
          (week) => fetchChallengeLogs(startsOn, today, week),
          startsOn,
          today,
          weekNumber
        );
        if (active) setState({ status: 'ready', ...result, today });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [weekNumber, reloadKey]);

  return state;
}
