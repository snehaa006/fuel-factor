import { summariseDay, type LoggedItem, type TodayData } from '../today';
import type { AdviceRule } from '../advice';

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
];

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
    activeDates: [today],
  };
}
