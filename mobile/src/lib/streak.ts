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

  const days = [...new Set(activeDates.map(toUtcDay))]
    .filter((d) => !Number.isNaN(d) && d <= todayDay)
    .sort((a, b) => b - a);

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
