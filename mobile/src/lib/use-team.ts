import { useEffect, useState } from 'react';

import { DEMO_BADGES, DEMO_LEADERBOARD, DEMO_MONTH_MVP } from './__fixtures__/today';
import { award, fetchBadges, fetchStats, type EarnedBadge } from './badges';
import { messageOf } from './errors';
import { fetchLeaderboard, fetchMvp, MONTH_DAYS, type Leaderboard } from './team';
import { todayIso } from './today';

/**
 * The same development flag the rest of the app uses. It matters here for the
 * usual reason -- the project still has anonymous sign-ins switched off, so
 * without a session the board cannot be looked at on a device at all.
 */
const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type TeamView = {
  week: Leaderboard;
  /** Who leads the last thirty days. Same rule as the week's: shared is shared. */
  monthMvp: string[];
  /** The athlete's own badges, earned and not. */
  badges: EarnedBadge[];
};

export type TeamState =
  | { status: 'loading' }
  | { status: 'ready'; view: TeamView }
  | { status: 'error'; message: string };

export function useTeam(): TeamState {
  // The fixture is known at first render, so it is the initial state rather
  // than something an effect sets afterwards, which would cost a render and a
  // flash of the spinner for data already in hand.
  const [state, setState] = useState<TeamState>(() =>
    USE_FIXTURE
      ? {
          status: 'ready',
          view: { week: DEMO_LEADERBOARD, monthMvp: DEMO_MONTH_MVP, badges: DEMO_BADGES },
        }
      : { status: 'loading' }
  );

  useEffect(() => {
    let active = true;
    if (USE_FIXTURE) return;

    const today = todayIso();

    // Four independent reads. The badges are the athlete's own rows and need
    // no function; only the two boards do.
    Promise.all([
      fetchLeaderboard(today),
      fetchMvp(today, MONTH_DAYS),
      fetchBadges(),
      fetchStats(today),
    ])
      .then(([week, monthMvp, badges, stats]) => {
        if (!active) return;
        setState({
          status: 'ready',
          view: { week, monthMvp, badges: award(badges, stats) },
        });
      })
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, []);

  return state;
}
