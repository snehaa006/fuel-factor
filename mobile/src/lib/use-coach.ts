import { useCallback, useEffect, useState } from 'react';

import { DEMO_COACH_VIEW } from './__fixtures__/today';
import { claimCoach, fetchCoachView, isCoach, type CoachView } from './coach';
import { messageOf } from './errors';
import { sinceDate } from './use-progress';
import { todayIso } from './today';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

/** The dashboard's window. A fortnight is enough to see a habit or its absence. */
export const COACH_WINDOW_DAYS = 14;

export type CoachState =
  | { status: 'loading' }
  /** Signed in but not a coach of anything: the code gate. */
  | { status: 'needs-code' }
  | { status: 'ready'; view: CoachView }
  | { status: 'error'; message: string };

export type CoachController = CoachState & {
  /** Join with a coach code. A no-op in fixture mode, which is already in. */
  join: (code: string) => void;
  joining: boolean;
  joinError: string | null;
};

export function useCoach(): CoachController {
  const [state, setState] = useState<CoachState>(() =>
    USE_FIXTURE ? { status: 'ready', view: DEMO_COACH_VIEW } : { status: 'loading' }
  );
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    if (USE_FIXTURE) return;

    const today = todayIso();

    isCoach()
      .then((coach) => {
        if (!active) return null;
        if (!coach) {
          setState({ status: 'needs-code' });
          return null;
        }
        return fetchCoachView(today, sinceDate(today, COACH_WINDOW_DAYS), COACH_WINDOW_DAYS);
      })
      .then((view) => {
        if (active && view) setState({ status: 'ready', view });
      })
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, [nonce]);

  /**
   * Join, then reload rather than guessing at the view.
   *
   * The rows a coach can see change the moment the membership row exists, so
   * re-reading is both simpler and more honest than assembling a dashboard
   * from what the client happened to know beforehand.
   */
  const join = useCallback((code: string) => {
    if (USE_FIXTURE || joining) return;
    setJoining(true);
    setJoinError(null);

    claimCoach(code)
      .then(() => {
        setState({ status: 'loading' });
        setNonce((n) => n + 1);
      })
      .catch((error) => setJoinError(messageOf(error)))
      .finally(() => setJoining(false));
  }, [joining]);

  return { ...state, join, joining, joinError };
}
