import { summariseDay, type LoggedItem, type TodayData } from '../today';
import type { TrainingSession } from '../session';
import type { LessonCard, Week } from '../learn';
import type { AdviceRule } from '../advice';
import type { FoodWithPortions } from '../food';
import type { Leaderboard } from '../team';
import type { EarnedBadge } from '../badges';
import type { Progress } from '../progress';
import type { CoachView } from '../coach';

/**
 * The squad's names, or stand-ins for them.
 *
 * The three athletes are real, named 14 to 16 year olds, and the figures
 * beside them -- hydration readings, Cooper run distances -- are transcribed
 * from the programme's own tracker. That is fine inside a demo on a laptop and
 * is not fine in a build handed to people, so any build meant to be passed
 * around sets EXPO_PUBLIC_ANON_DEMO=1 and gets stand-ins instead.
 *
 * Only the names change. Every figure, every finding and every shape of the
 * demo stays exactly as it is, because those are the programme's results and
 * they are the point.
 *
 * The stand-ins have to sort the same way the real names do -- Jacob,
 * Jeongho, Theo -- because the coach's roster is alphabetical and the fixture
 * is written in that order. A test holds the two in step.
 */
const ANON = process.env.EXPO_PUBLIC_ANON_DEMO === '1';

export const DEMO_NAMES = {
  /** The athlete this device holds. Sorts last, as Theo does. */
  me: ANON ? 'Candra' : 'Theo',
  /** The squad's most consistent logger. Sorts second, as Jeongho does. */
  first: ANON ? 'Bima' : 'Jeongho',
  /** Sorts first, as Jacob does. */
  third: ANON ? 'Arya' : 'Jacob',
} as const;

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
    participantName: DEMO_NAMES.me,
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

/**
 * The team leaderboard, for the development flag.
 *
 * FIXTURE ONLY, and for the same reason the week strip's lit days are: a day
 * counts because a `daily_logs` row exists, and seeding dated rows nobody
 * filled would be fabricating collected data in a research table. Against the
 * real project the board shows the three athletes with the days they have
 * actually logged, which today is one between them.
 *
 * Theo's six matches `demoActiveDates` -- six of its seven days fall inside a
 * seven-day window -- so the board and his own streak strip cannot disagree.
 * He is deliberately not the MVP: a board where the demo athlete always wins
 * shows nothing about how it reads when somebody is ahead of you, which is the
 * half of the mechanic that makes an athlete log tomorrow.
 *
 * The positions and the MVP are written out rather than computed by calling
 * `rank` here. Importing team.ts would make this module run one of its
 * functions at module-init time, across a module that reaches supabase.ts --
 * the exact shape that once bundled cleanly and crashed on boot. A test
 * asserts this matches what `rank` and `mvp` actually return, so it cannot
 * drift unnoticed.
 */
export const DEMO_LEADERBOARD: Leaderboard = {
  teamName: 'Jakarta U16',
  rows: [
    { participantCode: 'J-01', name: DEMO_NAMES.first, daysLogged: 7, loggedToday: true, isMe: false, position: 1 },
    { participantCode: 'T-01', name: DEMO_NAMES.me, daysLogged: 6, loggedToday: true, isMe: true, position: 2 },
    { participantCode: 'JA-01', name: DEMO_NAMES.third, daysLogged: 4, loggedToday: false, isMe: false, position: 3 },
  ],
  mvp: [DEMO_NAMES.first],
  windowDays: 7,
};

/**
 * The month's MVP, for the development flag.
 *
 * Jeongho again: a fixture where the week and the month disagree would be
 * showing off the mechanic rather than showing what the squad's data says,
 * and the squad has one athlete who logs more than the others.
 */
export const DEMO_MONTH_MVP: string[] = [DEMO_NAMES.first];

/**
 * Theo's figures, as the rest of this fixture describes them.
 *
 * Every one is read off something already here rather than chosen: seven
 * dates in `demoActiveDates`, whose longest consecutive run is four, and no
 * challenge completion, because `fixtureWeek` hands the Learn screen a null
 * `completedOn`. A badge count that disagreed with the Learn screen would be
 * the demo contradicting itself on two taps.
 */
export const DEMO_STATS = { daysLogged: 7, bestStreak: 4, challengesDone: 0 };

/**
 * Theo's badges, matching supabase/seed/0007_badges.sql row for row.
 *
 * Earned follows from DEMO_STATS and nothing else, so one badge is lit and
 * the rest read as targets -- which is what a squad sees in week one. Written
 * out rather than computed with `award` here, for the same reason the board's
 * positions are: a test checks them instead.
 */
export const DEMO_BADGES: EarnedBadge[] = [
  { id: 'b1', code: 'first_log', name: 'First Touch', description: 'Log anything, once.',
    criterion: 'days_logged', threshold: 1, position: 1, progress: 7, earned: true },
  { id: 'b2', code: 'ten_days', name: 'Ten Days', description: 'Log on ten different days.',
    criterion: 'days_logged', threshold: 10, position: 2, progress: 7, earned: false },
  { id: 'b3', code: 'thirty_days', name: 'Full Month', description: 'Log on thirty different days.',
    criterion: 'days_logged', threshold: 30, position: 3, progress: 7, earned: false },
  { id: 'b4', code: 'week_streak', name: 'Seven Straight', description: 'Log seven days in a row.',
    criterion: 'streak', threshold: 7, position: 4, progress: 4, earned: false },
  { id: 'b5', code: 'fortnight', name: 'Fourteen Straight', description: 'Log fourteen days in a row.',
    criterion: 'streak', threshold: 14, position: 5, progress: 4, earned: false },
  { id: 'b6', code: 'first_challenge', name: 'Challenger', description: 'Finish one weekly challenge.',
    criterion: 'challenges_done', threshold: 1, position: 6, progress: 0, earned: false },
  { id: 'b7', code: 'all_challenges', name: 'Four for Four', description: 'Finish a challenge in all four weeks.',
    criterion: 'challenges_done', threshold: 4, position: 7, progress: 0, earned: false },
];

/**
 * Theo's progress, for the development flag.
 *
 * Built from the seeds rather than invented, which is why three of the four
 * measures have no baseline: `0003_baseline_roster.sql` seeds urine colour for
 * all nine recall-days and leaves fluid, energy and the meal text null,
 * because the tracker's free text is not in this repository. Theo's three days
 * at 6 are his own reading.
 *
 * It is a thin screen on purpose. The gaps are the programme's findings, and a
 * fixture that filled them in would be the one place in this app where
 * invented nutrition data reached a demo.
 */
export const DEMO_PROGRESS: Progress = {
  metrics: [
    {
      key: 'urine', label: 'Hydration', unit: 'on the 1–8 scale',
      baseline: { value: 6, days: 3 },
      current: { value: 5.2, days: 5 },
      note: 'Drink more today',
      missingNote: 'No urine readings recorded yet.',
    },
    {
      key: 'fluid', label: 'Fluid', unit: 'mL a day',
      baseline: { value: null, days: 0 },
      current: { value: 1850, days: 4 },
      note: null,
      missingNote: 'Fluid has never been collected by the programme.',
    },
    {
      key: 'breakfast', label: 'Breakfast', unit: '% of days',
      baseline: { value: null, days: 0 },
      current: { value: 80, days: 5 },
      note: null,
      missingNote:
        'The three-day recall holds this as free text, which has not been exported yet.',
    },
    {
      key: 'energy', label: 'Morning energy', unit: 'out of 10',
      baseline: { value: null, days: 0 },
      current: { value: 6.4, days: 5 },
      note: null,
      missingNote:
        'The three-day recall holds this as free text, which has not been exported yet.',
    },
  ],
  assessments: [
    // Theo's own Cooper run. post_value is null for everyone: the re-test is
    // the 30 Nov to 2 Dec recall and has not happened.
    { measure: 'Cooper 12-min run', unit: 'm', pre: 2680, post: null },
  ],
};

/**
 * The coach's view of the squad, for the development flag.
 *
 * The three real athletes, alphabetical as the dashboard keeps them. The
 * figures are shaped to show each state the screen can be in -- a flagged
 * athlete, a clean one, and one whose weight is unconfirmed so no day of his
 * can be measured against the band at all. That last case is not invented:
 * two of the three have heights and weights that disagree between the
 * tracker's tabs, which is in the roster seed's own notes.
 *
 * Theo's hydration flag is his real baseline finding -- three days at 6, which
 * the workbook calls drink immediately.
 */
export const DEMO_COACH_VIEW: CoachView = {
  teamName: 'Jakarta U16',
  windowDays: 14,
  loggedToday: 2,
  athletes: [
    {
      participantId: 'p-jacob', name: DEMO_NAMES.third, weightKg: 67,
      days: [], loggedToday: false, daysLogged: 9, breakfastDays: 7,
      insideBand: 4, daysWithBand: 6, flags: [],
    },
    {
      participantId: 'p-jeongho', name: DEMO_NAMES.first, weightKg: null,
      days: [], loggedToday: true, daysLogged: 12, breakfastDays: 11,
      insideBand: 0, daysWithBand: 0, flags: [],
    },
    {
      participantId: 'p-theo', name: DEMO_NAMES.me, weightKg: 68,
      days: [], loggedToday: true, daysLogged: 11, breakfastDays: 6,
      insideBand: 2, daysWithBand: 8,
      flags: [
        {
          code: 'under_fuelling',
          detail: "3 recorded days running below the programme's band.",
        },
        {
          code: 'dehydrated',
          detail: "Last urine reading was 6. The tracker's scale calls 5 or worse act now.",
        },
      ],
    },
  ],
};
