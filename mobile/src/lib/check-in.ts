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
 * The workbook's urine colour scale, all eight levels.
 *
 * Four of these used to be absent and the comment here said why: this is a
 * measuring instrument, and inventing a description for level 7 would be
 * inventing the instrument. The workbook's own URINE COLOUR SCALE (1-8) sheet
 * is now in hand, so none of it is invented — `colour` and `meaning` are its
 * two columns, transcribed.
 *
 * Two of the four levels that *were* here were approximations and are
 * corrected by the sheet: level 3 read 'Fine' and is "Acceptable — keep
 * drinking"; level 5 read 'Drink more today', which is level 4's wording, and
 * is "Mildly dehydrated — act now". That last one is the threshold
 * `DEHYDRATED_AT` in coach.ts flags on, and the sheet agrees with it.
 *
 * The eight swatch colours are still not here. A colour name is the sheet's
 * own text; an approximated hex is not, and matching against a wrong swatch
 * produces a wrong reading rather than a vague one. The athlete matches
 * against the printed chart and taps the number.
 */
export const URINE_SCALE: { level: number; colour: string; meaning: string }[] = [
  { level: 1, colour: 'Very pale yellow', meaning: 'Well hydrated — great' },
  { level: 2, colour: 'Pale yellow', meaning: 'Hydrated — keep going' },
  { level: 3, colour: 'Yellow', meaning: 'Acceptable — keep drinking' },
  { level: 4, colour: 'Medium yellow', meaning: 'Drink more today' },
  { level: 5, colour: 'Dark yellow', meaning: 'Mildly dehydrated — act now' },
  { level: 6, colour: 'Amber', meaning: 'Dehydrated — drink immediately' },
  { level: 7, colour: 'Orange', meaning: 'Significantly dehydrated — flag this' },
  { level: 8, colour: 'Dark brown', meaning: 'Severely dehydrated — seek help' },
];

/** What the scale says about a reading, keyed by level. Derived, never typed twice. */
export const URINE_WORDING: Partial<Record<number, string>> = Object.fromEntries(
  URINE_SCALE.map(({ level, meaning }) => [level, meaning])
);

export const URINE_LEVELS = URINE_SCALE.map(({ level }) => level);

/**
 * The workbook's 1-10 rating scale, in the four bands it is written in.
 *
 * The same story as the urine scale: `RatingScale` showed the ends and no
 * adjective because the anchor text was not in this repository, and the
 * sheet's RATING SCALE (1-10) block now is. The bands are the sheet's own —
 * 1-3, 4-6, 7-8, 9-10 — and not an even split, which is why they are listed
 * rather than computed.
 *
 * These apply to every 1-10 rating the programme collects: the daily log's
 * five and the recall's two. The sheet states one scale, not seven.
 */
export const RATING_BANDS: { from: number; to: number; meaning: string }[] = [
  { from: 1, to: 3, meaning: 'Exhausted / No focus / Barely functional' },
  { from: 4, to: 6, meaning: 'Average. Got through it. Normal for hard training week.' },
  { from: 7, to: 8, meaning: 'Good. Solid session. This is the daily goal.' },
  { from: 9, to: 10, meaning: 'Excellent. Everything clicked. Note what you ate and replicate it.' },
];

/** The band a rating falls in, or null when there is no rating. */
export function ratingBand(value: number | null): (typeof RATING_BANDS)[number] | null {
  if (value === null) return null;
  return RATING_BANDS.find((band) => value >= band.from && value <= band.to) ?? null;
}

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
