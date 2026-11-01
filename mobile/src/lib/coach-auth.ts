import { asError, messageOf } from './errors';
import { supabase } from './supabase';

/**
 * The coach's account, and the team they own.
 *
 * A coach signs in with an email and a password; the athletes do not. The
 * asymmetry is the same argument read in both directions: a squad of 14 to 16
 * year olds should not carry a credential each, and the adult who owns the
 * squad's data should not be identified by a device. An anonymous session is
 * one app install's storage, so a coach who reinstalls would lose the team
 * they created with no way to prove it was theirs.
 *
 * It is also the half that can be exercised live today. Anonymous sign-ins are
 * still switched off on this project, which blocks the athlete flow entirely;
 * email and password is on by default.
 */

export type CoachTeam = {
  id: string;
  name: string;
  /** The code the squad joins with. Meant to be handed out. */
  joinCode: string;
  /** The code that makes another coach. Never handed out. */
  coachCode: string;
  /** Day one of the four weeks, or null if the coach has not set it. */
  programmeStartsOn: string | null;
  athletes: number;
};

export class CoachAuthError extends Error {}

/**
 * Sign out whatever is here before signing a coach in.
 *
 * A device may already hold an anonymous athlete session, and signing up on
 * top of one risks converting that anonymous user into the coach's account
 * rather than creating a separate one — which would hand the coach an athlete
 * claim and leave the database with two right answers to "which athlete is
 * this". Starting from no session makes the outcome the same every time.
 */
async function clearSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.auth.signOut();
}

/** Create a coach account. Supabase decides whether a confirmation is needed. */
export async function signUpCoach(email: string, password: string): Promise<{ confirmed: boolean }> {
  await clearSession();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw new CoachAuthError(messageOf(error));
  // No session means the project asks for an email confirmation first, which
  // is a setting rather than a failure, so the caller can say so plainly.
  return { confirmed: Boolean(data.session) };
}

export async function signInCoach(email: string, password: string): Promise<void> {
  await clearSession();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new CoachAuthError(messageOf(error));
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw asError(error);
}

/** The signed-in account's email, or null when there is no session. */
export async function currentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

/** Whether this session is an anonymous one rather than a real account. */
export async function isAnonymousSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  // Supabase signs `is_anonymous` into the token itself, so this is the claim
  // the database checks too rather than a second opinion about it.
  return Boolean((data.session.user as { is_anonymous?: boolean }).is_anonymous);
}

function toTeam(row: {
  id: string;
  name: string;
  join_code: string;
  coach_code: string;
  programme_starts_on: string | null;
  athletes?: number;
}): CoachTeam {
  return {
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    coachCode: row.coach_code,
    programmeStartsOn: row.programme_starts_on,
    athletes: row.athletes ?? 0,
  };
}

/**
 * Create a team and become its coach.
 *
 * Both codes are generated in the database rather than chosen here. A coach
 * picking a join code would pick a guessable one, and a guessable join code is
 * a stranger reading a roster of named minors.
 */
export async function createTeam(name: string, startsOn: string | null = null): Promise<CoachTeam> {
  const { data, error } = await supabase.rpc('create_team', {
    p_name: name,
    p_starts_on: startsOn,
  });
  // The function raises sentences meant to be read — "creating a team needs an
  // account with an email" — so they are shown as-is.
  if (error) throw new CoachAuthError(messageOf(error));
  const row = data?.[0];
  if (!row) throw new CoachAuthError('The team was not created.');
  return toTeam(row);
}

/** The team this coach owns, or null if they have not made one yet. */
export async function myTeam(): Promise<CoachTeam | null> {
  const { data, error } = await supabase.rpc('my_team');
  if (error) throw asError(error);
  const row = data?.[0];
  return row ? toTeam(row) : null;
}

/**
 * Set or move day one of the four weeks.
 *
 * The coach's to set, and the app never guesses it. Every recall prompt is
 * derived from this date, so a wrong one is visible and correctable rather
 * than baked into rows.
 */
export async function setProgrammeStart(startsOn: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_programme_start', { p_starts_on: startsOn });
  if (error) throw new CoachAuthError(messageOf(error));
}
