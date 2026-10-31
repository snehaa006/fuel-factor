import { summariseDay, type LoggedItem, type TodayData } from '../today';
import type { TrainingSession } from '../session';
import type { LessonCard, Week } from '../learn';
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
  {
    code: 'refuel_window_open',
    domain: 'timing',
    message_en:
      'Refuel within 30 minutes. Aim for roughly 3 parts carbohydrate to 1 part protein.',
    severity: 2,
    reviewed_by: null,
  },
  {
    code: 'pre_training_meal',
    domain: 'timing',
    message_en:
      'Eat a proper meal 2 to 3 hours before training. Rice, pasta, nasi campur, anything carb-heavy.',
    severity: 1,
    reviewed_by: null,
  },
];

/**
 * An afternoon session, which is when a Jakarta school side trains.
 *
 * Fixed rather than derived from the current time: a session that always sat
 * two hours ahead of whenever you looked would make the timing cards appear
 * on cue and tell you nothing about whether the windows are right. These fire
 * when the clock actually reaches them, as they will for an athlete.
 */
const DEMO_SESSION: TrainingSession = { startsAt: 16 * 60 + 30, endsAt: 18 * 60 };

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
    dailyLogId: 'demo-log',
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
      68,
      DEMO_SESSION
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

/**
 * Week 1 of the programme, mirroring supabase/seed/0006_week1_lessons.sql.
 *
 * The text is the deck's, exactly as the seed has it, so the Learn screen can
 * be developed and tested without a session — the project still has anonymous
 * sign-ins switched off. A test asserts this stays in step with the seed file,
 * because a fixture that drifts from the database is worse than none.
 */
export const DEMO_WEEKS: Week[] = [
  {
    weekNumber: 1,
    theme: 'Carbohydrates',
    challenge: 'Add one carb to every meal',
    challengeId: 'demo-ch1',
    unlocked: true,
  },
  { weekNumber: 2, theme: null, challenge: null, challengeId: null, unlocked: false },
  { weekNumber: 3, theme: null, challenge: null, challengeId: null, unlocked: false },
  { weekNumber: 4, theme: null, challenge: null, challengeId: null, unlocked: false },
];

function lesson(
  id: string,
  kind: LessonCard['kind'],
  heading: string | null,
  body: string | null,
  points: [string | null, string | null, string | null][] = [],
  sourceNote: string | null = null
): LessonCard {
  return {
    id,
    kind,
    heading,
    body,
    sourceNote,
    points: points.map(([label, value, detail], i) => ({
      id: `${id}-${i}`,
      label,
      value,
      detail,
    })),
  };
}

export const DEMO_LESSON_CARDS: LessonCard[] = [
  lesson('l1', 'intro', 'Carbohydrates: Your Training Fuel',
    'Team sports are glycolytic. That means carbohydrates — not protein, not fat — are the primary fuel for sprints, tackles, jumps, and decisions. This week we cover why, how much, and where to find them in Jakarta.'),

  lesson('l2', 'stats', 'Why it matters', null, [
    ['Of energy during team sports comes from carbohydrates', '60–70%', null],
    ['Body weight loss from dehydration = 10% drop in sprint speed', '2%', null],
    ['Per kg body weight needed on training days (ISSN guidelines)', '5–7g', null],
    ['Full game depletes glycogen by 80–90% without fuelling', '90 min', null],
  ]),

  lesson('l3', 'myth_fact', 'The Biggest Myth in Teen Nutrition', null, [
    ['THE MYTH', null, '"Carbs make you fat. Athletes should eat mostly protein." This comes from adult weight-loss culture — it is not relevant for a growing athlete burning 1,500–2,000 kcal in training per day.'],
    ['THE FACT', null, "Carbohydrates are stored as glycogen in your muscles and liver. Glycogen is the fuel that powers every sprint, jump, and change of direction in training. Without it, you slow down — not because you're unfit, but because you're unfuelled."],
  ]),

  lesson('l4', 'process', 'What Carbohydrates Actually Do', null, [
    ['You Eat Carbs', null, 'Nasi, pisang, roti, ubi, oat'],
    ['Digested to Glucose', null, 'Broken down in the small intestine'],
    ['Stored as Glycogen', null, '~400g in muscles, ~100g in liver'],
    ['Released During Training', null, 'Powers sprints, tackles, jumps'],
    ['Must Be Replaced', null, 'Post-training nutrition refills the tank'],
  ]),

  lesson('l5', 'timeline', 'What Happens to Glycogen During a Full Game', null, [
    ['Kick-off (0 min)', '100%', null],
    ['Half-time (45 min)', '~60%', null],
    ['75 minutes', '~30%', null],
    ['Full time (90 min)', '~12%', null],
  ], 'Bangsbo et al. (1994), Maughan & Leiper (1994). This is why second-half performance drops — especially for athletes who start the game underfuelled.'),

  lesson('l6', 'timing', 'When to Eat Carbs Around Training', null, [
    ['PRE-TRAINING (1–2 HRS BEFORE)', null, 'Goal: Top up glycogen stores before you deplete them.\n\nBest options: 1–2 pisang · roti gandum + selai kacang · ubi jalar rebus · oat dengan susu\n\nAvoid: Heavy or fatty food (slows digestion, causes stomach issues)'],
    ['DURING TRAINING (>60 MIN SESSIONS)', null, 'Goal: Maintain blood glucose and delay fatigue.\n\nBest options: 1 pisang at half-time · small sip of Pocari or air kelapa muda · orange/jeruk slices\n\nIf under 60 min: Water only — no food needed during session'],
    ['POST-TRAINING (WITHIN 30 MIN)', null, 'Goal: Replenish glycogen + start muscle repair. This is the most important window.\n\nBest options: 1–2 pisang + glass susu · nasi + ayam · roti + telur · jus semangka + telur rebus\n\nTarget ratio: 3:1 carbs to protein'],
  ]),

  lesson('l7', 'targets', 'Your Carbohydrate Targets', 'for 60–70 kg athlete', [
    ['TRAINING DAY', '350–490g', '5–7g per kg body weight · Most of this should come from nasi, ubi, pisang, roti'],
    ['REST DAY', '210–280g', '3–4g per kg body weight · Slightly reduced — muscle demand is lower'],
    ['GAME DAY', '420–560g', '6–8g per kg · High output day · Start loading the night before'],
    ['CURRENT AVERAGE (LAB RATS)', '87–156g', 'This is 20–40% of target — the biggest performance gap we are addressing'],
  ]),

  lesson('l8', 'foods', 'Best Carbohydrate Sources in Jakarta', null),

  lesson('l9', 'challenge', 'Add One Carb to Every Meal',
    "Don't change what you're eating — just add. If you're having chicken and salad for lunch, add a bowl of nasi. If you're skipping breakfast, have a pisang. If your pre-training meal has no carbs, add ubi jalar rebus or 2 slices roti. One addition per meal, three meals a day, every day this week. That's it. Track whether your energy in the second half of training feels different by Thursday."),

  lesson('l10', 'references', 'References', null, [
    [null, null, 'Burke LM et al. (2011). Carbohydrates for training and competition. Journal of Sports Sciences, 29(S1), S17–S27.'],
    [null, null, 'Bangsbo J et al. (1994). Activity profile of competition soccer. Canadian Journal of Sport Sciences.'],
    [null, null, 'ISSN Position Stand: Nutrient Timing (Kerksick et al., 2017).'],
    [null, null, 'Thomas DT, Erdman KA, Burke LM (2016). Academy of Nutrition and Dietetics position paper on nutrition and athletic performance. Journal of the Academy of Nutrition and Dietetics, 116(3), 501–528.'],
  ]),
];
