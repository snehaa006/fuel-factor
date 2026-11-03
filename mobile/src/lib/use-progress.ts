import { useEffect, useState } from 'react';

import { messageOf } from './errors';
import { fetchProfile } from './profile';
import { asOfDate, fetchProgress, type Progress } from './progress';
import { todayIso } from './today';

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

/**
 * Baseline against now, as of today -- the time machine's today when one is
 * set. Logs after it are not read and the post-programme tests stay hidden
 * until the four weeks are up, so the screen looks on any date the way it
 * would really have looked on that date.
 */
export function useProgress(): ProgressState {
  const [state, setState] = useState<ProgressState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    const today = todayIso();
    Promise.all([fetchProgress(sinceDate(today), today), fetchProfile()])
      .then(([progress, profile]) => {
        if (!active) return;
        const startsOn = profile?.kind === 'athlete' ? profile.programmeStartsOn : null;
        setState({ status: 'ready', progress: asOfDate(progress, startsOn, today) });
      })
      .catch((error) => active && setState({ status: 'error', message: messageOf(error) }));

    return () => {
      active = false;
    };
  }, []);

  return state;
}
