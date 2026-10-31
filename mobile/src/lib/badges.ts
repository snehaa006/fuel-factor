import { asError } from './errors';
import { bestStreak, type IsoDate } from './streak';
import { supabase } from './supabase';
import type { Enums, Tables } from './database.types';

/**
 * Badges.
 *
 * Engagement, and the app's own: Theo asked for them and the research records
 * nothing like them. Every criterion counts what the athlete did in the app
 * and never what they ate -- not only because these are minors, but because a
 * badge for eating well would need a definition of eating well, and the
 * programme has not written one. A badge for logging ten days needs nothing
 * from anybody.
 *
 * Definitions are rows, so renaming a badge or moving a threshold is Theo's
 * to do without a deployment. Awards are derived on read, like the streak, so
 * there is no awards table to drift out of step with the logs.
 */

export type BadgeCriterion = Enums<'badge_criterion'>;

export type Badge = Pick<
  Tables<'badges'>,
  'id' | 'code' | 'name' | 'description' | 'criterion' | 'threshold' | 'position'
>;

/** Everything a criterion can be measured against. All behavioural. */
export type AthleteStats = {
  /** Distinct days with a log, ever. */
  daysLogged: number;
  /** The longest run of consecutive logged days on record. */
  bestStreak: number;
  /** Weekly challenges marked done, counted once per challenge. */
  challengesDone: number;
};

export type EarnedBadge = Badge & {
  earned: boolean;
  /** Where the athlete is against the threshold, so a locked badge reads as a target. */
  progress: number;
};

export const NO_STATS: AthleteStats = { daysLogged: 0, bestStreak: 0, challengesDone: 0 };

/** The stat a criterion is measured on. */
export function valueFor(stats: AthleteStats, criterion: BadgeCriterion): number {
  switch (criterion) {
    case 'days_logged':
      return stats.daysLogged;
    case 'streak':
      return stats.bestStreak;
    case 'challenges_done':
      return stats.challengesDone;
  }
}

/**
 * Which badges this athlete has, in the ladder's own order.
 *
 * Kept in seeded order rather than sorted with the earned ones first: the set
 * is a progression, and seeing the next rung directly under the last one you
 * cleared is the point of showing locked badges at all.
 */
export function award(badges: Badge[], stats: AthleteStats): EarnedBadge[] {
  return [...badges]
    .sort((a, b) => a.position - b.position)
    .map((badge) => {
      const progress = valueFor(stats, badge.criterion);
      return { ...badge, progress, earned: progress >= badge.threshold };
    });
}

/** How many of a set have been earned, for the "3 of 7" caption. */
export function earnedCount(badges: EarnedBadge[]): number {
  return badges.filter((b) => b.earned).length;
}

export async function fetchBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('id, code, name, description, criterion, threshold, position');

  if (error) throw asError(error);
  return data ?? [];
}

/**
 * The athlete's own figures.
 *
 * Every read here is of the athlete's own rows, so row level security answers
 * it without a function: unlike the leaderboard, a badge is nobody else's
 * business and needs no hole in the wall.
 */
export async function fetchStats(today: IsoDate): Promise<AthleteStats> {
  const [logs, completions] = await Promise.all([
    supabase.from('daily_logs').select('log_date'),
    supabase.from('challenge_completions').select('challenge_id'),
  ]);

  if (logs.error) throw asError(logs.error);
  if (completions.error) throw asError(completions.error);

  const dates: IsoDate[] = (logs.data ?? []).map((row) => row.log_date);

  return {
    daysLogged: new Set(dates).size,
    bestStreak: bestStreak(dates, today),
    // Counted once per challenge: finishing week 1's challenge on three
    // separate days is one challenge done, not three.
    challengesDone: new Set((completions.data ?? []).map((c) => c.challenge_id)).size,
  };
}
