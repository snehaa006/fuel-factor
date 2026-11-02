import { asError, messageOf } from './errors';
import { supabase } from './supabase';

/**
 * The team code half of getting in: who is on a squad, and claiming one.
 *
 * There used to be a `signIn()` here that signed the device in anonymously,
 * on the argument that a squad of 14 to 16 year olds should not carry a
 * credential each. The argument held; the implementation did not.
 *
 * - An anonymous session is one app install's storage. A reinstalled or lost
 *   phone took the claim with it and `claim_participant` then refused the new
 *   device with "already claimed on another device" -- correctly, because
 *   that is exactly what it looked like from the database's side.
 * - Anonymous sign-ins are switched off on this Supabase project and only its
 *   owner can turn them on, so every athlete screen only ever ran against the
 *   fixture. Email and password is on by default.
 *
 * Athletes sign in with an account now (`account.ts`), and the team code kept
 * the job it was always good at: finding the squad and the right name on its
 * roster. Nothing in the database changed for it -- `claim_participant` asks
 * for `auth.uid()` and never cared where the session came from.
 */

export type RosterEntry = {
  participant_code: string;
  name: string;
  claimed: boolean;
};

/** Who is in the team behind this code, and who is still free to claim. */
export async function teamRoster(joinCode: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase.rpc('team_roster', { p_join_code: joinCode });
  if (error) throw asError(error);
  return data ?? [];
}

export class ClaimError extends Error {}

/**
 * Link this device to one athlete.
 *
 * Consent travels with the call rather than being written afterwards, so there
 * is no order of operations in which a device is linked to an athlete before
 * the screen was accepted. The database enforces it, not just this function.
 */
export async function claimParticipant(
  joinCode: string,
  participantCode: string,
  consentAck: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('claim_participant', {
    p_join_code: joinCode,
    p_participant_code: participantCode,
    p_consent_ack: consentAck,
  });

  // The function raises with a sentence meant to be read, so it is shown as-is
  // rather than replaced with something vaguer.
  if (error) throw new ClaimError(messageOf(error));
  return data as string;
}

/** The athlete this device holds, or null if it has not claimed one. */
export async function claimedParticipantId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('participant_profiles')
    .select('participant_id')
    .not('user_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (error) throw asError(error);
  return data?.participant_id ?? null;
}
