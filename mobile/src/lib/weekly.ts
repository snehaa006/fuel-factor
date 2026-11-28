import type { ProgrammeState } from './programme';
import type { IsoDate } from './streak';

/**
 * Learn, run week by week -- what was asked for on the 25 November call.
 *
 * Sofia: "can the learning section be in tandem with the week that the
 * athlete is on? Because it has to be customized to that particular week of
 * what he's learning." Theo: a check "before they move on to the next week ...
 * to ensure they actually learn", and "fun facts so they can just read it on
 * the side, so it's not too overwhelming". Sofia again: "maybe it could be a
 * toggle that they can click in, did you know, or fact for the day."
 *
 * **Nothing here writes a word of nutrition.** The fact of the day is one of
 * the week's own statistic cards, figure and caption exactly as the deck
 * prints them. The check is built from the same cards: "which figure goes
 * with this caption" across a card's own figures, and "myth or fact" on the
 * deck's own myth, answered by the deck's own fact. The app supplies the
 * question's frame and the order, never the content or the answer.
 *
 * Pure, and free of the Supabase client, so Today can use it and a test can
 * hold all of it without a network.
 */

const WEEK_COUNT = 4;
const DAYS_PER_WEEK = 7;

function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Which weeks are open

/**
 * Where a week stands for this athlete today.
 *
 * - `current`: the programme is in this week. Learn opens on it.
 * - `past`: done, and still there to re-read. Sneha's "if the current week is
 *   week two, it should show week two" is about what leads, not about taking
 *   week 1 away from somebody who wants to look something up.
 * - `future`: not yet, with the day it opens.
 * - `open`: there is no programme to follow -- a coach, or a squad with no
 *   first day -- so every written week is simply open.
 */
export type WeekAccess =
  | { state: 'current' }
  | { state: 'past' }
  | { state: 'future'; opensOn: IsoDate }
  | { state: 'open' };

/** The programme week today falls in, 1-based; above 4 once it is over; null with no programme. */
export function weekOfProgramme(programme: ProgrammeState | null): number | null {
  if (programme === null || programme.status === 'no-date') return null;
  if (programme.status === 'before') return 0;
  return Math.floor((programme.day - 1) / DAYS_PER_WEEK) + 1;
}

/** Day 1 to 7 of the programme week; null with no programme open. */
export function dayOfWeek(programme: ProgrammeState | null): number | null {
  if (programme === null || programme.status !== 'open') return null;
  return ((programme.day - 1) % DAYS_PER_WEEK) + 1;
}

export function weekAccess(weekNumber: number, programme: ProgrammeState | null): WeekAccess {
  const current = weekOfProgramme(programme);
  if (current === null || programme === null || programme.status === 'no-date') {
    return { state: 'open' };
  }
  if (current > WEEK_COUNT) return { state: 'past' };
  if (weekNumber < current) return { state: 'past' };
  if (weekNumber === current) return { state: 'current' };
  return { state: 'future', opensOn: addDays(programme.startsOn, (weekNumber - 1) * DAYS_PER_WEEK) };
}

/** Whether the athlete may read a week today. */
export function canRead(access: WeekAccess): boolean {
  return access.state !== 'future';
}

// ---------------------------------------------------------------------------
// When to ask

/** The first and last day of a programme week. */
export function weekDates(startsOn: IsoDate, week: number): { from: IsoDate; to: IsoDate } {
  const from = addDays(startsOn, (week - 1) * DAYS_PER_WEEK);
  return { from, to: addDays(from, DAYS_PER_WEEK - 1) };
}

/**
 * Whether a week's check-in can be answered yet: from the week's sixth day,
 * for any week already over, and for every week once the programme is.
 */
export function checkInOpen(week: number, programme: ProgrammeState | null): boolean {
  const current = weekOfProgramme(programme);
  const day = dayOfWeek(programme);
  if (current === null || current < 1) return false;
  if (current > WEEK_COUNT || week < current) return true;
  return week === current && day !== null && day >= 6;
}

/**
 * The week whose check-in Today should offer, or null.
 *
 * Theo's "before they move on to the next week": a week's check-in is offered
 * from its sixth day, and stays on offer through the following week until it
 * is done. Once the programme is over, week 4's waits the same way.
 */
export function weekToCheck(
  programme: ProgrammeState | null,
  done: (week: number) => boolean,
  writtenWeeks: number[]
): number | null {
  const current = weekOfProgramme(programme);
  const day = dayOfWeek(programme);
  if (current === null || current < 1 || day === null) return null;

  const candidates =
    current > WEEK_COUNT
      ? [WEEK_COUNT]
      : day >= 6
        ? [current, current - 1]
        : [current - 1];

  return (
    candidates.find((week) => week >= 1 && writtenWeeks.includes(week) && !done(week)) ?? null
  );
}
