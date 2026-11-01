import { messageOf } from './errors';
import { normaliseCode } from './invite';
import { supabase } from './supabase';

/**
 * The questionnaire a new athlete fills when they open an invite link.
 *
 * Every question here is a column of the PARTICIPANTS sheet and there are no
 * others, which is the same discipline the evening check-in follows for the
 * DAILY LOG sheet. The dietitian described this screen on the 30 October call:
 * "if a participant gets into the app, he'll have to fill in his height,
 * weight, and certain parameters."
 *
 * Two of the sheet's columns are not asked here:
 *
 *   **ID** is generated in the database, never typed. A joiner who typed
 *   'T-01' would be typing Theo's real row.
 *
 * and one is asked carefully:
 *
 *   **Consent Signed?** means a parental consent form was signed on paper. The
 *   question asks *about* that form rather than being it. The app's own gate
 *   stays separate and still writes `consent_ack_at`, because a checkbox in an
 *   app is not a signed form and recording one as the other would put an app
 *   event into the study's record dressed as a collected fact.
 *
 * Only the name is required. Every measurement may be left blank and stays
 * null: a 14 year old guessing at their calf circumference is worse data than
 * no figure at all, and the research team measures these properly.
 */

export type MeasurementField = 'height_cm' | 'weight_kg' | 'waist_cm' | 'muac_cm' | 'calf_cm';

export type Questionnaire = {
  name: string;
  sport: string;
  ageBand: string | null;
  measurements: Partial<Record<MeasurementField, number | null>>;
  /** Whether a parent or guardian has signed the programme's paper form. */
  consentSigned: boolean;
  parentContact: string;
  notes: string;
};

export const EMPTY_QUESTIONNAIRE: Questionnaire = {
  name: '',
  // The programme is football only — locked decision 6 of the brief, because
  // basketball's 40-45 minutes is not football's 90. Editable, because the
  // sheet's column is free text.
  sport: 'Football',
  ageBand: null,
  measurements: {},
  consentSigned: false,
  parentContact: '',
  notes: '',
};

/**
 * The measurement questions, in the sheet's own order.
 *
 * `optional` is on all five and says so on screen. The bounds are the ones the
 * database refuses outright — the range in which a figure is a human
 * measurement at all. Nothing grades a value inside them, and no target sits
 * beside any of them, because the programme has set none.
 */
export const MEASUREMENTS: {
  field: MeasurementField;
  label: string;
  unit: string;
  hint?: string;
  min: number;
  max: number;
}[] = [
  { field: 'height_cm', label: 'Height', unit: 'cm', min: 100, max: 250 },
  { field: 'weight_kg', label: 'Weight', unit: 'kg', min: 20, max: 200 },
  { field: 'waist_cm', label: 'Waist', unit: 'cm', min: 20, max: 200 },
  {
    field: 'muac_cm',
    label: 'Mid-upper arm',
    unit: 'cm',
    hint: 'Around the widest part of your upper arm.',
    min: 10,
    max: 80,
  },
  { field: 'calf_cm', label: 'Calf', unit: 'cm', hint: 'Around the widest part.', min: 10, max: 80 },
];

/**
 * The age groupings offered for the sheet's `age_band` column.
 *
 * The column is text and the only value the tracker holds is '14-16', which is
 * the study arm. The neighbours are here so somebody outside that band can
 * answer honestly rather than picking the only option on screen.
 */
export const AGE_BANDS = ['13 or under', '14-16', '17-18', '19 or over'] as const;

/** A blank measurement stays null. Not answered is not the same as zero. */
export function parseMeasurement(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 10) / 10;
}

/**
 * What is wrong with this questionnaire, in words an athlete can act on.
 *
 * An out-of-range measurement is reported rather than silently clamped: a
 * height of 1760 is a units mistake, and quietly storing 250 would put a
 * wrong figure in a research table instead of asking.
 */
export function problemsWith(form: Questionnaire): string[] {
  const problems: string[] = [];
  if (form.name.trim() === '') problems.push('Your name is needed.');

  for (const m of MEASUREMENTS) {
    const value = form.measurements[m.field];
    if (value === null || value === undefined) continue;
    if (value < m.min || value > m.max) {
      problems.push(`${m.label} should be in ${m.unit}, between ${m.min} and ${m.max}.`);
    }
  }
  return problems;
}

export type TeamSummary = { name: string; programmeStartsOn: string | null };

/**
 * Which team an invite code belongs to.
 *
 * The landing screen has to name the squad before it asks a 14 year old for
 * their measurements. It returns a name and nothing else — deliberately not
 * the roster, which is a list of named minors.
 */
export async function teamByCode(joinCode: string): Promise<TeamSummary | null> {
  const { data, error } = await supabase.rpc('team_by_code', {
    p_join_code: normaliseCode(joinCode),
  });
  if (error) throw new JoinError(messageOf(error));
  const row = data?.[0];
  return row ? { name: row.name, programmeStartsOn: row.programme_starts_on } : null;
}

export class JoinError extends Error {}

/**
 * Join a team, creating this athlete's participant row.
 *
 * Consent travels with the call rather than being written afterwards, so there
 * is no ordering in which a row exists before the screen was accepted — the
 * same contract `claimParticipant` has, enforced in the database either way.
 */
export async function joinTeam(
  joinCode: string,
  form: Questionnaire,
  consentAck: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('join_team', {
    p_join_code: normaliseCode(joinCode),
    p_name: form.name.trim(),
    p_consent_ack: consentAck,
    p_sport: form.sport.trim() || null,
    p_age_band: form.ageBand,
    p_height_cm: form.measurements.height_cm ?? null,
    p_weight_kg: form.measurements.weight_kg ?? null,
    p_waist_cm: form.measurements.waist_cm ?? null,
    p_muac_cm: form.measurements.muac_cm ?? null,
    p_calf_cm: form.measurements.calf_cm ?? null,
    p_consent_signed: form.consentSigned,
    p_parent_contact: form.parentContact.trim() || null,
    p_notes: form.notes.trim() || null,
  });

  if (error) throw new JoinError(messageOf(error));
  return data as string;
}
