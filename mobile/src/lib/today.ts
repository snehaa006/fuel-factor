import { carbsFor } from './food';
import { supabase } from './supabase';
import { carbBand, type CarbBand, type DayType } from './targets';
import type { Enums, Tables } from './database.types';

export type MealSlot = Enums<'meal_slot'>;

/** The six slots of the DAILY LOG sheet, in its order. */
export const MEAL_SLOTS: MealSlot[] = [
  'breakfast',
  'pre_training',
  'lunch',
  'post_training',
  'dinner',
  'evening_snack',
];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  pre_training: 'Pre-training',
  lunch: 'Lunch',
  post_training: 'Post-training',
  dinner: 'Dinner',
  evening_snack: 'Evening snack',
};

export type LoggedItem = {
  slot: MealSlot;
  quantity: number;
  /** Null when the programme has supplied no carbohydrate figure for it. */
  carbs_g: number | null;
  name: string;
};

export type SlotState = {
  slot: MealSlot;
  label: string;
  logged: boolean;
  items: LoggedItem[];
  /** Carbohydrate across the slot's items, or null if none of them carry a figure. */
  carbs_g: number | null;
};

export type DaySummary = {
  dayType: DayType | null;
  slots: SlotState[];
  /** Carbohydrate from every item that carries a figure. */
  carbsEaten: number;
  /** Items logged whose portion has no carbohydrate figure yet. */
  itemsWithoutFigures: number;
  band: CarbBand | null;
  /** The DQ Score /12. Null until the dietitian states the formula. */
  dqScore: number | null;
};

type DailyLogRow = Pick<
  Tables<'daily_logs'>,
  'day_type' | 'dq_score' | MealSlot
>;

/**
 * Turn a day's row and its items into what the Today screen draws.
 *
 * Pure, so the screen can be tested without a network. Carbohydrate is summed
 * only over portions that carry a figure; the rest are counted separately and
 * surfaced, because a total that quietly treats "unknown" as zero would
 * understate the day and the athlete would never know.
 */
export function summariseDay(
  log: DailyLogRow | null,
  items: LoggedItem[],
  weightKg: number | null
): DaySummary {
  const slots = MEAL_SLOTS.map<SlotState>((slot) => {
    const slotItems = items.filter((i) => i.slot === slot);
    const known = slotItems.filter((i) => i.carbs_g !== null);
    return {
      slot,
      label: SLOT_LABEL[slot],
      logged: (log?.[slot] ?? false) || slotItems.length > 0,
      items: slotItems,
      carbs_g: known.length === 0 ? null : known.reduce((sum, i) => sum + (i.carbs_g ?? 0), 0),
    };
  });

  return {
    dayType: log?.day_type ?? null,
    slots,
    carbsEaten: items.reduce((sum, i) => sum + (i.carbs_g ?? 0), 0),
    itemsWithoutFigures: items.filter((i) => i.carbs_g === null).length,
    band: carbBand(weightKg, log?.day_type ?? null),
    dqScore: log?.dq_score ?? null,
  };
}

export type TodayData = {
  participantId: string;
  participantName: string;
  weightKg: number | null;
  summary: DaySummary;
  /** Dates the athlete was active, newest first, for the streak. */
  activeDates: string[];
};

/** Today in the device's own timezone, as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

type LogItemRow = Tables<'log_items'> & {
  food_portions:
    | (Tables<'food_portions'> & { food_items: Pick<Tables<'food_items'>, 'name_id'> | null })
    | null;
};

/**
 * Everything the Today screen needs, for the signed-in athlete.
 *
 * Which athlete is never a parameter: row level security answers that from the
 * session, so a caller cannot ask for somebody else's day.
 */
export async function fetchToday(date = todayIso()): Promise<TodayData | null> {
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, name, weight_kg')
    .limit(1)
    .maybeSingle();

  if (participantError) throw participantError;
  if (!participant) return null;

  const [logResult, datesResult] = await Promise.all([
    supabase
      .from('daily_logs')
      .select(
        'id, day_type, dq_score, breakfast, pre_training, lunch, post_training, dinner, evening_snack'
      )
      .eq('participant_id', participant.id)
      .eq('log_date', date)
      .maybeSingle(),
    supabase
      .from('daily_logs')
      .select('log_date')
      .eq('participant_id', participant.id)
      .order('log_date', { ascending: false })
      .limit(120),
  ]);

  if (logResult.error) throw logResult.error;
  if (datesResult.error) throw datesResult.error;

  let items: LoggedItem[] = [];
  if (logResult.data) {
    const { data, error } = await supabase
      .from('log_items')
      .select('slot, quantity, free_text, food_portions(*, food_items(name_id))')
      .eq('daily_log_id', logResult.data.id)
      .returns<LogItemRow[]>();

    if (error) throw error;
    items = (data ?? []).map((row) => ({
      slot: row.slot,
      quantity: Number(row.quantity),
      carbs_g: row.food_portions ? carbsFor(row.food_portions, Number(row.quantity)) : null,
      name: row.food_portions?.food_items?.name_id ?? row.free_text ?? 'Logged item',
    }));
  }

  return {
    participantId: participant.id,
    participantName: participant.name,
    weightKg: participant.weight_kg === null ? null : Number(participant.weight_kg),
    summary: summariseDay(logResult.data, items, participant.weight_kg === null ? null : Number(participant.weight_kg)),
    activeDates: (datesResult.data ?? []).map((r) => r.log_date),
  };
}

/**
 * Change today's day type.
 *
 * The band is a function of day type, so this moves every number on the
 * screen. Row level security decides whether the write lands: a coach can read
 * an athlete's log but never write it, so this fails for anyone but the
 * athlete themselves.
 */
export async function setDayType(
  participantId: string,
  date: string,
  dayType: DayType
): Promise<void> {
  const { error } = await supabase
    .from('daily_logs')
    .upsert({ participant_id: participantId, log_date: date, day_type: dayType }, {
      onConflict: 'participant_id,log_date',
    });

  if (error) throw error;
}
