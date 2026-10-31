import { useEffect, useState } from 'react';

import { DEMO_LEADERBOARD } from './__fixtures__/today';
import { messageOf } from './errors';
import { fetchLeaderboard, type Leaderboard } from './team';
import { todayIso } from './today';

/**
 * The same development flag the rest of the app uses. It matters here for the
 * usual reason -- the project still has anonymous sign-ins switched off, so
 * without a session the board cannot be looked at on a device at all.
 */
const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type TeamState =
  | { status: 'loading' }
  | { status: 'ready'; board: Leaderboard }
  | { status: 'error'; message: string };

export function useTeam(): TeamState {
  // The fixture is known at first render, so it is the initial state rather
  // than something an effect sets afterwards, which would cost a render and a
  // flash of the spinner for data already in hand.
  const [state, setState] = useState<TeamState>(() =>
    USE_FIXTURE ? { status: 'ready', board: DEMO_LEADERBOARD } : { status: 'loading' }
  );

  useEffect(() => {
    let active = true;
    if (USE_FIXTURE) return;

    fetchLeaderboard(todayIso())
      .then((board) => active && setState({ status: 'ready', board }))
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, []);

  return state;
}
