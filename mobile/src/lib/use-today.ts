import { useCallback, useEffect, useState } from 'react';

import { demoToday, DEMO_RULES } from './__fixtures__/today';
import { messageOf } from './errors';
import { carbBand, type DayType } from './targets';
import { fetchToday, setDayType, todayIso, type TodayData } from './today';
import { supabase } from './supabase';
import type { AdviceRule } from './advice';

/**
 * Development flag. Draws the screen from the fixture instead of the network,
 * so the layout can be worked on without a session. Off unless the environment
 * sets it, and never on in a build that ships.
 */
const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type TodayState =
  | { status: 'loading' }
  | { status: 'ready'; data: TodayData; rules: AdviceRule[]; date: string }
  /** No session, or a session that has not claimed an athlete. Both mean the gate. */
  | { status: 'needs-onboarding' }
  | { status: 'error'; message: string };

export type TodayController = TodayState & {
  reload: () => void;
  changeDayType: (next: DayType) => void;
};

async function loadRules(): Promise<AdviceRule[]> {
  const { data, error } = await supabase
    .from('advice_rules')
    .select('code, domain, message_en, severity, reviewed_by')
    .eq('active', true);

  if (error) throw error;
  return data ?? [];
}

/** Today's row with a different day type, and every number it moves. */
function withDayType(data: TodayData, dayType: DayType): TodayData {
  return {
    ...data,
    summary: { ...data.summary, dayType, band: carbBand(data.weightKg, dayType) },
  };
}

export function useToday(): TodayController {
  const [state, setState] = useState<TodayState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  /**
   * Applied to the screen first and written after, so the ring answers the tap
   * rather than the round trip. A refused write puts the old value back, which
   * matters because the band must never show something the day is not recorded
   * as. There is nothing to write to in fixture mode, so nothing is attempted.
   */
  const changeDayType = useCallback((next: DayType) => {
    setState((current) => {
      if (current.status !== 'ready' || current.data.summary.dayType === next) return current;

      const previous = current.data.summary.dayType;
      if (!USE_FIXTURE) {
        setDayType(current.data.participantId, current.date, next).catch(() => {
          setState((latest) =>
            latest.status === 'ready' && previous !== null
              ? { ...latest, data: withDayType(latest.data, previous) }
              : latest
          );
        });
      }
      return { ...current, data: withDayType(current.data, next) };
    });
  }, []);

  useEffect(() => {
    let active = true;
    const date = todayIso();

    async function load() {
      if (USE_FIXTURE) {
        if (active) {
          setState({ status: 'ready', data: demoToday(date), rules: DEMO_RULES, date });
        }
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (active) setState({ status: 'needs-onboarding' });
          return;
        }

        // fetchToday reads whichever participant row RLS lets this session see,
        // so no row means no athlete has been claimed on this device yet.
        const [data, rules] = await Promise.all([fetchToday(date), loadRules()]);
        if (!active) return;
        setState(data ? { status: 'ready', data, rules, date } : { status: 'needs-onboarding' });
      } catch (error) {
        if (active) {
          setState({ status: 'error', message: messageOf(error) });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [nonce]);

  return { ...state, reload, changeDayType };
}
