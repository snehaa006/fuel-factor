import { useEffect, useState } from 'react';

import { messageOf } from './errors';
import { fetchGaps, type GapAnalysis } from './gaps';
import { todayIso } from './today';

/**
 * How far back the gap analysis looks.
 *
 * A fortnight. Long enough that a shape is visible rather than a run of good
 * or bad luck, short enough that it is still about how the athlete is eating
 * now -- and it fits across a phone as fourteen bars without them becoming
 * hairlines. The progress screen uses the whole programme (28 days) because
 * its job is baseline against now; this one's job is the current habit.
 */
export const GAP_WINDOW_DAYS = 14;

export type GapsState =
  | { status: 'loading' }
  | { status: 'ready'; analysis: GapAnalysis }
  /** Signed in, but no athlete claimed: the gate owns this, not this screen. */
  | { status: 'needs-onboarding' }
  | { status: 'error'; message: string };

/** The window's first day, counting back from and including `today`. */
export function windowFrom(today: string, days = GAP_WINDOW_DAYS): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * The signed-in athlete's gap analysis, as of today.
 *
 * Today is the time machine's today when one is set, so the screen looks on
 * any simulated date the way it would really have looked on that date -- which
 * is also how a fortnight of logs gets onto it for a demo without waiting a
 * fortnight.
 */
export function useGaps(): GapsState {
  const [state, setState] = useState<GapsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    const today = todayIso();
    fetchGaps(windowFrom(today), today)
      .then((analysis) => {
        if (!active) return;
        setState(
          analysis === null ? { status: 'needs-onboarding' } : { status: 'ready', analysis }
        );
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: messageOf(error) });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
