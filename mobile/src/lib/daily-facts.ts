import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { MASCOT_POSES, type MascotPose } from '@/components/mascot';

import { asError } from './errors';
import type { ProgrammeState } from './programme';
import { supabase } from './supabase';
import { dayOfWeek, weekOfProgramme } from './weekly';

/**
 * The fact of the day: the week's lesson, a part a day.
 *
 * Seven facts per programme week in `daily_facts`, one for each day, in the
 * order the week's lesson runs (seed 0019), so by day 7 the whole lesson has
 * come past in seven short pieces. Shown only while the four weeks run: before
 * day one and after day 28 there is no fact of the day.
 */

export type DailyFact = {
  week: number;
  day: number;
  fact: string;
  /** The Bahasa, or null where there is none yet. */
  factId: string | null;
  /** The lesson card it comes from. */
  topic: string;
  /** The fact's picture, and its one number or word, drawn big. */
  emoji: string | null;
  headline: string | null;
  headlineId: string | null;
  /** Which of the board's poses stands beside it. */
  pose: MascotPose;
};

/** Which week and day of the week today is, while the four weeks run. */
export function factPlace(programme: ProgrammeState | null): { week: number; day: number } | null {
  const week = weekOfProgramme(programme);
  const day = dayOfWeek(programme);
  if (week === null || day === null || week < 1 || week > 4) return null;
  return { week, day };
}

export async function fetchWeekFacts(week: number): Promise<DailyFact[]> {
  const { data, error } = await supabase
    .from('daily_facts')
    .select('week_number, day, fact, fact_id, topic, emoji, headline, headline_id, pose')
    .eq('week_number', week)
    .order('day');
  if (error) throw asError(error);
  return (data ?? []).map((r) => ({
    week: r.week_number,
    day: r.day,
    fact: r.fact,
    factId: r.fact_id,
    topic: r.topic,
    emoji: r.emoji,
    headline: r.headline,
    headlineId: r.headline_id,
    pose: (MASCOT_POSES as readonly string[]).includes(r.pose ?? '') ? (r.pose as MascotPose) : 'learn',
  }));
}

export type DailyFactState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; fact: DailyFact }
  | { status: 'error' };

/** Today's fact, or 'none' outside the four weeks or when the week has none. */
export function useDailyFact(programme: ProgrammeState | null): DailyFactState {
  const place = factPlace(programme);
  const week = place?.week ?? null;
  const day = place?.day ?? null;
  const [loaded, setLoaded] = useState<{ week: number; facts: DailyFact[] } | 'error' | null>(null);

  useEffect(() => {
    if (week === null) return;
    let active = true;
    fetchWeekFacts(week)
      .then((facts) => active && setLoaded({ week, facts }))
      .catch(() => active && setLoaded('error'));
    return () => {
      active = false;
    };
  }, [week]);

  if (week === null || day === null) return { status: 'none' };
  if (loaded === 'error') return { status: 'error' };
  if (loaded === null || loaded.week !== week) return { status: 'loading' };
  const fact = loaded.facts.find((f) => f.day === day);
  return fact ? { status: 'ready', fact } : { status: 'none' };
}

const SEEN_KEY = 'fuel-factor.fact-seen';

/**
 * Whether today's fact has been opened on this device, so the bulb can glow
 * until it has. Per device and per convenience only: losing it just means the
 * bulb glows once more.
 */
export function useFactSeen(id: string | null): [boolean, () => void] {
  const [seenId, setSeenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((value) => active && setSeenId(value))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const markSeen = () => {
    if (id === null) return;
    setSeenId(id);
    AsyncStorage.setItem(SEEN_KEY, id).catch(() => {});
  };
  return [id !== null && seenId === id, markSeen];
}
