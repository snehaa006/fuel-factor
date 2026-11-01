import { asError } from './errors';
import { supabase } from './supabase';
import type { Enums, Tables, TablesInsert } from './database.types';

/**
 * The 24-hour recall, filled in the app.
 *
 * Every field here is a column of the RECALL sheet and the form carries all of
 * them bar one, which is the same discipline the evening check-in follows for
 * the DAILY LOG sheet.
 *
 * **`est_calories` is deliberately not asked.** The sheet holds hand-typed
 * estimates in that column and replacing them with computed figures is the
 * single highest-value thing this app does for the research: "the calories is
 * estimated and calculated based on our composition data that we have ... This
 * will be backend. This is not manual calculation." So the athlete types what
 * they ate and nothing else; the figures land in `recall_nutrition`, which is
 * app tier.
 *
 * The meals are free text on purpose. That is how the tracker records them —
 * "day one, he said, I haven't had my breakfast. And with chicken, I've had
 * 200 grams on day one" — and turning that text into grams is the food
 * database's job, not the form's.
 */

export type MealField = 'breakfast' | 'lunch' | 'dinner';
export type RecallRatingField = 'energy' | 'recovery';

/** The three meals the sheet records, in its order. */
export const RECALL_MEALS: { field: MealField; label: string; hint: string }[] = [
  {
    field: 'breakfast',
    label: 'Breakfast',
    hint: 'What you had, and roughly how much. If you skipped it, say so.',
  },
  { field: 'lunch', label: 'Lunch', hint: 'What you had, and roughly how much.' },
  { field: 'dinner', label: 'Dinner', hint: 'What you had, and roughly how much.' },
];

/** The sheet's two 1-10 self-ratings for a recall day. The daily log has five. */
export const RECALL_RATINGS: { field: RecallRatingField; label: string }[] = [
  { field: 'energy', label: 'Energy' },
  { field: 'recovery', label: 'Recovery' },
];

/** The column bounds, straight from the migration's check constraints. */
export const RECALL_LIMITS = {
  sleep_hours: { min: 0, max: 24 },
  fluid_ml: { min: 0, max: 15000 },
  rating: { min: 1, max: 10 },
  urine: { min: 1, max: 8 },
} as const;

export type RecallEntry = {
  recall_date: string | null;
  day_type: Enums<'day_type'> | null;
  sleep_hours: number | null;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  activities: string | null;
  supplements: string | null;
  fluid_ml: number | null;
  energy: number | null;
  recovery: number | null;
  urine_colour: number | null;
  notes: string | null;
};

export const EMPTY_RECALL: RecallEntry = {
  recall_date: null,
  day_type: null,
  sleep_hours: null,
  breakfast: null,
  lunch: null,
  dinner: null,
  activities: null,
  supplements: null,
  fluid_ml: null,
  energy: null,
  recovery: null,
  urine_colour: null,
  notes: null,
};

/** A blank field stays null. Not answered is not the same as none. */
export function parseSleepHours(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value * 10) / 10, RECALL_LIMITS.sleep_hours.max);
}

export function parseFluid(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(
    Math.min(Math.max(value, RECALL_LIMITS.fluid_ml.min), RECALL_LIMITS.fluid_ml.max)
  );
}

/** Text in, trimmed, or null when there was nothing in it. */
export function parseText(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Whether a recall day has been answered at all.
 *
 * An empty recall is not saved: it would write a row of nulls into a research
 * table and count as one of the programme's three days for doing nothing.
 */
export function hasAnyAnswer(entry: RecallEntry): boolean {
  return Object.values(entry).some((v) => v !== null && v !== undefined && v !== '');
}

/**
 * At least one meal says something.
 *
 * This is what makes a recall day usable: the whole instrument is the food,
 * and a day holding only a urine reading cannot be put through the food
 * database. Saving it is still allowed — it is what the baseline already holds
 * for all three athletes — but the screen says what is missing.
 */
export function hasAnyMeal(entry: RecallEntry): boolean {
  return RECALL_MEALS.some(({ field }) => (entry[field] ?? '') !== '');
}

export type RecallDay = {
  id: string;
  dayNumber: number;
  recallDate: string | null;
  /** Whether any meal text is on the row, which is what makes it computable. */
  hasMeals: boolean;
};

/** The recall days already on record for this athlete, oldest first. */
export async function fetchRecalls(participantId: string): Promise<RecallDay[]> {
  const { data, error } = await supabase
    .from('recalls')
    .select('id, day_number, recall_date, breakfast, lunch, dinner')
    .eq('participant_id', participantId)
    .order('day_number');

  if (error) throw asError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    dayNumber: row.day_number,
    recallDate: row.recall_date,
    hasMeals: Boolean(row.breakfast || row.lunch || row.dinner),
  }));
}

/** One recall day, for editing an answer already given. */
export async function fetchRecall(
  participantId: string,
  dayNumber: number
): Promise<{ id: string; entry: RecallEntry } | null> {
  const { data, error } = await supabase
    .from('recalls')
    .select('*')
    .eq('participant_id', participantId)
    .eq('day_number', dayNumber)
    .maybeSingle();

  if (error) throw asError(error);
  if (!data) return null;

  const row = data as Tables<'recalls'>;
  return {
    id: row.id,
    entry: {
      recall_date: row.recall_date,
      day_type: row.day_type,
      sleep_hours: row.sleep_hours,
      breakfast: row.breakfast,
      lunch: row.lunch,
      dinner: row.dinner,
      activities: row.activities,
      supplements: row.supplements,
      fluid_ml: row.fluid_ml,
      energy: row.energy,
      recovery: row.recovery,
      urine_colour: row.urine_colour,
      notes: row.notes,
    },
  };
}

/**
 * Save one recall day, and return its row id.
 *
 * Upserted on the sheet's own key, so re-opening day 2 edits day 2 rather than
 * adding a second one. `est_calories` is never written: see the note at the
 * top of this file.
 */
export async function saveRecall(
  participantId: string,
  dayNumber: number,
  entry: RecallEntry
): Promise<string> {
  const row: TablesInsert<'recalls'> = {
    participant_id: participantId,
    day_number: dayNumber,
    ...entry,
  };

  const { data, error } = await supabase
    .from('recalls')
    .upsert(row, { onConflict: 'participant_id,day_number' })
    .select('id')
    .single();

  if (error) throw asError(error);
  return data.id;
}
