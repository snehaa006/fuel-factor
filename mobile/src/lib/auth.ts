import { asError, messageOf } from './errors';
import { supabase } from './supabase';

export type RosterEntry = {
  participant_code: string;
  name: string;
  claimed: boolean;
};

/**
 * Sign this device in.
 *
 * Anonymous, because the athletes are 14 to 16 and a squad does not want a
 * password each. Identity comes from the team code and the athlete they claim;
 * the session only exists so row level security has a user to answer about.
 *
 * Returns null if the project has anonymous sign-ins switched off, which is a
 * setting rather than a failure, so the caller can say so plainly.
 */
export async function signIn(): Promise<string | null> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    if (error.code === 'anonymous_provider_disabled') return null;
    throw asError(error);
  }
  return data.session?.user.id ?? null;
}

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
