/**
 * The streak.
 *
 * Engagement, not nutrition. A day counts when the athlete did something in the
 * app that day -- logged a meal, or filled any part of the evening check-in.
 * Deliberately behavioural: it never reads what was eaten, so a bad eating day
 * cannot break a streak, and the loop works while dq_score is still undefined.
 *
 * Derived on read and stored nowhere, so there is no counter to drift out of
 * step with the logs.
 */

/** An ISO date, YYYY-MM-DD, as Postgres hands back a `date` column. */
export type IsoDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDay(iso: IsoDate): number {
  // Parsed as UTC midnight so the arithmetic never crosses a DST boundary.
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? NaN : Math.floor(ms / DAY_MS);
}

function fromUtcDay(day: number): IsoDate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Day numbers the athlete was active, newest first, with the future dropped. */
function activeDayNumbers(activeDates: IsoDate[], todayDay: number): number[] {
  return [...new Set(activeDates.map(toUtcDay))]
    .filter((d) => !Number.isNaN(d) && d <= todayDay)
    .sort((a, b) => b - a);
}

/**
 * Consecutive active days ending today, or yesterday.
 *
 * Yesterday still counts: a streak should not be lost at midnight while the day
 * it belongs to is still being lived. It breaks once a whole day has passed
 * with nothing logged.
 */
export function streakLength(activeDates: IsoDate[], today: IsoDate): number {
  const todayDay = toUtcDay(today);
  if (Number.isNaN(todayDay)) return 0;

  const days = activeDayNumbers(activeDates, todayDay);
  if (days.length === 0) return 0;
  // One grace day, and one only.
  if (days[0] < todayDay - 1) return 0;

  let length = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] !== days[i - 1] - 1) break;
    length += 1;
  }
  return length;
}

/** Whether today itself is already on the board. Drives the flame's lit state. */
export function loggedToday(activeDates: IsoDate[], today: IsoDate): boolean {
  return activeDates.includes(today);
}

/** One cell of the week strip. */
export type StreakDay = {
  date: IsoDate;
  /** Whether the athlete logged something that day. */
  active: boolean;
  isToday: boolean;
  /** Single-letter weekday initial, Sunday first, for the cell's caption. */
  initial: string;
};

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The last `count` days ending today, oldest first.
 *
 * The chip gives the number; this gives the shape of it, which is the part an
 * athlete reads at a glance -- a gap two days back is visible here and
 * invisible in a count. Today is always the last cell, lit or not, so an
 * unlogged day reads as "still open" rather than as a loss.
 */
export function recentDays(activeDates: IsoDate[], today: IsoDate, count = 7): StreakDay[] {
  const todayDay = toUtcDay(today);
  if (Number.isNaN(todayDay) || count < 1) return [];

  const active = new Set(activeDayNumbers(activeDates, todayDay));

  return Array.from({ length: count }, (_, i) => {
    const day = todayDay - (count - 1 - i);
    const date = fromUtcDay(day);
    return {
      date,
      active: active.has(day),
      isToday: day === todayDay,
      initial: WEEKDAY_INITIALS[new Date(`${date}T00:00:00Z`).getUTCDay()],
    };
  });
}

/**
 * The longest run of consecutive active days on record.
 *
 * Shown only when it beats the current streak, so it reads as something to
 * get back to rather than as a reproach on day one.
 */
export function bestStreak(activeDates: IsoDate[], today: IsoDate): number {
  const todayDay = toUtcDay(today);
  if (Number.isNaN(todayDay)) return 0;

  // Oldest first, so a run is a walk forwards through the dates.
  const days = activeDayNumbers(activeDates, todayDay).reverse();
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
