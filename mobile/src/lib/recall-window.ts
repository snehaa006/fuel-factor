import type { IsoDate } from './streak';

/**
 * When the app asks for a recall, and which one.
 *
 * Pure: every input is passed in, nothing is read from the clock or the
 * network. The advice engine learned this the hard way — a default parameter
 * that called an imported function pulled `supabase.ts` into the bundle and
 * rendered Today blank while every test passed.
 *
 * The shape is the programme's, from the 30 October call, and not the app's:
 *
 *   **Three days at baseline, before the programme starts.** "So what we did
 *   initially is we took a three-day recall already. A three-day, so we've
 *   done our baseline. In every research, we have a baseline, and then we have
 *   an intervention, and then we see the post effects."
 *
 *   **Three days again four weeks later.** "Post one month, the app can prompt
 *   the participant to try to fulfill the data again or food recalls." Four
 *   weeks because "nutrition to have an effect, it isn't one or two weeks. A
 *   one month is a good idea of having a post effect."
 *
 *   **Which three days.** "One weekend and two working days, recall is ideal."
 *   That is guidance the form prints, not a rule the app enforces: refusing a
 *   third weekday would lose a day of real data to a preference.
 *
 * Nothing here is derived from a stored flag. Which recall is due is computed
 * from the day numbers that exist and the programme's start date, the same way
 * the streak and the badges are derived on read — so there is no state to
 * drift and no midnight job to run.
 */

/** Days in one recall round. The programme's instrument is a three-day recall. */
export const RECALL_DAYS = 3;

/** The baseline round occupies the sheet's day numbers 1 to 3. */
export const BASELINE_DAYS = [1, 2, 3] as const;

/** The follow-up round continues the same column: 4 to 6. */
export const FOLLOW_UP_DAYS = [4, 5, 6] as const;

/** The programme is four weeks long. The follow-up opens when they are up. */
export const PROGRAMME_WEEKS = 4;
export const PROGRAMME_DAYS = PROGRAMME_WEEKS * 7;

export type RecallRound = 'baseline' | 'follow-up';

export type RecallWindow =
  /**
   * The baseline is not complete. Due immediately and before the programme
   * starts: a baseline collected after the intervention began is not a
   * baseline.
   */
  | {
      status: 'due';
      round: RecallRound;
      /** The sheet's own day_number: 1-3 at baseline, 4-6 at follow-up. Routes and rows use this. */
      dayNumber: number;
      /**
       * Where that day sits inside its own round, 1-based.
       *
       * The two differ for the follow-up and the screens need the second one:
       * day_number 4 is the FIRST of the follow-up's three days, and a card
       * reading "Day 4 of 3" is nonsense to the 14 year old holding it.
       */
      position: number;
      done: number;
      of: number;
    }
  /** The baseline is in and the four weeks are still running. */
  | { status: 'waiting'; opensOn: IsoDate; daysUntil: number }
  /** Both rounds are complete, or there is no programme date to count from. */
  | { status: 'none'; reason: 'complete' | 'no-programme-date' };

/** The day the follow-up round opens: four weeks after day one. */
export function followUpOpensOn(programmeStartsOn: IsoDate): IsoDate {
  return new Date(Date.parse(`${programmeStartsOn}T00:00:00Z`) + PROGRAMME_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Whole days from one date to another, negative when the second is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  );
}

function firstMissing(days: readonly number[], recorded: readonly number[]): number | null {
  return days.find((day) => !recorded.includes(day)) ?? null;
}

/**
 * Where a sheet day number sits inside its own round, 1-based.
 *
 * The tracker numbers recall days continuously -- the baseline is 1 to 3 and
 * the follow-up carries on at 4 -- because they share one unique key per
 * participant. An athlete is only ever doing three days, so every screen
 * counts from 1 and this is what turns one into the other.
 */
export function positionInRound(dayNumber: number): number {
  return (BASELINE_DAYS as readonly number[]).includes(dayNumber)
    ? dayNumber
    : dayNumber - BASELINE_DAYS.length;
}

/**
 * Which recall the app should ask for today.
 *
 * `recordedDays` is the `day_number` of every recall row this athlete has. A
 * row counts as done because it exists, which is the same rule the streak uses
 * for a logged day — the app does not second-guess how full it is.
 */
export function recallWindow(
  recordedDays: readonly number[],
  programmeStartsOn: IsoDate | null,
  today: IsoDate
): RecallWindow {
  const baselineDone = BASELINE_DAYS.filter((day) => recordedDays.includes(day)).length;

  // The baseline comes first and does not wait for a programme date. A squad
  // that has just joined has no start date yet, and the three days are exactly
  // what has to happen before one is set.
  if (baselineDone < RECALL_DAYS) {
    const dayNumber = firstMissing(BASELINE_DAYS, recordedDays);
    if (dayNumber !== null) {
      return {
        status: 'due',
        round: 'baseline',
        dayNumber,
        position: positionInRound(dayNumber),
        done: baselineDone,
        of: RECALL_DAYS,
      };
    }
  }

  // Without a start date there is nothing to count four weeks from, and
  // guessing one would put the follow-up on a date the coach never chose.
  if (programmeStartsOn === null) return { status: 'none', reason: 'no-programme-date' };

  const followUpDone = FOLLOW_UP_DAYS.filter((day) => recordedDays.includes(day)).length;
  if (followUpDone >= RECALL_DAYS) return { status: 'none', reason: 'complete' };

  const opensOn = followUpOpensOn(programmeStartsOn);
  const daysUntil = daysBetween(today, opensOn);
  if (daysUntil > 0) return { status: 'waiting', opensOn, daysUntil };

  const dayNumber = firstMissing(FOLLOW_UP_DAYS, recordedDays);
  if (dayNumber === null) return { status: 'none', reason: 'complete' };
  return {
    status: 'due',
    round: 'follow-up',
    dayNumber,
    position: positionInRound(dayNumber),
    done: followUpDone,
    of: RECALL_DAYS,
  };
}

/** Which round a day number belongs to, for a screen opened directly. */
export function roundOf(dayNumber: number): RecallRound {
  return (BASELINE_DAYS as readonly number[]).includes(dayNumber) ? 'baseline' : 'follow-up';
}

/** How the round is named on screen. */
export const ROUND_LABEL: Record<RecallRound, string> = {
  baseline: 'Before you start',
  'follow-up': 'Four weeks on',
};

/**
 * The programme's own guidance on which days to pick.
 *
 * Printed, never enforced. "One weekend and two working days, recall is
 * ideal."
 */
export const DAY_CHOICE_GUIDANCE =
  'Pick one weekend day and two school days, so the three days are a fair picture of a normal week.';

/**
 * Whether a string is a real calendar date in YYYY-MM-DD.
 *
 * There is no date picker in this project's dependencies, so the coach types
 * the programme's start date. A typed date has to be checked for being a date
 * at all -- '2026-02-31' parses to the 3rd of March, which would silently move
 * the follow-up recall by two days.
 */
export function isIsoDate(text: string): boolean {
  const trimmed = text.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === trimmed;
}
