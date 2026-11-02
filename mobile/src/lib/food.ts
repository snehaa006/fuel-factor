import { supabase } from './supabase';
import type { Tables } from './database.types';

export type FoodItem = Tables<'food_items'>;
export type FoodPortion = Tables<'food_portions'>;
export type FoodWithPortions = FoodItem & { food_portions: FoodPortion[] };

/**
 * The Week 1 deck sorts every food into one of two registers and no others.
 * Nothing in this app labels a food bad.
 */
export const GUIDANCE_LABEL = {
  eat_daily: 'Eat daily',
  not_the_priority: 'Okay, but not the priority',
} as const;

/**
 * The programme's own short list -- the Week 1 deck's foods -- with portions.
 *
 * Not the whole composition table: that is 1,346 foods and is searched on
 * the server instead (`searchFoodDatabase`). This is what the picker shows
 * before anything is typed, and what Learn draws from.
 */
export async function listFoods(): Promise<FoodWithPortions[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*, food_portions(*)')
    .is('tkpi_id', null)
    .order('guidance', { ascending: true })
    .order('name_id', { ascending: true })
    .returns<FoodWithPortions[]>();

  if (error) throw error;
  return data ?? [];
}

/** How many matches a search brings back. Enough to scroll, not the whole table. */
export const SEARCH_LIMIT = 40;

/**
 * What can go into a PostgREST `or=(...)` filter.
 *
 * Commas, parentheses and the wildcard characters are syntax there, so they
 * are dropped from what was typed rather than escaped; nobody searches for a
 * food by its punctuation.
 */
export function searchTerm(query: string): string {
  return query.replace(/[,()*%\\'"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Search the whole food database by name, Indonesian or English.
 *
 * Server-side, because the composition table is too large to send to a
 * phone. An empty query returns the programme's short list instead.
 */
export async function searchFoodDatabase(query: string): Promise<FoodWithPortions[]> {
  const term = searchTerm(query);
  if (term === '') return listFoods();

  const { data, error } = await supabase
    .from('food_items')
    .select('*, food_portions(*)')
    .or(`name_id.ilike.*${term}*,name_en.ilike.*${term}*`)
    .order('guidance', { ascending: true, nullsFirst: false })
    .order('name_id', { ascending: true })
    .limit(SEARCH_LIMIT)
    .returns<FoodWithPortions[]>();

  if (error) throw error;
  return (data ?? []).map((food) => ({
    ...food,
    food_portions: [...food.food_portions].sort((a, b) => Number(a.grams ?? 0) - Number(b.grams ?? 0)),
  }));
}

export type Macros = {
  kcal: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

const scaled = (value: number | null, quantity: number) =>
  value === null ? null : Math.round(Number(value) * quantity * 10) / 10;

/** A portion's figures at a quantity. A missing figure stays missing. */
export function macrosFor(portion: FoodPortion, quantity = 1): Macros {
  return {
    kcal: scaled(portion.kcal, quantity),
    carbs_g: scaled(portion.carbs_g, quantity),
    protein_g: scaled(portion.protein_g, quantity),
    fat_g: scaled(portion.fat_g, quantity),
  };
}

/** "180 kcal · 40 g carbs · 3 g protein · 0 g fat", leaving out what is unknown. */
export function macroLine(m: Macros): string {
  const parts: string[] = [];
  if (m.kcal !== null) parts.push(`${Math.round(m.kcal)} kcal`);
  if (m.carbs_g !== null) parts.push(`${Math.round(m.carbs_g)} g carbs`);
  if (m.protein_g !== null) parts.push(`${Math.round(m.protein_g)} g protein`);
  if (m.fat_g !== null) parts.push(`${Math.round(m.fat_g)} g fat`);
  return parts.join(' · ');
}

/**
 * Carbohydrate in a portion, or null when the programme has not supplied a
 * figure for it. Null is a real answer here and must reach the caller: the Week
 * 1 deck gives carbohydrate for eight foods and nothing for the other seven.
 */
export function carbsFor(portion: FoodPortion, quantity = 1): number | null {
  return portion.carbs_g === null ? null : Number(portion.carbs_g) * quantity;
}

/** Foods the app may suggest. Pork can be logged but is never recommended. */
export function suggestable(foods: FoodWithPortions[]): FoodWithPortions[] {
  return foods.filter((f) => !f.is_pork && f.guidance === 'eat_daily');
}
