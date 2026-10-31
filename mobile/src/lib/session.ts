import { asError } from './errors';
import { supabase } from './supabase';

/**
 * When today's training session was.
 *
 * App tier. The tracker has no session-time column and never sees this; it
 * exists only because two of the programme's advice rules are written against
 * a session -- "2 to 3 hours before training", "refuel within 30 minutes" --
 * and a rule with no clock to measure against cannot fire at all.
 *
 * Times are a local wall clock, held as minutes since midnight, so comparing
 * "is it past the refuel window" is one subtraction and the rules stay pure
 * and testable. Jakarta is UTC+7 with no daylight saving, which is the case
 * this is built for; a session is never compared across a date boundary.
 */

/** Minutes since local midnight. */
export type Minutes = number;

export type TrainingSession = {
  /** Null means the athlete has not said, which is not the same as no session. */
  startsAt: Minutes | null;
  endsAt: Minutes | null;
};

export const NO_SESSION: TrainingSession = { startsAt: null, endsAt: null };

const MINUTES_IN_DAY = 24 * 60;

/** Postgres hands a `time` back as HH:MM:SS. */
export function parseTime(value: string | null): Minutes | null {
  if (value === null) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < MINUTES_IN_DAY ? minutes : null;
}

/** Back to HH:MM:SS for the column. */
export function formatTime(minutes: Minutes | null): string | null {
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** HH:MM, for the screen. */
export function displayTime(minutes: Minutes | null): string {
  if (minutes === null) return '--:--';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The device's wall clock, as minutes since midnight. */
export function nowMinutes(now = new Date()): Minutes {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * What a session looks like after an edit, with the column's own constraint
 * applied here too so the screen never offers to save a row the database will
 * refuse. A start pushed past the end clears the end rather than silently
 * reordering the two: the athlete said when it starts, so that is the value to
 * keep.
 */
export function withStart(session: TrainingSession, startsAt: Minutes | null): TrainingSession {
  const endsAt =
    startsAt !== null && session.endsAt !== null && session.endsAt <= startsAt
      ? null
      : session.endsAt;
  return { startsAt, endsAt };
}

export function withEnd(session: TrainingSession, endsAt: Minutes | null): TrainingSession {
  if (endsAt !== null && session.startsAt !== null && endsAt <= session.startsAt) {
    return session;
  }
  return { ...session, endsAt };
}

/** Whether anything is set. Nothing set means nothing to write. */
export function hasSession(session: TrainingSession): boolean {
  return session.startsAt !== null || session.endsAt !== null;
}

/** Today's session, or nulls when none has been recorded. */
export async function fetchSession(dailyLogId: string): Promise<TrainingSession> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('starts_at, ends_at')
    .eq('daily_log_id', dailyLogId)
    .maybeSingle();

  if (error) throw asError(error);
  if (!data) return NO_SESSION;
  return { startsAt: parseTime(data.starts_at), endsAt: parseTime(data.ends_at) };
}

/**
 * Save the session onto today's log.
 *
 * A session cleared back to nothing deletes the row rather than keeping one of
 * two nulls, so "no session recorded" has exactly one representation.
 */
export async function saveSession(
  dailyLogId: string,
  session: TrainingSession
): Promise<void> {
  if (!hasSession(session)) {
    const { error } = await supabase
      .from('training_sessions')
      .delete()
      .eq('daily_log_id', dailyLogId);
    if (error) throw asError(error);
    return;
  }

  const { error } = await supabase.from('training_sessions').upsert(
    {
      daily_log_id: dailyLogId,
      starts_at: formatTime(session.startsAt),
      ends_at: formatTime(session.endsAt),
    },
    { onConflict: 'daily_log_id' }
  );

  if (error) throw asError(error);
}
