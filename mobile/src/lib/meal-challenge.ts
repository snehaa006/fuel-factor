import { asError } from './errors';
import { hasNutrient, type Nutrient } from './nutrients';
import { daysBetween } from './recall-window';
import { supabase } from './supabase';
import type { IsoDate } from './streak';
import type { DayType } from './targets';
import { toLoggedItem, type LoggedItem, type MealSlot } from './today';

/**
 * Each week's challenge, checked against what was actually logged.
 *
 * The Learn screen has always carried a "Mark the challenge done" tap, which
 * records what the athlete says. This reads the daily log instead and answers
 * the same question from the food. Derived on read, like the streak and the
 * badges: nothing is stored, so there is no completion flag to drift from the
 * log it was read off.
 *
 * A week has a challenge here only when its deck states one the log can
 * answer. Weeks 1 and 2 are "add one X to every meal":
 *
 *   **Week 1** -- "Add One Carb to Every Meal ... One addition per meal, three
 *   meals a day, every day this week." Read as breakfast, lunch and dinner,
 *   all three. (That reading is the app's; see the handoff.)
 *
 *   **Week 2** -- "Add One Protein Source to Every Meal ... three meals
 *   minimum ... did I hit protein at 3 or more meals today?" The deck's own
 *   slide lays the meals out as Breakfast, Lunch, Post-training snack and
 *   Dinner, so three of those four wins the day.
 *
 * What counts as the nutrient: a portion whose figure for it is above zero,
 * or -- where the deck gives no figure -- a food from that week's own table
 * of sources, because the deck put it there. A zero figure wins over the
 * table. A free-text item counts for nothing either way: the app cannot see
 * what it was.
 *
 * Weeks 3 and 4 are habits rather than meals, and each is read off the parts
 * of the day the app records, in the deck's own words:
 *
 *   **Week 3** -- "check your urine colour every morning ... on training
 *   nights, have warm milk or a banana 30 minutes before sleep." A day is won
 *   with a urine colour logged and, on a training or match day, milk or a
 *   banana as the evening snack. A rest day asks only for the urine colour.
 *
 *   **Week 4** -- "run the full morning protocol one day -- 500mL water on
 *   waking, breakfast before training, check your urine colour." One day with
 *   breakfast and a urine colour wins the week. Water on waking is not
 *   something the app records (it keeps a day's total), so the card says so
 *   instead of pretending to check it.
 */

export type { Nutrient };

type SpecBase = {
  week: number;
  /** The deck's own sentence, printed under the tracker. */
  rule: string;
  /** The challenge as the deck titles it, for when no row is to hand. */
  title: string;
};

/** "Add one X to every meal": weeks 1 and 2. */
export type MealChallengeSpec = SpecBase & {
  kind: 'meals';
  nutrient: Nutrient;
  /** The meals the deck counts, in the sheet's order. */
  meals: readonly MealSlot[];
  /** How many of them a day needs. */
  mealsNeeded: number;
};

/** A habit the log records outside the food: weeks 3 and 4. */
export type Habit = 'urine' | 'presleep' | 'breakfast';

export type HabitChallengeSpec = SpecBase & {
  kind: 'habits';
  /** What a day needs, in the deck's order. */
  habits: readonly Habit[];
  /** Days that win the week: 7 for "every day", 1 for "one day". */
  daysNeeded: number;
  /** The part of the challenge the app does not record, said out loud. */
  unrecorded?: string;
};

export type ChallengeSpec = MealChallengeSpec | HabitChallengeSpec;

export const CHALLENGES: Readonly<Record<number, ChallengeSpec>> = {
  1: {
    kind: 'meals',
    week: 1,
    nutrient: 'carb',
    meals: ['breakfast', 'lunch', 'dinner'],
    mealsNeeded: 3,
    rule: 'One addition per meal, three meals a day, every day this week.',
    title: 'Add one carb to every meal',
  },
  2: {
    kind: 'meals',
    week: 2,
    nutrient: 'protein',
    meals: ['breakfast', 'lunch', 'post_training', 'dinner'],
    mealsNeeded: 3,
    rule: 'One protein add per meal, every day, three meals minimum.',
    title: 'Add one protein source to every meal',
  },
  3: {
    kind: 'habits',
    week: 3,
    habits: ['urine', 'presleep'],
    daysNeeded: 7,
    rule: 'Check your urine colour every morning. On training nights, warm milk or a banana 30 minutes before sleep.',
    title: 'Log urine colour every morning + pre-sleep recovery',
  },
  4: {
    kind: 'habits',
    week: 4,
    habits: ['breakfast', 'urine'],
    daysNeeded: 1,
    rule: 'Run the full morning protocol one day: 500mL water on waking, breakfast before training, check your urine colour.',
    title: 'Run the full morning protocol one day',
    unrecorded: 'The app does not record water on waking, so that part is yours to tick off.',
  },
};

/** The pre-sleep foods week 3 names: "warm milk or a banana". */
const PRE_SLEEP_WORDS = ['susu', 'pisang', 'milk', 'banana'];

/**
 * Whether a logged food is one of them. Read by the food's first word, the
 * way `nutrients.ts` reads a source, so "Susu Sapi" and "Pisang Mas" count and
 * "Jantung Pisang" (banana heart) does not.
 */
export function isPreSleepFood(name: string | undefined): boolean {
  const head = (name ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return PRE_SLEEP_WORDS.includes(head);
}

export type ChallengeItem = Pick<
  LoggedItem,
  'slot' | 'carbs_g' | 'protein_g' | 'carbSource' | 'proteinSource'
> & { name?: string };

export type ChallengeLog = {
  date: IsoDate;
  items: ChallengeItem[];
  /** The evening check-in's urine colour. Absent reads as not recorded. */
  urineColour?: number | null;
  dayType?: DayType | null;
};

export type MealCheck = { slot: MealSlot; logged: boolean; hit: boolean };

/**
 * One thing a day is checked for, whatever the challenge: a meal in weeks 1
 * and 2, a habit in weeks 3 and 4. `applies` is false for a check the day
 * does not ask -- week 3's pre-sleep snack on a rest night.
 */
export type DayCheck = { key: string; initial: string; label: string; hit: boolean; applies: boolean };

export type ChallengeDayStatus =
  /** Enough meals carried the nutrient. */
  | 'done'
  /** A day that is over without enough. */
  | 'missed'
  /** Today, and not enough yet. Still winnable. */
  | 'today'
  /** Not reached yet. */
  | 'upcoming';

export type ChallengeDay = {
  date: IsoDate;
  initial: string;
  /** Weeks 1 and 2 only; empty for a habit week. */
  meals: MealCheck[];
  /** What the card draws for the day, meal or habit. */
  checks: DayCheck[];
  /** Checks (or meals) that were met. */
  hits: number;
  /** How many the day needs. */
  needed: number;
  status: ChallengeDayStatus;
  isToday: boolean;
};

export type ChallengeWeek = {
  spec: ChallengeSpec;
  startsOn: IsoDate;
  endsOn: IsoDate;
  /** Where today sits against the week. */
  phase: 'before' | 'running' | 'over';
  days: ChallengeDay[];
  doneDays: number;
  /** Days that win the week: 7, or 1 for week 4's "one day". */
  daysNeeded: number;
  /**
   * Done days in a row, ending today -- or yesterday, while today is still
   * being eaten, the same grace the logging streak gives.
   */
  streak: number;
  /** Enough days done: the challenge is won. */
  complete: boolean;
  /** Too few days left to win it. For a seven-day challenge: a day was missed. */
  broken: boolean;
};

const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whether one logged item puts the nutrient in its meal. */
export const counts = hasNutrient;

/** The challenge's meals for one day, checked. */
export function checkMeals(items: ChallengeItem[], spec: MealChallengeSpec): MealCheck[] {
  return spec.meals.map((slot) => {
    const inSlot = items.filter((i) => i.slot === slot);
    return { slot, logged: inSlot.length > 0, hit: inSlot.some((i) => counts(i, spec.nutrient)) };
  });
}

/** The dates of programme week `weekNumber`, counting day one as the start of week 1. */
const MEAL_INITIAL: Partial<Record<MealSlot, string>> = {
  breakfast: 'B',
  lunch: 'L',
  post_training: 'P',
  dinner: 'D',
};

const MEAL_LABEL: Partial<Record<MealSlot, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  post_training: 'Post-training',
  dinner: 'Dinner',
};

/** How each habit is drawn and named on the card. */
export const HABIT_LABEL: Record<Habit, { initial: string; label: string }> = {
  urine: { initial: 'U', label: 'Urine colour' },
  presleep: { initial: 'S', label: 'Milk or banana before sleep (training nights)' },
  breakfast: { initial: 'B', label: 'Breakfast' },
};

/** A meal week's checks, in the card's shape. */
export function mealChecks(meals: MealCheck[]): DayCheck[] {
  return meals.map((m) => ({
    key: m.slot,
    initial: MEAL_INITIAL[m.slot] ?? '?',
    label: MEAL_LABEL[m.slot] ?? m.slot,
    hit: m.hit,
    applies: true,
  }));
}

/**
 * A habit week's checks for one day, from that day's log (or none).
 *
 * The pre-sleep snack applies on a training or match night only, as the deck
 * says. A day whose type was never set is not assumed to be a training day:
 * it asks for the urine colour alone rather than failing on a guess.
 */
export function checkHabits(log: ChallengeLog | undefined, spec: HabitChallengeSpec): DayCheck[] {
  const items = log?.items ?? [];
  const trainingNight = log?.dayType === 'training' || log?.dayType === 'match';
  return spec.habits.map((habit) => {
    const { initial, label } = HABIT_LABEL[habit];
    const hit =
      habit === 'urine'
        ? log?.urineColour !== undefined && log?.urineColour !== null
        : habit === 'breakfast'
          ? items.some((i) => i.slot === 'breakfast')
          : items.some((i) => i.slot === 'evening_snack' && isPreSleepFood(i.name));
    return { key: habit, initial, label, hit, applies: habit === 'presleep' ? trainingNight : true };
  });
}

export function weekDates(programmeStartsOn: IsoDate, weekNumber: number): IsoDate[] {
  const first = addDays(programmeStartsOn, (weekNumber - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Which programme week `today` falls in, 1-based. Zero or less before day one. */
export function programmeWeek(programmeStartsOn: IsoDate, today: IsoDate): number {
  return Math.floor(daysBetween(programmeStartsOn, today) / 7) + 1;
}

/**
 * The week, as of `today`.
 *
 * Pure: the logs and both dates are passed in. A log dated after today is
 * ignored rather than trusted, so setting the time machine back a few days
 * shows the week as it stood then.
 */
export function challengeWeek(
  logs: ChallengeLog[],
  programmeStartsOn: IsoDate,
  today: IsoDate,
  spec: ChallengeSpec
): ChallengeWeek {
  const dates = weekDates(programmeStartsOn, spec.week);
  // One log per date, its items merged and its day-level fields kept.
  const byDate = new Map<IsoDate, ChallengeLog>();
  for (const log of logs) {
    const seen = byDate.get(log.date);
    byDate.set(log.date, {
      date: log.date,
      items: [...(seen?.items ?? []), ...log.items],
      urineColour: log.urineColour ?? seen?.urineColour ?? null,
      dayType: log.dayType ?? seen?.dayType ?? null,
    });
  }

  const days = dates.map<ChallengeDay>((date) => {
    const future = date > today;
    const log = future ? undefined : byDate.get(date);
    const meals = spec.kind === 'meals' ? checkMeals(log?.items ?? [], spec) : [];
    const checks = spec.kind === 'meals' ? mealChecks(meals) : checkHabits(log, spec);
    const applicable = checks.filter((c) => c.applies);
    const hits = applicable.filter((c) => c.hit).length;
    const needed = spec.kind === 'meals' ? spec.mealsNeeded : applicable.length;
    // A habit day with nothing logged is not won by having nothing to check.
    const won = !future && hits >= needed && (spec.kind === 'meals' || log !== undefined);
    const status: ChallengeDayStatus = future
      ? 'upcoming'
      : won
        ? 'done'
        : date === today
          ? 'today'
          : 'missed';
    return {
      date,
      initial: INITIALS[new Date(`${date}T00:00:00Z`).getUTCDay()],
      meals,
      checks,
      hits,
      needed,
      status,
      isToday: date === today,
    };
  });

  const startsOn = dates[0];
  const endsOn = dates[dates.length - 1];
  const phase = today < startsOn ? 'before' : today > endsOn ? 'over' : 'running';

  // Count back from today, or from the last day of a week that is over.
  let i = days.findIndex((d) => d.date === today);
  if (phase === 'over') i = days.length - 1;
  if (i >= 0 && days[i].status === 'today') i -= 1;
  let streak = 0;
  for (; i >= 0 && days[i].status === 'done'; i -= 1) streak += 1;

  const doneDays = days.filter((d) => d.status === 'done').length;
  const daysNeeded = spec.kind === 'meals' ? days.length : spec.daysNeeded;
  const stillOpen = days.filter((d) => d.status === 'upcoming' || d.status === 'today').length;

  return {
    spec,
    startsOn,
    endsOn,
    phase,
    days,
    doneDays,
    daysNeeded,
    streak,
    complete: doneDays >= daysNeeded,
    broken: doneDays + stillOpen < daysNeeded,
  };
}

type LogRow = {
  log_date: string;
  urine_colour: number | null;
  day_type: DayType | null;
  log_items: Parameters<typeof toLoggedItem>[0][];
};

/**
 * The athlete's logs for one programme week, up to and including today.
 *
 * Row level security answers whose: an athlete reads their own rows.
 */
export async function fetchChallengeLogs(
  programmeStartsOn: IsoDate,
  today: IsoDate,
  weekNumber: number
): Promise<ChallengeLog[]> {
  const dates = weekDates(programmeStartsOn, weekNumber);
  const until = today < dates[6] ? today : dates[6];
  if (until < dates[0]) return [];

  const { data, error } = await supabase
    .from('daily_logs')
    .select(
      'log_date, urine_colour, day_type, log_items(slot, quantity, free_text, food_portions(*, food_items(name_id, category, source)))'
    )
    .gte('log_date', dates[0])
    .lte('log_date', until)
    .returns<LogRow[]>();

  if (error) throw asError(error);

  return (data ?? []).map((row) => ({
    date: row.log_date,
    items: (row.log_items ?? []).map(toLoggedItem),
    urineColour: row.urine_colour ?? null,
    dayType: row.day_type ?? null,
  }));
}
