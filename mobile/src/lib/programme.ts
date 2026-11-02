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
export function waitingLine(state: ProgrammeState): string {
  switch (state.status) {
    case 'no-date':
      return 'Your coach has not set the first day of the programme yet.';
    case 'before':
      return state.daysUntil === 1
        ? 'The programme starts tomorrow.'
        : `The programme starts in ${state.daysUntil} days, on ${state.startsOn}.`;
    case 'open':
      return `Day ${state.day} of ${state.of}.`;
  }
}
