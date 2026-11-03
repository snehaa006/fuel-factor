import { useEffect, useState } from 'react';

import { demoChallengeLogs, demoProgrammeStart } from './__fixtures__/today';
import {
  challengeWeek,
  fetchChallengeLogs,
  type ChallengeWeek,
} from './carb-challenge';
import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { todayIso } from './today';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type CarbChallengeState =
  | { status: 'loading' }
  | { status: 'ready'; week: ChallengeWeek; today: string }
  /** No programme date, or nobody claimed: nothing to check against. */
  | { status: 'none' }
  | { status: 'error'; message: string };

/**
 * Week 1's carb challenge for the signed-in athlete, as of today -- the time
 * machine's today when one is set. `reloadKey` re-reads it, so Today can
 * refresh the card when the athlete comes back from logging a meal.
 */
export function useCarbChallenge(reloadKey = 0): CarbChallengeState {
  const [state, setState] = useState<CarbChallengeState>(() => {
    if (!USE_FIXTURE) return { status: 'loading' };
    const today = todayIso();
    const startsOn = demoProgrammeStart();
    return {
      status: 'ready',
      week: challengeWeek(demoChallengeLogs(startsOn), startsOn, today),
      today,
    };
  });

  useEffect(() => {
    if (USE_FIXTURE) return;
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
        const logs = await fetchChallengeLogs(startsOn, today);
        if (active) setState({ status: 'ready', week: challengeWeek(logs, startsOn, today), today });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return state;
}
