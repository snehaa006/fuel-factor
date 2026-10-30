import { asError } from './errors';
import { carbsFor, type FoodPortion, type FoodWithPortions } from './food';
import { supabase } from './supabase';
import type { TablesUpdate } from './database.types';
import type { MealSlot } from './today';

/**
 * The six slot ticks as typed updates.
 *
 * A computed key widens to a string index and loses the column types, so each
 * slot is spelled out. Being a Record over the enum, a seventh slot added to
 * the schema breaks this at compile time rather than writing to nothing.
 */
const TICK: Record<MealSlot, (on: boolean) => TablesUpdate<'daily_logs'>> = {
  breakfast: (on) => ({ breakfast: on }),
  pre_training: (on) => ({ pre_training: on }),
  lunch: (on) => ({ lunch: on }),
  post_training: (on) => ({ post_training: on }),
  dinner: (on) => ({ dinner: on }),
  evening_snack: (on) => ({ evening_snack: on }),
};

/** Fold accents and case so "Pepaya" matches "pepaya" and "PEPAYA". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Find a food by what an athlete would type.
 *
 * Matches the Indonesian name and the English one, so "rice" finds Nasi putih
 * and "nasi" finds it too — the squad speaks both and the deck is bilingual.
 *
 * Ordering is the one editorial decision here, and it is not a nutrition
 * judgement: a name that starts with what was typed comes before one that
 * merely contains it, and within that the database's own order is kept, which
 * puts the deck's eat-daily foods first. Nothing is hidden or ranked down.
 */
export function searchFoods(foods: FoodWithPortions[], query: string): FoodWithPortions[] {
  const q = fold(query);
  if (q.length === 0) return foods;

  const scored = foods
    .map((food, index) => {
      const names = [food.name_id, food.name_en ?? ''].map(fold);
      if (!names.some((n) => n.includes(q))) return null;
      return { food, index, startsWith: names.some((n) => n.startsWith(q)) };
    })
    .filter((m): m is { food: FoodWithPortions; index: number; startsWith: boolean } => m !== null);

  scored.sort((a, b) =>
    a.startsWith === b.startsWith ? a.index - b.index : Number(b.startsWith) - Number(a.startsWith)
  );
  return scored.map((m) => m.food);
}

/** The portion the picker should open on. */
export function defaultPortion(food: FoodWithPortions): FoodPortion | null {
  return food.food_portions.find((p) => p.is_default) ?? food.food_portions[0] ?? null;
}

/** The quantities the picker offers. Halves, because half a bowl is a real portion. */
export const QUANTITIES = [0.5, 1, 1.5, 2, 3] as const;

/**
 * What a portion at a quantity amounts to, for the line under the picker.
 * Null carbohydrate stays null all the way to the screen.
 */
export function portionSummary(portion: FoodPortion, quantity: number) {
  const carbs = carbsFor(portion, quantity);
  return {
    carbs_g: carbs,
    kcal: portion.kcal === null ? null : Number(portion.kcal) * quantity,
    /** The programme has supplied nothing for this portion yet. */
    unknown: carbs === null,
  };
}

/**
 * Today's row, created if this is the first thing logged today.
 *
 * Row level security decides whose row it is; the participant is passed only
 * because the insert needs the column, and the policy checks it matches.
 */
export async function ensureDailyLog(participantId: string, date: string): Promise<string> {
  const existing = await supabase
    .from('daily_logs')
    .select('id')
    .eq('participant_id', participantId)
    .eq('log_date', date)
    .maybeSingle();

  if (existing.error) throw asError(existing.error);
  if (existing.data) return existing.data.id;

  const created = await supabase
    .from('daily_logs')
    .insert({ participant_id: participantId, log_date: date })
    .select('id')
    .single();

  if (created.error) throw asError(created.error);
  return created.data.id;
}

/**
 * Log a portion into a slot, and tick the slot on the day's row.
 *
 * The tick is what the DAILY LOG sheet records; the item is the app's finer
 * version of the same fact. Both are written, because the research export
 * reads only the tick.
 */
export async function addLogItem(
  dailyLogId: string,
  slot: MealSlot,
  foodPortionId: string,
  quantity: number
): Promise<void> {
  const inserted = await supabase
    .from('log_items')
    .insert({ daily_log_id: dailyLogId, slot, food_portion_id: foodPortionId, quantity });

  if (inserted.error) throw asError(inserted.error);

  const ticked = await supabase.from('daily_logs').update(TICK[slot](true)).eq('id', dailyLogId);
  if (ticked.error) throw asError(ticked.error);
}

/**
 * Remove a logged item, and untick the slot if it was the last one in it.
 *
 * The tick follows the items rather than being left set, so a slot emptied by
 * mistake does not keep reporting a meal that is no longer recorded.
 */
export async function removeLogItem(
  id: string,
  dailyLogId: string,
  slot: MealSlot
): Promise<void> {
  const deleted = await supabase.from('log_items').delete().eq('id', id);
  if (deleted.error) throw asError(deleted.error);

  const remaining = await supabase
    .from('log_items')
    .select('id', { count: 'exact', head: true })
    .eq('daily_log_id', dailyLogId)
    .eq('slot', slot);

  if (remaining.error) throw asError(remaining.error);
  if ((remaining.count ?? 0) > 0) return;

  const unticked = await supabase.from('daily_logs').update(TICK[slot](false)).eq('id', dailyLogId);
  if (unticked.error) throw asError(unticked.error);
}
