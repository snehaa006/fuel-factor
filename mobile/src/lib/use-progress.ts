import { useEffect, useState } from 'react';

import { DEMO_PROGRESS } from './__fixtures__/today';
import { messageOf } from './errors';
import { fetchProgress, type Progress } from './progress';
import { todayIso } from './today';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

/**
 * How far back "now" reaches.
 *
 * The programme runs four weeks, so the current figures are the programme so
 * far rather than a rolling window that would quietly drop week 1 once week 5
 * arrived.
 */
export const SINCE_DAYS = 28;

export type ProgressState =
  | { status: 'loading' }
  | { status: 'ready'; progress: Progress }
  | { status: 'error'; message: string };

/** The date `SINCE_DAYS` before today, as YYYY-MM-DD. */
export function sinceDate(today: string, days = SINCE_DAYS): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function useProgress(): ProgressState {
  const [state, setState] = useState<ProgressState>(() =>
    USE_FIXTURE ? { status: 'ready', progress: DEMO_PROGRESS } : { status: 'loading' }
  );

  useEffect(() => {
    let active = true;
    if (USE_FIXTURE) return;

    fetchProgress(sinceDate(todayIso()))
      .then((progress) => active && setState({ status: 'ready', progress }))
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, []);

  return state;
}
