import { useCallback, useEffect, useState } from 'react';

import { resolveAccount, type Account } from './account';
import { messageOf } from './errors';

/**
 * Development flag, as everywhere else in this app. The fixture is an athlete
 * mid-programme, so a demo build goes straight to Today and never shows a
 * sign-in it could not complete.
 */
const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

const DEMO_ACCOUNT: Account = {
  role: 'athlete',
  participantId: 'demo-participant',
  email: 'athlete@example.com',
};

export type AccountState =
  | { status: 'loading' }
  | { status: 'ready'; account: Account }
  | { status: 'error'; message: string };

export type AccountController = AccountState & {
  /** Re-ask after signing in, signing out or claiming an athlete. */
  reload: () => void;
};

/** Who is signed in, for the screens that route on it. */
export function useAccount(): AccountController {
  const [state, setState] = useState<AccountState>(() =>
    USE_FIXTURE ? { status: 'ready', account: DEMO_ACCOUNT } : { status: 'loading' }
  );
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    if (USE_FIXTURE) return;
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    resolveAccount()
      .then((account) => {
        if (active) setState({ status: 'ready', account });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: messageOf(error) });
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  return { ...state, reload };
}
