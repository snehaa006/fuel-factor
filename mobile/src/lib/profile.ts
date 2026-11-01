import { currentEmail, myTeam, type CoachTeam } from './coach-auth';
import { asError } from './errors';
import { supabase } from './supabase';
import type { Tables } from './database.types';

/**
 * Who this device is signed in as.
 *
 * Two shapes, because there are two kinds of user and they share almost
 * nothing: an athlete is a participant row claimed by a device, a coach is an
 * account that owns a team. A single merged profile would have a null half on
 * every screen that drew it.
 *
 * **The athlete's measurements are shown and not editable here.** They are
 * PARTICIPANTS columns, and for the three seeded footballers they are figures
 * the research team measured with a tape and recorded disagreements about
 * across two tabs. A text field on this screen would let a 14 year old
 * overwrite a measurement with a guess, and the carbohydrate band on Today is
 * computed from the weight — so the band would quietly start answering to a
 * self-report. A joiner enters their own figures once, in the questionnaire,
 * where there is nothing to overwrite.
 */

export type AthleteProfile = {
  kind: 'athlete';
  participantId: string;
  participantCode: string;
  name: string;
  teamName: string | null;
  joinCode: string | null;
  sport: string | null;
  ageBand: string | null;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  muacCm: number | null;
  calfCm: number | null;
  /** The programme's paper form, as reported on the PARTICIPANTS sheet. */
  consentSigned: boolean;
  /** When the app's own under-18 screen was accepted. Not the paper form. */
  consentAckAt: string | null;
  programmeStartsOn: string | null;
};

export type CoachProfile = {
  kind: 'coach';
  email: string | null;
  team: CoachTeam | null;
};

export type Profile = AthleteProfile | CoachProfile;

/**
 * The profile for whoever is signed in, or null when nobody is.
 *
 * Which athlete is never a parameter: row level security answers that from the
 * session, exactly as `fetchToday` does, so a caller cannot ask about someone
 * else.
 */
export async function fetchProfile(): Promise<Profile | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;

  const { data: profileRow, error: profileError } = await supabase
    .from('participant_profiles')
    .select('participant_id, team_id, consent_ack_at')
    .not('user_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (profileError) throw asError(profileError);

  // No claimed athlete: either a coach, or a session that has not been through
  // the gate. A coach has a team; the gate's own screens handle the rest.
  if (!profileRow) {
    const [email, team] = await Promise.all([currentEmail(), myTeam().catch(() => null)]);
    return { kind: 'coach', email, team };
  }

  const [participantResult, teamResult] = await Promise.all([
    supabase
      .from('participants')
      .select('*')
      .eq('id', profileRow.participant_id)
      .maybeSingle(),
    profileRow.team_id
      ? supabase
          .from('teams')
          .select('name, join_code, programme_starts_on')
          .eq('id', profileRow.team_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (participantResult.error) throw asError(participantResult.error);
  if (teamResult.error) throw asError(teamResult.error);
  if (!participantResult.data) return null;

  const p = participantResult.data as Tables<'participants'>;
  const team = teamResult.data as Pick<
    Tables<'teams'>,
    'name' | 'join_code' | 'programme_starts_on'
  > | null;

  return {
    kind: 'athlete',
    participantId: p.id,
    participantCode: p.participant_code,
    name: p.name,
    teamName: team?.name ?? null,
    joinCode: team?.join_code ?? null,
    sport: p.sport,
    ageBand: p.age_band,
    heightCm: p.height_cm,
    weightKg: p.weight_kg,
    waistCm: p.waist_cm,
    muacCm: p.muac_cm,
    calfCm: p.calf_cm,
    consentSigned: p.consent_signed,
    consentAckAt: profileRow.consent_ack_at,
    programmeStartsOn: team?.programme_starts_on ?? null,
  };
}

/** The measurement rows on the athlete's profile, in the sheet's order. */
export function measurementsOf(
  profile: AthleteProfile
): { label: string; value: string }[] {
  const show = (value: number | null, unit: string) =>
    value === null ? 'Not measured' : `${value} ${unit}`;

  return [
    { label: 'Height', value: show(profile.heightCm, 'cm') },
    { label: 'Weight', value: show(profile.weightKg, 'kg') },
    { label: 'Waist', value: show(profile.waistCm, 'cm') },
    { label: 'Mid-upper arm', value: show(profile.muacCm, 'cm') },
    { label: 'Calf', value: show(profile.calfCm, 'cm') },
  ];
}
