import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { asError, messageOf } from './errors';
import { supabase } from './supabase';
import type { IsoDate } from './streak';
import type { Tables, TablesInsert } from './database.types';

/**
 * The Sunday check-in: the WEEKLY LOG tab, answered in the app.
 *
 * Theo asked for "a check-in to ensure that they actually learn" before the
 * next week; Sofia answered it on the same call -- "use those questions" --
 * pointing at the tracker's WEEKLY LOG tab, which Theo had been filling from
 * WhatsApp replies every Sunday. This is that check-in. Five questions, the
 * tab's own columns, saved to `weekly_logs`, which mirrors the tab column for
 * column (see `20261127000001_weekly_logs.sql`).
 *
 * The four fixed questions are worded as Theo sent them (the week 3 message);
 * the fifth is the week's own, a row in `checkin_questions`.
 *
 * The averages are offered from the athlete's own daily logs for that week
 * when there are any, as a starting point they can change: the tab asks what
 * the athlete reports, and the log is what they already reported.
 */

export type Kind = 'choice' | 'number' | 'text';

export type CheckinQuestion = {
  week: number;
  question: string;
  kind: Kind;
  options: string[] | null;
  /** 'draft' when the app proposed the wording and the dietitian has not seen it. */
  draft: boolean;
};

/** The tab's Breakfast Compliance answers, in the order the message lists them. */
export const BREAKFAST_OPTIONS = ['Every day', 'Most days', 'Some days', 'Skipped'] as const;

export const RANGES = {
  energy: { min: 1, max: 10 },
  urine: { min: 1, max: 8 },
  fluid: { min: 0, max: 15000 },
} as const;

/** What the form holds. Null is unanswered, never zero. */
export type WeeklyAnswers = {
  energy: number | null;
  urine: number | null;
  fluidMl: number | null;
  breakfast: string | null;
  behaviour: string | null;
  notes: string | null;
};

export const EMPTY_ANSWERS: WeeklyAnswers = {
  energy: null,
  urine: null,
  fluidMl: null,
  breakfast: null,
  behaviour: null,
  notes: null,
};

export type WeeklyLog = Tables<'weekly_logs'>;

// ---------------------------------------------------------------------------
// Pure

type DayRow = Pick<Tables<'daily_logs'>, 'energy_training' | 'urine_colour' | 'fluid_ml' | 'breakfast'>;

/** What the week's daily logs already say, or null where they say nothing. */
export type FromLogs = {
  energy: number | null;
  urine: number | null;
  fluidMl: number | null;
  /** Days with breakfast logged, of the days logged at all. */
  breakfastDays: number;
  daysLogged: number;
};

function mean(values: (number | null)[]): number | null {
  const real = values.filter((v): v is number => v !== null);
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

export function fromLogs(rows: DayRow[]): FromLogs {
  const energy = mean(rows.map((r) => r.energy_training));
  const urine = mean(rows.map((r) => r.urine_colour));
  const fluid = mean(rows.map((r) => r.fluid_ml));
  return {
    // Whole numbers, because the scales the athlete taps are whole numbers.
    energy: energy === null ? null : Math.round(energy),
    urine: urine === null ? null : Math.round(urine),
    fluidMl: fluid === null ? null : Math.round(fluid / 10) * 10,
    breakfastDays: rows.filter((r) => r.breakfast).length,
    daysLogged: rows.length,
  };
}

/**
 * The form's starting point: an earlier answer for the week if there is one,
 * otherwise the week's logs, otherwise blank. Breakfast is never pre-picked:
 * where "most days" ends and "some days" begins is the athlete's to say.
 */
export function startingAnswers(existing: WeeklyLog | null, logs: FromLogs | null): WeeklyAnswers {
  if (existing) {
    return {
      energy: existing.avg_training_energy === null ? null : Number(existing.avg_training_energy),
      urine: existing.avg_urine_colour === null ? null : Number(existing.avg_urine_colour),
      fluidMl: existing.avg_fluid_ml,
      breakfast: existing.breakfast_compliance,
      behaviour: existing.week_behaviour_check,
      notes: existing.notes,
    };
  }
  return {
    ...EMPTY_ANSWERS,
    energy: logs?.energy ?? null,
    urine: logs?.urine ?? null,
    fluidMl: logs?.fluidMl ?? null,
  };
}

/** "2,000" or "2000" -> 2000. Blank is null; anything else is null too. */
export function parseMl(text: string): number | null {
  const cleaned = text.replace(/[.,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** What is still missing. The notes are optional; the rest is the tab's row. */
export function missing(answers: WeeklyAnswers): (keyof WeeklyAnswers)[] {
  const out: (keyof WeeklyAnswers)[] = [];
  if (answers.energy === null) out.push('energy');
  if (answers.urine === null) out.push('urine');
  if (answers.fluidMl === null || answers.fluidMl > RANGES.fluid.max) out.push('fluidMl');
  if (answers.breakfast === null) out.push('breakfast');
  if (answers.behaviour === null || answers.behaviour.trim() === '') out.push('behaviour');
  return out;
}

/** The tab's row, from the form. `answer` stays empty, as it is in the tab. */
export function toRow(
  participantId: string,
  week: number,
  theme: string | null,
  answers: WeeklyAnswers
): TablesInsert<'weekly_logs'> {
  const notes = answers.notes?.trim() ?? '';
  return {
    week,
    theme,
    participant_id: participantId,
    avg_training_energy: answers.energy,
    avg_urine_colour: answers.urine,
    avg_fluid_ml: answers.fluidMl,
    breakfast_compliance: answers.breakfast,
    week_behaviour_check: answers.behaviour?.trim() ?? null,
    notes: notes === '' ? null : notes,
  };
}

// ---------------------------------------------------------------------------
// Database

export async function fetchQuestion(week: number): Promise<CheckinQuestion | null> {
  const { data, error } = await supabase
    .from('checkin_questions')
    .select('week_number, question, kind, options, source')
    .eq('week_number', week)
    .maybeSingle();
  if (error) throw asError(error);
  if (!data) return null;
  const kind: Kind = data.kind === 'choice' || data.kind === 'number' ? data.kind : 'text';
  return {
    week: data.week_number,
    question: data.question,
    kind,
    options: data.options,
    draft: data.source === 'draft',
  };
}

export async function fetchWeeklyLog(participantId: string, week: number): Promise<WeeklyLog | null> {
  const { data, error } = await supabase
    .from('weekly_logs')
    .select('*')
    .eq('participant_id', participantId)
    .eq('week', week)
    .maybeSingle();
  if (error) throw asError(error);
  return data;
}

/** Which weeks this athlete has checked in for. */
export async function fetchCheckedWeeks(participantId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('weekly_logs')
    .select('week')
    .eq('participant_id', participantId);
  if (error) throw asError(error);
  return (data ?? []).map((r) => r.week);
}

/** The athlete's daily logs for one programme week, for the starting answers. */
export async function fetchWeekLogs(participantId: string, from: IsoDate, to: IsoDate): Promise<FromLogs> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('energy_training, urine_colour, fluid_ml, breakfast')
    .eq('participant_id', participantId)
    .gte('log_date', from)
    .lte('log_date', to);
  if (error) throw asError(error);
  return fromLogs(data ?? []);
}

export async function saveWeeklyLog(row: TablesInsert<'weekly_logs'>): Promise<void> {
  const { error } = await supabase
    .from('weekly_logs')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'participant_id,week' });
  if (error) throw asError(error);
  changed();
}

// ---------------------------------------------------------------------------
// Hooks

const listeners = new Set<() => void>();
let version = 0;

/** Tell whoever shows check-in status that a check-in was just saved. */
function changed() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readVersion = () => version;

export type CheckedState = { status: 'loading' } | { status: 'ready'; weeks: number[] };

/** The weeks this athlete has checked in for, refreshed the moment one is saved. */
export function useCheckedWeeks(participantId: string | null): CheckedState {
  const v = useSyncExternalStore(subscribe, readVersion, readVersion);
  const [state, setState] = useState<CheckedState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    if (participantId === null) return;
    fetchCheckedWeeks(participantId)
      .then((weeks) => active && setState({ status: 'ready', weeks }))
      // No table yet (the migration not applied) reads as nothing checked in.
      .catch(() => active && setState({ status: 'ready', weeks: [] }));
    return () => {
      active = false;
    };
  }, [participantId, v]);

  // Nobody to look up: nothing checked in, without a round trip.
  return participantId === null ? { status: 'ready', weeks: [] } : state;
}

export type CheckinState =
  | { status: 'loading' }
  | {
      status: 'ready';
      question: CheckinQuestion | null;
      existing: WeeklyLog | null;
      logs: FromLogs | null;
    }
  | { status: 'error'; message: string };

/** Everything the check-in screen needs for one week. */
export function useWeeklyCheckin(
  participantId: string | null,
  week: number,
  range: { from: IsoDate; to: IsoDate } | null
): CheckinState & { save: (row: TablesInsert<'weekly_logs'>) => Promise<void> } {
  const [state, setState] = useState<CheckinState>({ status: 'loading' });
  const from = range?.from ?? null;
  const to = range?.to ?? null;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [question, existing, logs] = await Promise.all([
          fetchQuestion(week),
          participantId === null ? Promise.resolve(null) : fetchWeeklyLog(participantId, week),
          participantId === null || from === null || to === null
            ? Promise.resolve(null)
            : fetchWeekLogs(participantId, from, to),
        ]);
        if (active) setState({ status: 'ready', question, existing, logs });
      } catch (error) {
        if (active) setState({ status: 'error', message: messageOf(error) });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [participantId, week, from, to]);

  const save = useCallback((row: TablesInsert<'weekly_logs'>) => saveWeeklyLog(row), []);
  return { ...state, save };
}
