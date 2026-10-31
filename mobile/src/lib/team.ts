import { asError } from './errors';
import { supabase } from './supabase';

/**
 * The team leaderboard.
 *
 * Engagement, not nutrition. The squad is ranked on how consistently each
 * athlete logs and on nothing else -- the brief's rule, in its own words:
 * rank on logging consistency and diet quality, never on body metrics. These
 * are 14 to 16 year olds and a board sorted by weight is a safeguarding
 * failure, so the numbers that would allow one never leave the database.
 *
 * Diet quality, the other axis the brief permits, is absent on purpose:
 * `dq_score` has no formula yet, and ranking minors against each other on a
 * scale the app invented would be worse than ranking them on nothing.
 *
 * A day counts the same way it counts for the streak -- a `daily_logs` row
 * exists -- so the two surfaces can never disagree about whether a day
 * happened.
 */

/** The window the board covers. A week, because the MVP is awarded weekly. */
export const WINDOW_DAYS = 7;

/**
 * The window the player of the month is taken over.
 *
 * Thirty days back from today rather than a calendar month, and the screen
 * says "last 30 days" rather than naming the month. A calendar month would
 * award the badge on the 1st to whoever logged once, and the programme itself
 * runs in weeks, not months.
 */
export const MONTH_DAYS = 30;

/** One athlete's standing, as `team_leaderboard` returns it. */
export type LeaderboardRow = {
  participantCode: string;
  name: string;
  daysLogged: number;
  loggedToday: boolean;
  /** The athlete this device holds, so their own row can be marked. */
  isMe: boolean;
};

export type RankedRow = LeaderboardRow & {
  /**
   * Competition ranking: equal day counts share a position and the next
   * position skips. Two athletes on five days are both second, and nobody is
   * put above the other by a tiebreak the app made up.
   */
  position: number;
};

export type Leaderboard = {
  teamName: string | null;
  rows: RankedRow[];
  /**
   * Who leads the window. Empty when nobody has logged at all, and more than
   * one name when the lead is shared -- a shared week is shared, and breaking
   * it would need a second ranking the app has no honest figure for.
   */
  mvp: string[];
  windowDays: number;
};

/**
 * Rank the rows, highest day count first.
 *
 * Exported so the ranking can be tested without a network, and so the
 * tie rule is testable on its own. The name is the display tiebreak and
 * nothing more: it does not affect position.
 */
export function rank(rows: LeaderboardRow[]): RankedRow[] {
  const sorted = [...rows].sort(
    (a, b) => b.daysLogged - a.daysLogged || a.name.localeCompare(b.name)
  );

  let position = 0;
  let previous: number | null = null;

  return sorted.map((row, i) => {
    if (previous === null || row.daysLogged !== previous) {
      position = i + 1;
      previous = row.daysLogged;
    }
    return { ...row, position };
  });
}

/**
 * The week's MVP: everyone on the top day count.
 *
 * Nobody is MVP for logging nothing, so a week in which the whole squad is on
 * zero awards it to no one rather than to whoever sorts first.
 */
export function mvp(rows: LeaderboardRow[]): string[] {
  const best = Math.max(0, ...rows.map((r) => r.daysLogged));
  if (best === 0) return [];
  return rows
    .filter((r) => r.daysLogged === best)
    .map((r) => r.name)
    .sort((a, b) => a.localeCompare(b));
}

/** The athlete's own row, for the "you are nth" line. Null before a claim. */
export function myRow(rows: RankedRow[]): RankedRow | null {
  return rows.find((r) => r.isMe) ?? null;
}

type LeaderboardRpcRow = {
  participant_code: string;
  name: string;
  days_logged: number;
  logged_today: boolean;
  is_me: boolean;
};

/**
 * Read the board for the window ending `today`.
 *
 * `today` is passed in rather than read here, for the same reason the advice
 * engine takes its clock as an argument: the date that matters is the
 * athlete's Jakarta wall clock, not the server's UTC one, and a function that
 * reads the clock itself cannot be tested against a date.
 *
 * The team name comes from `teams`, which an athlete can read for their own
 * team under row level security -- claiming creates the membership row that
 * lets them. The standings come from an RPC because the logs themselves are
 * fenced off: an athlete cannot read a teammate's `daily_logs`, which is
 * correct, and is why the aggregate is computed in the database.
 */
async function readBoard(today: string, windowDays: number): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .rpc('team_leaderboard', { p_today: today, p_days: windowDays })
    .returns<LeaderboardRpcRow[]>();

  if (error) throw asError(error);

  return (data ?? []).map((r) => ({
    participantCode: r.participant_code,
    name: r.name,
    daysLogged: r.days_logged,
    loggedToday: r.logged_today,
    isMe: r.is_me,
  }));
}

export async function fetchLeaderboard(
  today: string,
  windowDays: number = WINDOW_DAYS
): Promise<Leaderboard> {
  const [team, rows] = await Promise.all([
    supabase.from('teams').select('name').limit(1).maybeSingle(),
    readBoard(today, windowDays),
  ]);

  if (team.error) throw asError(team.error);

  return {
    teamName: team.data?.name ?? null,
    rows: rank(rows),
    mvp: mvp(rows),
    windowDays,
  };
}

/**
 * Who leads a longer window -- the player of the month.
 *
 * The same function over a wider window, because "who has logged most" does
 * not become a different question at thirty days. It reads only the names, so
 * the month costs one RPC rather than a second board.
 */
export async function fetchMvp(today: string, windowDays: number): Promise<string[]> {
  return mvp(await readBoard(today, windowDays));
}
