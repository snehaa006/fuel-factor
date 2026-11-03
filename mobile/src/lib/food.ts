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

/** Every food with its portions, for the logger's picker. */
export async function listFoods(): Promise<FoodWithPortions[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*, food_portions(*)')
    .order('guidance', { ascending: true })
    .order('name_id', { ascending: true })
    .returns<FoodWithPortions[]>();

  if (error) throw error;
  return data ?? [];
}

/**
 * Carbohydrate in a portion, or null when the programme has not supplied a
 * figure for it. Null is a real answer here and must reach the caller: the Week
 * 1 deck gives carbohydrate for eight foods and nothing for the other seven.
 */
export function carbsFor(portion: FoodPortion, quantity = 1): number | null {
  return portion.carbs_g === null ? null : Number(portion.carbs_g) * quantity;
}

/**
 * Protein in a portion, or null when the programme has not supplied a figure.
 * Week 2's deck gives protein for its six complete proteins and nothing else;
 * every week 1 food has none, which is the deck's silence and not a zero.
 */
export function proteinFor(portion: FoodPortion, quantity = 1): number | null {
  return portion.protein_g === null ? null : Number(portion.protein_g) * quantity;
}

/** The deck that put a food in the database, by week. 'week-2-deck' is week 2. */
export function deckWeek(source: string): number | null {
  const match = /^week-(\d)-deck$/.exec(source);
  return match ? Number(match[1]) : null;
}

/** Foods the app may suggest. Pork can be logged but is never recommended. */
export function suggestable(foods: FoodWithPortions[]): FoodWithPortions[] {
  return foods.filter((f) => !f.is_pork && f.guidance === 'eat_daily');
}
