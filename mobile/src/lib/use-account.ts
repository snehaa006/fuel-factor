import { useCallback, useEffect, useState } from 'react';

import { resolveAccount, type Account } from './account';
import { messageOf } from './errors';

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
  const [state, setState] = useState<AccountState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
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
