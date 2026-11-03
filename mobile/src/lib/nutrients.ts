import type { LoggedItem } from './today';

/**
 * Whether a logged item is a carb source or a protein source, for the
 * challenges and the advice rules.
 *
 * Pure and import-free at runtime: the advice engine uses it, and the engine
 * must not pull the Supabase client into its import graph (see the handoff on
 * the blank Today screen).
 *
 * **It is decided by what the food is, not by whether its figure is above
 * zero.** With the Indonesian composition table loaded, almost every food has
 * some carbohydrate and some protein -- nasi has 3 g of protein per 100 g --
 * so "has a figure" would let a plate of rice win the protein challenge. The
 * challenges ask for a *source*: "one protein source per meal", "add one
 * carb". So:
 *
 *   * A food from a deck's own table is that deck's source: everything in
 *     week 1's table is a carb source, week 2's protein table a protein source.
 *   * A food from the composition table is a source when its name's **first
 *     word** is one the decks name as a source. Indonesian food names put the
 *     food first -- "Telur Ayam", "Ikan Kembung", "Nasi Goreng" -- so the head
 *     word excludes "Daun Ubi Jalar" (sweet-potato leaves), "Jantung Pisang"
 *     (banana heart), "Kepala Susu (Krim)" (cream) and "Kacang Telur" (a peanut
 *     snack). It misses some dishes, "Gulai ikan" among them: it errs towards
 *     not crediting a meal rather than crediting one wrongly.
 *   * Free text counts for nothing: the app cannot see what it was.
 *
 * The word lists are the decks' own words, with only the composition table's
 * spellings of them added (mi for mie, havermout for oat, yoghurt for yogurt,
 * makaroni for pasta). Reviewing them is Sofia's.
 */
export type Nutrient = 'carb' | 'protein';

export type NutrientItem = Pick<LoggedItem, 'carbSource' | 'proteinSource'>;

/** Week 1's carbohydrate sources, from its table and slides. */
export const CARB_SOURCE_WORDS: readonly string[] = [
  'nasi', 'roti', 'ubi', 'pisang', 'oat', 'havermout', 'singkong', 'pepaya', 'mangga',
  'mie', 'mi', 'bubur', 'pasta', 'makaroni', 'kue', 'keripik',
];

/** Week 2's protein sources, from its table, its challenge and its fixes. */
export const PROTEIN_SOURCE_WORDS: readonly string[] = [
  'telur', 'tempe', 'tahu', 'ayam', 'ikan', 'yogurt', 'yoghurt', 'tuna', 'susu', 'daging',
  'sarden', 'salmon',
];

/** The first word of a food's name, lower-cased. */
export function headWord(name: string): string {
  return name.toLowerCase().match(/[a-z]+/)?.[0] ?? '';
}

/** Whether a composition-table food's name leads with one of the words. */
export function namesSource(name: string, words: readonly string[]): boolean {
  return words.includes(headWord(name));
}

export function hasNutrient(item: NutrientItem, nutrient: Nutrient): boolean {
  return nutrient === 'carb' ? (item.carbSource ?? false) : (item.proteinSource ?? false);
}
