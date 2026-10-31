import { summariseDay, type LoggedItem, type TodayData } from '../today';
import type { AdviceRule } from '../advice';
import type { FoodWithPortions } from '../food';

/**
 * Theo's day, as the seeds in supabase/seed/0005_demo_today.sql describe it.
 *
 * One source for the component tests and for the offline development flag, so
 * the screen cannot be tested against something the database would never
 * return. The carbohydrate figures are the Week 1 deck's own: oats 80 g dry at
 * 54 g, nasi putih 200 g cooked at 57 g.
 */
export const DEMO_ITEMS: LoggedItem[] = [
  { slot: 'breakfast', quantity: 1, carbs_g: 54, name: 'Oat' },
  { slot: 'lunch', quantity: 1, carbs_g: 57, name: 'Nasi putih' },
];

export const DEMO_RULES: AdviceRule[] = [
  {
    code: 'no_breakfast_training_day',
    domain: 'carbohydrate',
    message_en:
      'Eat breakfast every training day, even a pisang or roti with telur. No training on empty.',
    severity: 2,
    reviewed_by: null,
  },
  {
    code: 'no_carbs_in_slot',
    domain: 'carbohydrate',
    message_en: 'Nasi, ubi jalar or roti all count.',
    severity: 1,
    reviewed_by: null,
  },
  {
    code: 'urine_five_or_worse',
    domain: 'hydration',
    message_en:
      'Losing 2% of your body weight to dehydration cuts sprint speed by about 10%.',
    severity: 2,
    reviewed_by: null,
  },
];

/** A date `back` days before `today`, as YYYY-MM-DD. */
function daysBefore(today: string, back: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - back * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Days Theo was active, for the streak strip.
 *
 * FIXTURE ONLY, and deliberately not mirrored into supabase/seed. A day is on
 * the strip because a `daily_logs` row exists for it, and `daily_logs` is a
 * research table the CSV export reads -- so seeding six dated rows nobody
 * filled would be fabricating collected data, not demo content. This array
 * lives behind EXPO_PUBLIC_DEMO_DATA and never reaches the database.
 *
 * Against the real project the strip shows the days Theo has actually logged,
 * which on a fresh database is one.
 */
function demoActiveDates(today: string): string[] {
  // A three-day run up to today, a missed day, then a four-day run before it:
  // enough shape to show a gap, and a best that beats the current streak.
  return [0, 1, 2, 4, 5, 6, 7].map((back) => daysBefore(today, back));
}

/** Theo: 68 kg, the one weight both tabs of the tracker agree on. */
export function demoToday(today: string): TodayData {
  return {
    participantId: 'demo-theo',
    participantName: 'Theo',
    weightKg: 68,
    summary: summariseDay(
      {
        day_type: 'training',
        dq_score: null,
        // Theo's own baseline reading, which sat at 6 for three straight days
        // -- "dehydrated, drink immediately" in the workbook's own wording.
        // It is here so the hydration card demonstrates; the figure is his, not
        // one the app made up.
        urine_colour: 6,
        breakfast: true,
        pre_training: false,
        lunch: true,
        post_training: false,
        dinner: false,
        evening_snack: false,
      },
      DEMO_ITEMS,
      68
    ),
    activeDates: demoActiveDates(today),
  };
}

/**
 * A slice of the food database, matching supabase/seed/0001_week1_foods.sql
 * row for row — including the two with no carbohydrate figure, because the
 * logger has to look right when the programme has given no number.
 */
const CREATED = '2026-10-31T00:00:00Z';

function demoFood(
  id: string,
  name_id: string,
  name_en: string,
  category: string,
  guidance: 'eat_daily' | 'not_the_priority',
  label: string,
  kcal: number | null,
  carbs_g: number | null,
  guidance_note: string | null = null
): FoodWithPortions {
  return {
    id, name_id, name_en, category, guidance, guidance_note,
    is_pork: false, source: 'week-1-deck', created_at: CREATED,
    food_portions: [
      {
        id: `${id}-p`, food_id: id, label, grams: null, kcal, carbs_g,
        protein_g: null, fat_g: null, source_note: null, is_default: true,
        created_at: CREATED,
      },
    ],
  };
}

export const DEMO_FOODS: FoodWithPortions[] = [
  demoFood('f1', 'Nasi putih', 'White rice', 'carbohydrate', 'eat_daily', '200g cooked', 260, 57),
  demoFood('f2', 'Nasi merah', 'Brown rice', 'carbohydrate', 'eat_daily', '200g cooked', 220, 46, 'More fibre'),
  demoFood('f3', 'Ubi jalar', 'Sweet potato', 'carbohydrate', 'eat_daily', '200g', 172, 40),
  demoFood('f4', 'Pisang', 'Banana', 'fruit', 'eat_daily', '1 medium', 105, 27, 'Potassium'),
  demoFood('f5', 'Oat', 'Oats', 'carbohydrate', 'eat_daily', '80g dry', 300, 54, 'Slow-release'),
  demoFood('f6', 'Pepaya / mangga', 'Papaya / mango', 'fruit', 'eat_daily', '150g', null, null, 'Quick carbs and vitamins'),
  demoFood('f7', 'Mie instan', 'Instant noodles', 'carbohydrate', 'not_the_priority', '1 portion', null, null, 'Carbs yes, but high sodium and low nutrition'),
];
