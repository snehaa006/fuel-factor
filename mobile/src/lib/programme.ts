import { en } from '@/i18n/en';
import type { Strings } from '@/i18n';
import { daysBetween, PROGRAMME_DAYS } from './recall-window';
import type { IsoDate } from './streak';

/**
 * Whether the four weeks have started, and therefore what the app will do.
 *
 * The programme's shape has always been "a baseline, then an intervention,
 * then the post effects" -- "in every research, we have a baseline, and then
 * we have an intervention, and then we see the post effects". The app used to
 * honour only half of that. The recall knew about day one, because the
 * follow-up is counted four weeks from it; everything else opened the moment
 * an athlete joined a squad, whenever that happened to be.
 *
 * That is not a tidier version of the same study. A baseline recall filled on
 * the fourth day of logging is not a baseline, and logged days that fall
 * before the intervention started are days the before-and-after cannot
 * account for. So the date decides:
 *
 *   **Before it** the athlete has one thing to do, which is the three-day
 *   baseline recall. Logging, the ring, the streak, Learn, the leaderboard
 *   and the check-in are all shut, and the screen says when they open.
 *
 *   **From it** the app is the app.
 *
 * Nothing here is stored. The state is derived from the team's date and
 * today's, exactly as the recall window, the streak and the badges are, so
 * there is no flag to drift and no midnight job to flip one.
 */

export type ProgrammeState =
  /**
   * No date on the team. Not the same as "before": nobody knows when it
   * starts, so no countdown can be shown and only the coach can fix it.
   *
   * Teams created from 2 November 2026 cannot be in this state -- the
   * database refuses one without a date. It is the teams that predate that,
   * the seeded squad among them, and the app will not invent a date for them.
   */
  | { status: 'no-date' }
  /** Day one is in the future. The baseline recall is the whole app. */
  | { status: 'before'; startsOn: IsoDate; daysUntil: number }
  /** Day one has arrived or passed. Everything is open. */
  | { status: 'open'; startsOn: IsoDate; day: number; of: number };

export function programmeState(startsOn: IsoDate | null, today: IsoDate): ProgrammeState {
  if (startsOn === null) return { status: 'no-date' };

  const daysUntil = daysBetween(today, startsOn);
  if (daysUntil > 0) return { status: 'before', startsOn, daysUntil };

  // Day one is day one, not day zero: an athlete reads "day 1 of 28" on the
  // morning it starts.
  return { status: 'open', startsOn, day: 1 - daysUntil, of: PROGRAMME_DAYS };
}

/** The last of the 28 days: day one plus 27. */
export function lastProgrammeDay(startsOn: IsoDate): IsoDate {
  return new Date(Date.parse(`${startsOn}T00:00:00Z`) + (PROGRAMME_DAYS - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * The day a "last N days" view should end on.
 *
 * Today while the four weeks run. Once they are over nobody logs any more, so
 * a window ending today would slide, a day at a time, into days that were
 * never going to have a log in them, and a fortnight of real logging would
 * read as a fortnight of nothing. From day 29 the window ends on the
 * programme's last day instead.
 */
export function loggingAsOf(today: IsoDate, startsOn: IsoDate | null): IsoDate {
  if (startsOn === null) return today;
  const last = lastProgrammeDay(startsOn);
  return today > last ? last : today;
}

/**
 * Whether the four weeks are behind the athlete: day 29 onwards.
 *
 * The programme runs 28 days. After the last one there is nothing to log day
 * by day any more -- no meals, no evening check-in, no fact of the day -- and
 * what is left is the follow-up recall and the end-of-programme questions.
 * The state stays 'open' (Learn, Progress and the rest still work); this is
 * the one question every screen asks to know the daily part has ended.
 */
export function programmeOver(
  state: ProgrammeState | null
): state is Extract<ProgrammeState, { status: 'open' }> {
  return state !== null && state.status === 'open' && state.day > state.of;
}

/**
 * Whether the app's own half is open.
 *
 * One function so that every screen asks the same question. A screen that
 * checked `status === 'before'` would let a team with no date through.
 */
export function isProgrammeOpen(state: ProgrammeState): boolean {
  return state.status === 'open';
}

/** What the athlete is told while they wait. */
export function waitingLine(state: ProgrammeState, t: Strings = en): string {
  switch (state.status) {
    case 'no-date':
      return t.programme.noDate;
    case 'before':
      return state.daysUntil === 1
        ? t.programme.tomorrow
        : t.programme.startsIn(state.daysUntil, state.startsOn);
    case 'open':
      return t.programme.dayOf(state.day, state.of);
  }
}
