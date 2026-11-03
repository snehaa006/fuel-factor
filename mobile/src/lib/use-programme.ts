import { useCallback, useEffect, useState } from 'react';

import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { programmeState, type ProgrammeState } from './programme';
import { todayIso } from './today';

export type ProgrammeStatus =
  | { status: 'loading' }
  /** No claimed athlete: the gate, same as Today. */
  | { status: 'needs-onboarding' }
  | {
      status: 'ready';
      programme: ProgrammeState;
      /** The athlete's own name and squad, for the screen that waits. */
      name: string;
      teamName: string | null;
    }
  | { status: 'error'; message: string };

/**
 * Whether this athlete's programme has started.
 *
 * Derived from the team's date and today's, never stored.
 */
export function useProgramme(): ProgrammeStatus & { reload: () => void } {
  const [state, setState] = useState<ProgrammeStatus>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile = await fetchProfile();
        if (!active) return;
        if (profile === null || profile.kind !== 'athlete') {
          setState({ status: 'needs-onboarding' });
          return;
        }
        setState({
          status: 'ready',
          programme: programmeState(profile.programmeStartsOn, todayIso()),
          name: profile.name,
          teamName: profile.teamName,
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
