import { asError } from './errors';
import { hasNutrient, type Nutrient } from './nutrients';
import { daysBetween } from './recall-window';
import { supabase } from './supabase';
import type { IsoDate } from './streak';
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
 * answer. Both so far are "add one X to every meal":
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
 */

export type { Nutrient };

export type ChallengeSpec = {
  week: number;
  nutrient: Nutrient;
  /** The meals the deck counts, in the sheet's order. */
  meals: readonly MealSlot[];
  /** How many of them a day needs. */
  mealsNeeded: number;
  /** The deck's own sentence, printed under the tracker. */
  rule: string;
  /** The challenge as the deck titles it, for when no row is to hand. */
  title: string;
};

export const CHALLENGES: Readonly<Record<number, ChallengeSpec>> = {
  1: {
    week: 1,
    nutrient: 'carb',
    meals: ['breakfast', 'lunch', 'dinner'],
    mealsNeeded: 3,
    rule: 'One addition per meal, three meals a day, every day this week.',
    title: 'Add one carb to every meal',
  },
  2: {
    week: 2,
    nutrient: 'protein',
    meals: ['breakfast', 'lunch', 'post_training', 'dinner'],
    mealsNeeded: 3,
    rule: 'One protein add per meal, every day, three meals minimum.',
    title: 'Add one protein source to every meal',
  },
};

export type ChallengeItem = Pick<
  LoggedItem,
  'slot' | 'carbs_g' | 'protein_g' | 'carbSource' | 'proteinSource'
>;

export type ChallengeLog = { date: IsoDate; items: ChallengeItem[] };

export type MealCheck = { slot: MealSlot; logged: boolean; hit: boolean };

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
  meals: MealCheck[];
  /** Meals that carried the nutrient. */
  hits: number;
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
  /**
   * Done days in a row, ending today -- or yesterday, while today is still
   * being eaten, the same grace the logging streak gives.
   */
  streak: number;
  /** All seven days done: the challenge is won. */
  complete: boolean;
  /** A day has been missed, so seven of seven is out of reach. */
  broken: boolean;
};

const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whether one logged item puts the nutrient in its meal. */
export const counts = hasNutrient;

/** The challenge's meals for one day, checked. */
export function checkMeals(items: ChallengeItem[], spec: ChallengeSpec): MealCheck[] {
  return spec.meals.map((slot) => {
    const inSlot = items.filter((i) => i.slot === slot);
    return { slot, logged: inSlot.length > 0, hit: inSlot.some((i) => counts(i, spec.nutrient)) };
  });
}

/** The dates of programme week `weekNumber`, counting day one as the start of week 1. */
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
  const byDate = new Map<IsoDate, ChallengeItem[]>();
  for (const log of logs) {
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), ...log.items]);
  }

  const days = dates.map<ChallengeDay>((date) => {
    const future = date > today;
    const meals = checkMeals(future ? [] : (byDate.get(date) ?? []), spec);
    const hits = meals.filter((m) => m.hit).length;
    const won = hits >= spec.mealsNeeded;
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
      hits,
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

  return {
    spec,
    startsOn,
    endsOn,
    phase,
    days,
    doneDays,
    streak,
    complete: doneDays === days.length,
    broken: days.some((d) => d.status === 'missed'),
  };
}

type LogRow = {
  log_date: string;
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
      'log_date, log_items(slot, quantity, free_text, food_portions(*, food_items(name_id, category, source)))'
    )
    .gte('log_date', dates[0])
    .lte('log_date', until)
    .returns<LogRow[]>();

  if (error) throw asError(error);

  return (data ?? []).map((row) => ({
    date: row.log_date,
    items: (row.log_items ?? []).map(toLoggedItem),
  }));
}
