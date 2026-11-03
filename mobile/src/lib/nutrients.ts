import type { LoggedItem } from './today';

/**
 * Whether a logged item carries a nutrient, for the challenges and the rules.
 *
 * Pure and import-free at runtime: the advice engine uses it, and the engine
 * must not pull the Supabase client into its import graph (see the handoff on
 * the blank Today screen).
 *
 * A figure above zero counts. Where the deck gives no figure, a food from that
 * week's own table of sources counts, because the deck put it there. A zero
 * figure wins over the table, and a free-text item counts for nothing.
 */
export type Nutrient = 'carb' | 'protein';

export type NutrientItem = Pick<LoggedItem, 'carbs_g' | 'protein_g' | 'carbSource' | 'proteinSource'>;

export function hasNutrient(item: NutrientItem, nutrient: Nutrient): boolean {
  const figure = nutrient === 'carb' ? item.carbs_g : (item.protein_g ?? null);
  if (figure !== null) return figure > 0;
  return nutrient === 'carb' ? (item.carbSource ?? false) : (item.proteinSource ?? false);
}
