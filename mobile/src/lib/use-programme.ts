import { useCallback, useEffect, useState } from 'react';

import { DEMO_PROFILE, demoProgrammeStart } from './__fixtures__/today';
import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { programmeState, type ProgrammeState } from './programme';
import { todayIso } from './today';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

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
 * Derived from the team's date and today's, never stored. The fixture is a
 * squad thirty days in, which is the state the demo is interesting in --
 * logging open and the follow-up recall due.
 */
export function useProgramme(): ProgrammeStatus & { reload: () => void } {
  const [state, setState] = useState<ProgrammeStatus>(() => {
    if (!USE_FIXTURE) return { status: 'loading' };
    const today = todayIso();
    return {
      status: 'ready',
      programme: programmeState(demoProgrammeStart(today), today),
      name: DEMO_PROFILE.name,
      teamName: DEMO_PROFILE.teamName,
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
