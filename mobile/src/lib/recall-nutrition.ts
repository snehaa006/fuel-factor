import { asError } from './errors';
import { supabase } from './supabase';
import type { Enums, Tables } from './database.types';

/**
 * What the food database made of a recall day.
 *
 * The client half of the backend seam the dietitian asked for: "the calories is
 * estimated and calculated based on our composition data that we have ... This
 * will be backend. This is not manual calculation. It has to be through the
 * app, the average protein, fat."
 *
 * **Nothing is computed yet, and that is the honest state rather than a
 * shortcut.** Turning a recall's free text into grams needs the Jakarta
 * composition tables, and what this database holds is the Week 1 deck's
 * fifteen foods: a carbohydrate figure for seven of them and no protein or fat
 * figure for any. An average protein derived from that would be invented.
 *
 * So the screen says "not computed yet" and why, the way Today already says
 * "not scored yet" for the DQ score. When the tables arrive, the body of one
 * SQL function changes; this file, the table and the screens do not.
 */

export type MacroField = 'kcal' | 'carbs_g' | 'protein_g' | 'fat_g';

export type RecallNutrition = {
  method: Enums<'nutrition_method'>;
  kcal: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  /** Why a figure is missing, in the database's own words. */
  note: string | null;
};

/** The four figures the dietitian named, in the order she named them. */
export const MACROS: { field: MacroField; label: string; unit: string }[] = [
  { field: 'kcal', label: 'Calories', unit: 'kcal' },
  { field: 'carbs_g', label: 'Carbohydrate', unit: 'g' },
  { field: 'protein_g', label: 'Protein', unit: 'g' },
  { field: 'fat_g', label: 'Fat', unit: 'g' },
];

/** Whether anything at all has been worked out for this day. */
export function isComputed(nutrition: RecallNutrition | null): boolean {
  if (nutrition === null) return false;
  return (
    nutrition.method === 'food_database' &&
    MACROS.some(({ field }) => nutrition[field] !== null)
  );
}

/**
 * One figure, as it reads on screen.
 *
 * A missing figure says so in words. It is never a dash, a zero or a guess:
 * zero carbohydrate and unknown carbohydrate are different facts, and the
 * whole food database already carries that distinction in its nulls.
 */
export function macroText(value: number | null, unit: string): string {
  return value === null ? 'Not computed yet' : `${value} ${unit}`;
}

function toNutrition(row: Tables<'recall_nutrition'>): RecallNutrition {
  return {
    method: row.method,
    kcal: row.kcal,
    carbs_g: row.carbs_g,
    protein_g: row.protein_g,
    fat_g: row.fat_g,
    note: row.note,
  };
}

/**
 * Put a recall day through the food database.
 *
 * Called after a recall is saved. It is the backend's answer that lands on the
 * screen, never a figure this app worked out for itself.
 */
export async function computeNutrition(recallId: string): Promise<RecallNutrition> {
  const { data, error } = await supabase.rpc('compute_recall_nutrition', {
    p_recall_id: recallId,
  });
  if (error) throw asError(error);
  return toNutrition(data as Tables<'recall_nutrition'>);
}

/** What has already been worked out for these recall days, keyed on recall id. */
export async function fetchNutrition(
  recallIds: string[]
): Promise<Record<string, RecallNutrition>> {
  if (recallIds.length === 0) return {};

  const { data, error } = await supabase
    .from('recall_nutrition')
    .select('*')
    .in('recall_id', recallIds);

  if (error) throw asError(error);

  const byId: Record<string, RecallNutrition> = {};
  for (const row of data ?? []) {
    byId[row.recall_id] = toNutrition(row);
  }
  return byId;
}
