import { asError } from './errors';
import { supabase } from './supabase';
import type { Tables, TablesUpdate } from './database.types';

/**
 * The evening check-in.
 *
 * Every field here is a column of the DAILY LOG sheet, and the form carries
 * all of them — they are the research instrument, and two of them (fluid and
 * the five self-ratings) have never been collected for any athlete on any day.
 *
 * Sleep hours and supplements are deliberately absent. The brief lists them
 * with this screen, but they are RECALL columns, not DAILY LOG ones, and
 * recalls are filled by the research team rather than through the app. Putting
 * them here would mean adding columns to a research table, which goes into the
 * programme's workbook first and here second.
 */

export type CounterField = 'fruit_servings' | 'veg_servings' | 'protein_sources' | 'carb_portions';
export type RatingField = 'energy_am' | 'energy_training' | 'recovery' | 'mood' | 'concentration';

/**
 * The four serving counters.
 *
 * They count and record. They do not grade, and there is no target beside any
 * of them, because the programme has set none. A tick, a colour or a "goal
 * met" here would be a nutrition judgement the app is not entitled to make.
 */
export const COUNTERS: { field: CounterField; label: string }[] = [
  { field: 'fruit_servings', label: 'Fruit' },
  { field: 'veg_servings', label: 'Vegetables' },
  { field: 'protein_sources', label: 'Protein sources' },
  { field: 'carb_portions', label: 'Carb portions' },
];

/** The sheet's five 1-10 self-ratings, in its order. */
export const RATINGS: { field: RatingField; label: string }[] = [
  { field: 'energy_am', label: 'Morning energy' },
  { field: 'energy_training', label: 'Training energy' },
  { field: 'recovery', label: 'Recovery' },
  { field: 'mood', label: 'Mood' },
  { field: 'concentration', label: 'Concentration' },
];

/**
 * What the tracker's own scale says about a urine reading.
 *
 * Only the levels the programme has actually worded are here. The rest are
 * absent rather than guessed: this is a measuring instrument, and inventing a
 * description for level 7 would be inventing the instrument.
 *
 * The eight swatch colours are not here at all for the same reason, and a
 * colour matters more than a word — matching against an approximated swatch
 * produces a wrong reading, not a vague one.
 */
export const URINE_WORDING: Partial<Record<number, string>> = {
  3: 'Fine',
  4: 'Drink more today',
  5: 'Drink more today',
  6: 'Dehydrated — drink immediately',
};

export const URINE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** The column bounds, straight from the migration's check constraints. */
export const LIMITS = {
  counter: { min: 0, max: 20 },
  rating: { min: 1, max: 10 },
  urine: { min: 1, max: 8 },
  fluid_ml: { min: 0, max: 15000 },
} as const;

export type CheckIn = Partial<
  Pick<Tables<'daily_logs'>, CounterField | RatingField | 'fluid_ml' | 'urine_colour' | 'notes'>
>;

/** A field left blank stays null: not answered is not the same as zero. */
export function parseFluid(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(Math.min(Math.max(value, LIMITS.fluid_ml.min), LIMITS.fluid_ml.max));
}

/** Keep a counter inside the column's own constraint. */
export function clampCounter(value: number): number {
  return Math.min(Math.max(Math.round(value), LIMITS.counter.min), LIMITS.counter.max);
}

/**
 * Whether anything has been answered.
 *
 * An empty check-in is not submitted: it would write a row of nulls over
 * whatever is already there and count towards the streak for doing nothing.
 */
export function hasAnyAnswer(checkIn: CheckIn): boolean {
  return Object.values(checkIn).some((v) => v !== null && v !== undefined && v !== '');
}

/**
 * Save the check-in onto today's row.
 *
 * dq_score is never written. The sheet names the column and states no formula,
 * so it stays null until the dietitian defines one.
 */
export async function saveCheckIn(dailyLogId: string, checkIn: CheckIn): Promise<void> {
  const update: TablesUpdate<'daily_logs'> = { ...checkIn };
  const { error } = await supabase.from('daily_logs').update(update).eq('id', dailyLogId);
  if (error) throw asError(error);
}
