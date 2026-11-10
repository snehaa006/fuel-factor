import { claimedParticipantId } from './auth';
import { isCoach } from './coach';
import { messageOf } from './errors';
import { supabase } from './supabase';
import { EMAIL_REDIRECT_URL } from './supabase-config';

/**
 * Who is signed in, and as what.
 *
 * Every screen in this app used to answer that question for itself, and the
 * answers disagreed. `useToday` asked "is there a session, and does it see a
 * participant row"; `useCoach` asked "is there a coach membership"; the root
 * route asked neither and rendered the athlete's day to whoever opened it. A
 * coach therefore landed on an athlete's Today screen, because a coach *can*
 * read their squad's participant rows -- `can_see_participant` is true for
 * every athlete they coach -- so "I can see a participant row" never meant
 * "I am that athlete". One resolver, checked in one order, instead.
 *
 * The order is the fix: coach first, athlete second. A session that holds a
 * coach membership is a coach even though it can see participants, and only a
 * session with no coach membership is asked which athlete it claimed.
 *
 * ## Athletes have accounts now
 *
 * They did not. Identity came from an anonymous session plus a team code, on
 * the argument that a squad of 14 to 16 year olds should not carry a
 * credential each. That argument is still a real one and the team code has not
 * gone anywhere -- it is still how an athlete finds their squad and their name
 * on the roster. What has changed is what the session underneath it is:
 *
 * - An anonymous session is one app install's storage. A reinstalled or lost
 *   phone took the athlete's claim with it, and `claim_participant` would then
 *   refuse the new device with "already claimed on another device", because
 *   from the database's side that is exactly what it looked like.
 * - Anonymous sign-ins are switched off on this Supabase project and only the
 *   project owner can turn them on. Every athlete screen has therefore only
 *   ever run against the fixture. Email and password is on by default, so the
 *   athlete half works today instead of after a dashboard change nobody here
 *   can make.
 *
 * The database needed nothing for this. `claim_participant` asks for
 * `auth.uid()` and never cared where the session came from; only `create_team`
 * refuses an anonymous one.
 */

export type Account =
  | { role: 'signed-out' }
  /** A coach account. Never shown an athlete's day. */
  | { role: 'coach'; email: string | null }
  /** Signed in, claimed an athlete. The only role the athlete app serves. */
  | { role: 'athlete'; participantId: string; email: string | null }
  /** Signed in, but neither a coach nor linked to an athlete yet: the gate. */
  | { role: 'unlinked'; email: string | null };

export class AccountError extends Error {}

/** Normalised the same way on sign-up and sign-in, so the two always match. */
function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sign out whatever is here first.
 *
 * Shared with the coach side and for the same reason: signing up on top of an
 * anonymous session converts that anonymous user into the new account rather
 * than creating one, which would hand the new account whatever the anonymous
 * device had already claimed.
 */
async function clearSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.auth.signOut();
}

/**
 * Create an athlete account. Supabase decides whether a confirmation is needed.
 *
 * `emailRedirectTo` is where the confirmation link lands. Without it the link
 * goes to the project's Site URL, which was `localhost:3000` -- a page that
 * exists on one laptop and on no phone, so confirming an account from a phone
 * simply failed. See `EMAIL_REDIRECT_URL` for the half of this that lives in
 * the Supabase dashboard rather than here.
 */
export async function signUpAthlete(
  email: string,
  password: string
): Promise<{ confirmed: boolean }> {
  await clearSession();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail(email),
    password,
    options: { emailRedirectTo: EMAIL_REDIRECT_URL },
  });
  if (error) throw new AccountError(messageOf(error));
  // No session means the project asks for an email confirmation first, which
  // is a setting rather than a failure, so the caller can say so plainly.
  return { confirmed: Boolean(data.session) };
}

export async function signInAthlete(email: string, password: string): Promise<void> {
  await clearSession();
  const { error } = await supabase.auth.signInWithPassword({
    email: cleanEmail(email),
    password,
  });
  if (error) throw new AccountError(messageOf(error));
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AccountError(messageOf(error));
}

/**
 * The one answer to "who is this".
 *
 * Coach before athlete, for the reason at the top of this file. Both reads are
 * cheap and the second is skipped for a coach, so this is one round trip for a
 * coach and two for an athlete.
 */
export async function resolveAccount(): Promise<Account> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { role: 'signed-out' };

  const email = session.user.email ?? null;

  if (await isCoach()) return { role: 'coach', email };

  const participantId = await claimedParticipantId();
  return participantId ? { role: 'athlete', participantId, email } : { role: 'unlinked', email };
}
