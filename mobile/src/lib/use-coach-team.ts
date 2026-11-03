import { useCallback, useEffect, useState } from 'react';

import {
  createTeam,
  currentEmail,
  isAnonymousSession,
  myTeam,
  setProgrammeStart,
  type CoachTeam,
} from './coach-auth';
import { messageOf } from './errors';

export type CoachTeamState =
  | { status: 'loading' }
  /** No account, or an anonymous one. A team needs an email behind it. */
  | { status: 'needs-account' }
  /** Signed in with an account, but no team made yet. */
  | { status: 'no-team'; email: string | null }
  | { status: 'ready'; email: string | null; team: CoachTeam }
  | { status: 'error'; message: string };

export type CoachTeamController = CoachTeamState & {
  reload: () => void;
  create: (name: string, startsOn: string) => Promise<void>;
  setStart: (startsOn: string) => Promise<void>;
  busy: boolean;
  actionError: string | null;
};

/**
 * The coach's own team.
 *
 * `needs-account` covers both no session and an anonymous one, because the
 * database refuses to create a team from an anonymous session and a screen
 * that let a coach try anyway would walk them into that refusal.
 */
export function useCoachTeam(): CoachTeamController {
  const [state, setState] = useState<CoachTeamState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [email, anonymous] = await Promise.all([currentEmail(), isAnonymousSession()]);
        if (!active) return;
        if (email === null || anonymous) {
          setState({ status: 'needs-account' });
          return;
        }

        const team = await myTeam();
        if (!active) return;
        setState(team ? { status: 'ready', email, team } : { status: 'no-team', email });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [nonce]);

  const create = useCallback(
    async (name: string, startsOn: string) => {
      if (busy) return;
      setBusy(true);
      setActionError(null);
      try {
        const team = await createTeam(name, startsOn);
        const email = await currentEmail();
        setState({ status: 'ready', email, team });
      } catch (error) {
        setActionError(messageOf(error));
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  const setStart = useCallback(
    async (startsOn: string) => {
      if (busy) return;
      setBusy(true);
      setActionError(null);
      try {
        await setProgrammeStart(startsOn);
        setState((current) =>
          current.status === 'ready'
            ? { ...current, team: { ...current.team, programmeStartsOn: startsOn } }
            : current
        );
      } catch (error) {
        setActionError(messageOf(error));
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  return { ...state, reload, create, setStart, busy, actionError };
}
