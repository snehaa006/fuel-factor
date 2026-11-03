import { asError } from './errors';
import { daysBetween } from './recall-window';
import { supabase } from './supabase';
import type { IsoDate } from './streak';
import type { MealSlot } from './today';

/**
 * Week 1's challenge, checked against what was actually logged.
 *
 * The deck's challenge, in its own words: **"Add One Carb to Every Meal.
 * Don't change what you're eating — just add ... One addition per meal, three
 * meals a day, every day this week."** The Learn screen has always carried a
 * "Mark the challenge done" tap, which records what the athlete says. This
 * reads the daily log instead and answers the same question from the food:
 * on each day of week 1, did breakfast, lunch and dinner each have a
 * carbohydrate in them -- and did that hold for all seven days?
 *
 * Derived on read, like the streak and the badges. Nothing is stored, so
 * there is no completion flag to drift from the log it was read off.
 *
 * Two readings here are the app's and are flagged in the handoff for Sofia:
 *
 *   **Which meals.** "Three meals a day" is read as the sheet's breakfast,
 *   lunch and dinner slots. Pre-training, post-training and the evening snack
 *   are extra and never required -- a rest day has no post-training meal.
 *
 *   **What counts as a carb.** A portion whose carbohydrate figure is above
 *   zero, or -- where the deck gives no figure -- a food from the deck's own
 *   "Best Carbohydrate Sources in Jakarta" table, because the deck put it in
 *   that table. A free-text item the database cannot match counts for
 *   nothing either way: the app cannot see what it was.
 */

/** "Three meals a day": the sheet's three main slots. */
export const CHALLENGE_MEALS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

/** The challenge belongs to week 1 of the programme. */
export const CARB_CHALLENGE_WEEK = 1;

/** The deck's own sentence, printed under the tracker. */
export const CARB_CHALLENGE_RULE =
  'One addition per meal, three meals a day, every day this week.';

/** Every food in the Week 1 deck sits in its carbohydrate-sources table. */
const DECK_CARB_TABLE = 'week-1-deck';

export type ChallengeItem = {
  slot: MealSlot;
  /** The portion's carbohydrate times the quantity; null where the deck gives no figure. */
  carbs_g: number | null;
  /** The food comes from the deck's carbohydrate-sources table. False for free text. */
  deckCarbSource: boolean;
};

export type ChallengeLog = { date: IsoDate; items: ChallengeItem[] };

export type MealCheck = { slot: MealSlot; logged: boolean; carb: boolean };

export type ChallengeDayStatus =
  /** All three meals had a carb. */
  | 'done'
  /** A day that is over without all three. */
  | 'missed'
  /** Today, and not all three yet. Still winnable. */
  | 'today'
  /** Not reached yet. */
  | 'upcoming';

export type ChallengeDay = {
  date: IsoDate;
  initial: string;
  meals: MealCheck[];
  carbMeals: number;
  status: ChallengeDayStatus;
  isToday: boolean;
};

export type ChallengeWeek = {
  weekNumber: number;
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

/** Whether one logged item puts a carbohydrate in its meal. */
export function countsAsCarb(item: ChallengeItem): boolean {
  if (item.carbs_g !== null) return item.carbs_g > 0;
  return item.deckCarbSource;
}

/** The three meals of one day, checked. */
export function checkMeals(items: ChallengeItem[]): MealCheck[] {
  return CHALLENGE_MEALS.map((slot) => {
    const inSlot = items.filter((i) => i.slot === slot);
    return { slot, logged: inSlot.length > 0, carb: inSlot.some(countsAsCarb) };
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
  weekNumber = CARB_CHALLENGE_WEEK
): ChallengeWeek {
  const dates = weekDates(programmeStartsOn, weekNumber);
  const byDate = new Map<IsoDate, ChallengeItem[]>();
  for (const log of logs) {
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), ...log.items]);
  }

  const days = dates.map<ChallengeDay>((date) => {
    const future = date > today;
    const meals = checkMeals(future ? [] : (byDate.get(date) ?? []));
    const carbMeals = meals.filter((m) => m.carb).length;
    const allThree = carbMeals === CHALLENGE_MEALS.length;
    const status: ChallengeDayStatus = future
      ? 'upcoming'
      : allThree
        ? 'done'
        : date === today
          ? 'today'
          : 'missed';
    return {
      date,
      initial: INITIALS[new Date(`${date}T00:00:00Z`).getUTCDay()],
      meals,
      carbMeals,
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
    weekNumber,
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
  log_items: {
    slot: MealSlot;
    quantity: number | string;
    food_portions: {
      carbs_g: number | string | null;
      food_items: { source: string } | null;
    } | null;
  }[];
};

/**
 * The athlete's logs for one programme week, up to and including today.
 *
 * Row level security answers whose: an athlete reads their own rows.
 */
export async function fetchChallengeLogs(
  programmeStartsOn: IsoDate,
  today: IsoDate,
  weekNumber = CARB_CHALLENGE_WEEK
): Promise<ChallengeLog[]> {
  const dates = weekDates(programmeStartsOn, weekNumber);
  const until = today < dates[6] ? today : dates[6];
  if (until < dates[0]) return [];

  const { data, error } = await supabase
    .from('daily_logs')
    .select('log_date, log_items(slot, quantity, food_portions(carbs_g, food_items(source)))')
    .gte('log_date', dates[0])
    .lte('log_date', until)
    .returns<LogRow[]>();

  if (error) throw asError(error);

  return (data ?? []).map((row) => ({
    date: row.log_date,
    items: (row.log_items ?? []).map((item) => {
      const portion = item.food_portions;
      const carbs = portion?.carbs_g;
      return {
        slot: item.slot,
        carbs_g: carbs === null || carbs === undefined ? null : Number(carbs) * Number(item.quantity),
        deckCarbSource: portion?.food_items?.source === DECK_CARB_TABLE,
      };
    }),
  }));
}
