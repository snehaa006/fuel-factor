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
   * Ordinary on both sides now: the account is an email and a password, and
   * signing back in restores the team for a coach and the claim, the logs and
   * the streak for an athlete. It was not ordinary for an athlete while
   * identity was an anonymous session -- signing out abandoned the claim on
   * their participant row with no credential to get back in with, and the
   * profile screen said so in words before offering the button.
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
