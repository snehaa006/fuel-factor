import { useCallback, useEffect, useState } from 'react';

import { DEMO_PROFILE } from './__fixtures__/today';
import { signOut } from './coach-auth';
import { messageOf } from './errors';
import { fetchProfile, type Profile } from './profile';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type ProfileState =
  | { status: 'loading' }
  /** No session at all: the gate. */
  | { status: 'signed-out' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string };

export type ProfileController = ProfileState & {
  reload: () => void;
  leave: () => Promise<void>;
  leaving: boolean;
};

export function useProfile(): ProfileController {
  const [state, setState] = useState<ProfileState>(() =>
    USE_FIXTURE ? { status: 'ready', profile: DEMO_PROFILE } : { status: 'loading' }
  );
  const [nonce, setNonce] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const reload = useCallback(() => {
    if (USE_FIXTURE) return;
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    fetchProfile()
      .then((profile) => {
        if (!active) return;
        setState(profile ? { status: 'ready', profile } : { status: 'signed-out' });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: messageOf(error) });
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  /**
   * Sign out.
   *
   * For a coach this is ordinary: the account is an email and a password and
   * signing back in restores the team. **For an athlete it is not** — identity
   * is the anonymous session, so signing out abandons the claim on their
   * participant row and there is no credential to get back in with. The
   * profile screen says that in words before it offers the button.
   */
  const leave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      if (!USE_FIXTURE) await signOut();
      setState({ status: 'signed-out' });
    } catch (error) {
      setState({ status: 'error', message: messageOf(error) });
    } finally {
      setLeaving(false);
    }
  }, [leaving]);

  return { ...state, reload, leave, leaving };
}
