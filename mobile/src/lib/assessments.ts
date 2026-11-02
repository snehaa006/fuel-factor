import { asError } from './errors';
import type { ProgrammeState } from './programme';
import { supabase } from './supabase';

/**
 * The ASSESSMENTS and COMPARISON tabs of the research tracker, in the app.
 *
 * The tracker records every measure twice: at baseline (Week 0) and at
 * follow-up (Week 4), with "Δ = Post minus Pre" beside each pair. The
 * `assessments` table already holds exactly that shape -- one row per
 * participant per measure, `pre_value` and `post_value` -- so this file is
 * the catalogue of measures the sheet lists, the arithmetic it asks for, and
 * the reads and writes.
 *
 * The measure names are the sheet's own, character for character, because
 * they are the key the rows are stored under and the export is read against
 * the workbook. The one exception is the Cooper run: two rows were seeded as
 * "Cooper 12-min run" before this form existed, and renaming them would orphan
 * the two baselines the programme actually has.
 */

export type Phase = 'pre' | 'post';

export const PHASE_LABEL: Record<Phase, string> = {
  pre: 'Week 0',
  post: 'Week 4',
};

export type Derivation = { from: string[]; how: 'mean' | 'max' };

export type MeasureDef = {
  /** Stable id for the screen and tests. */
  key: string;
  /** Stored in `assessments.domain`. */
  domain: string;
  /** Stored in `assessments.measure`. The sheet's wording. */
  measure: string;
  /** What the form prints. */
  label: string;
  unit: string | null;
  /** Inclusive bounds a typed value must sit inside. */
  min: number;
  max: number;
  /** Computed from other measures rather than typed. */
  derived?: Derivation;
};

export type DomainDef = { domain: string; label: string; measures: MeasureDef[] };

const m = (
  key: string,
  domain: string,
  measure: string,
  label: string,
  unit: string | null,
  min: number,
  max: number,
  derived?: Derivation
): MeasureDef => ({ key, domain, measure, label, unit, min, max, derived });

/** In the sheet's order, domain by domain. */
export const DOMAINS: DomainDef[] = [
  {
    domain: 'ANTHROPOMETRY',
    label: 'Anthropometry',
    measures: [
      m('height', 'ANTHROPOMETRY', 'Height', 'Height', 'cm', 100, 230),
      m('weight', 'ANTHROPOMETRY', 'Body Weight (pre-training)', 'Body weight (pre-training)', 'kg', 25, 200),
      m('waist', 'ANTHROPOMETRY', 'Waist Circumference', 'Waist circumference', 'cm', 40, 150),
      m('muac', 'ANTHROPOMETRY', 'MUAC (Mid-Upper Arm)', 'MUAC (mid-upper arm)', 'cm', 10, 60),
      m('calf', 'ANTHROPOMETRY', 'Calf Circumference', 'Calf circumference', 'cm', 15, 70),
    ],
  },
  {
    domain: 'AEROBIC',
    label: 'Aerobic',
    measures: [m('cooper', 'AEROBIC', 'Cooper 12-min run', 'Cooper run distance', 'm', 500, 5000)],
  },
  {
    domain: 'SPEED',
    label: 'Speed',
    measures: [
      m('sprint1', 'SPEED', '30m Sprint - Attempt 1', '30 m sprint, attempt 1', 's', 2, 15),
      m('sprint2', 'SPEED', '30m Sprint - Attempt 2', '30 m sprint, attempt 2', 's', 2, 15),
      m('sprint3', 'SPEED', '30m Sprint - Attempt 3', '30 m sprint, attempt 3', 's', 2, 15),
      m('sprintAvg', 'SPEED', '30m Sprint - Average', '30 m sprint, average', 's', 2, 15, {
        from: ['sprint1', 'sprint2', 'sprint3'],
        how: 'mean',
      }),
    ],
  },
  {
    domain: 'POWER',
    label: 'Power',
    measures: [
      m('jump1', 'POWER', 'Vertical Jump - Attempt 1', 'Vertical jump, attempt 1', 'cm', 5, 120),
      m('jump2', 'POWER', 'Vertical Jump - Attempt 2', 'Vertical jump, attempt 2', 'cm', 5, 120),
      m('jump3', 'POWER', 'Vertical Jump - Attempt 3', 'Vertical jump, attempt 3', 'cm', 5, 120),
      m('jumpBest', 'POWER', 'Vertical Jump - Best', 'Vertical jump, best', 'cm', 5, 120, {
        from: ['jump1', 'jump2', 'jump3'],
        how: 'max',
      }),
    ],
  },
  {
    domain: 'CARDIOVASCULAR',
    label: 'Cardiovascular',
    measures: [
      m('hr1', 'CARDIOVASCULAR', 'Resting HR - Day 1', 'Resting heart rate, day 1', 'bpm', 30, 140),
      m('hr2', 'CARDIOVASCULAR', 'Resting HR - Day 2', 'Resting heart rate, day 2', 'bpm', 30, 140),
      m('hr3', 'CARDIOVASCULAR', 'Resting HR - Day 3', 'Resting heart rate, day 3', 'bpm', 30, 140),
      m('hrAvg', 'CARDIOVASCULAR', 'Resting HR - Average', 'Resting heart rate, average', 'bpm', 30, 140, {
        from: ['hr1', 'hr2', 'hr3'],
        how: 'mean',
      }),
    ],
  },
  {
    domain: 'DIETARY',
    label: 'Dietary (3-day average)',
    measures: [
      m('kcal', 'DIETARY', 'Average Daily Calories', 'Average daily calories', 'kcal', 0, 10000),
      m('carbs', 'DIETARY', 'Average Carbohydrates', 'Average carbohydrates', 'g/day', 0, 1500),
      m('protein', 'DIETARY', 'Average Protein', 'Average protein', 'g/day', 0, 600),
      m('fat', 'DIETARY', 'Average Fat', 'Average fat', 'g/day', 0, 500),
      m('breakfast', 'DIETARY', 'Breakfast Frequency', 'Breakfast frequency', 'days/3', 0, 3),
      m('fv', 'DIETARY', 'F & V Servings/Day', 'Fruit & veg servings a day', 'servings', 0, 30),
      m('fluid', 'DIETARY', 'Average Fluid Intake', 'Average fluid intake', 'mL/day', 0, 10000),
    ],
  },
  {
    domain: 'SUBJECTIVE',
    label: 'Subjective (3-day average)',
    measures: [
      m('energyAm', 'SUBJECTIVE', 'Morning Energy', 'Morning energy', '1 to 10', 1, 10),
      m('energyTraining', 'SUBJECTIVE', 'Training Energy', 'Training energy', '1 to 10', 1, 10),
      m('recovery', 'SUBJECTIVE', 'Recovery', 'Recovery', '1 to 10', 1, 10),
      m('mood', 'SUBJECTIVE', 'Mood / Motivation', 'Mood / motivation', '1 to 10', 1, 10),
      m('concentration', 'SUBJECTIVE', 'Concentration', 'Concentration', '1 to 10', 1, 10),
    ],
  },
  {
    domain: 'HYDRATION',
    label: 'Hydration',
    measures: [m('urine', 'HYDRATION', 'Average Urine Colour', 'Average urine colour', '1 to 8', 1, 8)],
  },
];

export const MEASURES: MeasureDef[] = DOMAINS.flatMap((d) => d.measures);

const BY_KEY: Record<string, MeasureDef> = Object.fromEntries(MEASURES.map((d) => [d.key, d]));

export function measureByKey(key: string): MeasureDef {
  const def = BY_KEY[key];
  if (!def) throw new Error(`unknown measure ${key}`);
  return def;
}

/**
 * The COMPARISON tab's rows, in its order.
 *
 * The tab's aerobic row says "Yo-Yo IR1 / Beep Test Level", but the test the
 * programme actually ran and recorded on ASSESSMENTS is the Cooper run, so
 * that is what the row compares.
 */
export type ComparisonRow = { key: string; domain: string; label: string; note?: string };

export const COMPARISON_ROWS: ComparisonRow[] = [
  { key: 'weight', domain: 'Anthropometry', label: 'Body weight (kg)' },
  { key: 'waist', domain: 'Anthropometry', label: 'Waist circumference (cm)' },
  { key: 'muac', domain: 'Anthropometry', label: 'MUAC (cm)' },
  { key: 'cooper', domain: 'Aerobic', label: 'Cooper run distance (m)' },
  { key: 'sprintAvg', domain: 'Speed', label: '30 m sprint avg (s)', note: '− = faster' },
  { key: 'jumpBest', domain: 'Power', label: 'Vertical jump best (cm)' },
  { key: 'hrAvg', domain: 'Cardiovascular', label: 'Resting heart rate (bpm)' },
  { key: 'kcal', domain: 'Dietary', label: 'Daily calories (kcal)' },
  { key: 'carbs', domain: 'Dietary', label: 'Carbohydrates (g/day)' },
  { key: 'protein', domain: 'Dietary', label: 'Protein (g/day)' },
  { key: 'breakfast', domain: 'Dietary', label: 'Breakfast frequency (days/3)' },
  { key: 'fv', domain: 'Dietary', label: 'Fruit & veg servings/day' },
  { key: 'fluid', domain: 'Dietary', label: 'Fluid intake (mL/day)' },
  { key: 'energyAm', domain: 'Subjective', label: 'Morning energy (1-10)' },
  { key: 'energyTraining', domain: 'Subjective', label: 'Training energy (1-10)' },
  { key: 'recovery', domain: 'Subjective', label: 'Recovery (1-10)' },
  { key: 'mood', domain: 'Subjective', label: 'Mood / motivation (1-10)' },
  { key: 'concentration', domain: 'Subjective', label: 'Concentration (1-10)' },
];

/** One participant's figures, keyed by measure key. Absent means not recorded. */
export type PairValues = Record<string, { pre: number | null; post: number | null }>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Δ = Post minus Pre, as the sheet defines it. Null when either end is
 * missing: a missing value is never read as zero.
 */
export function delta(pre: number | null, post: number | null): number | null {
  if (pre === null || post === null) return null;
  return round2(post - pre);
}

/** The Δ as printed: signed, so "+3" and "-0.2" read the way the sheet does. */
export function formatDelta(value: number | null): string {
  if (value === null) return '—';
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `${value}`;
}

export function formatValue(value: number | null): string {
  return value === null ? '—' : `${value}`;
}

/** A derived figure from the typed ones, or null when none were typed. */
export function derive(how: Derivation['how'], values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (present.length === 0) return null;
  if (how === 'max') return Math.max(...present);
  return round2(present.reduce((a, b) => a + b, 0) / present.length);
}

/** Fill every derived measure for one phase from the typed measures. */
export function withDerived(values: Record<string, number | null>): Record<string, number | null> {
  const out = { ...values };
  for (const def of MEASURES) {
    if (def.derived) {
      out[def.key] = derive(
        def.derived.how,
        def.derived.from.map((k) => out[k] ?? null)
      );
    }
  }
  return out;
}

/** One phase's values out of the pair table. */
export function phaseValues(pairs: PairValues, phase: Phase): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const def of MEASURES) out[def.key] = pairs[def.key]?.[phase] ?? null;
  return out;
}

export type ParseResult = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Read what was typed into a field.
 *
 * Empty is a real answer (not measured) and comes back as null. A comma is
 * taken as a decimal point, because half the squad types "12,4".
 */
export function parseEntry(text: string, def: MeasureDef): ParseResult {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return { ok: true, value: null };
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error: 'Enter a number.' };
  const value = Number(trimmed);
  if (value < def.min || value > def.max) {
    return { ok: false, error: `Between ${def.min} and ${def.max}${def.unit ? ` ${def.unit}` : ''}.` };
  }
  return { ok: true, value: round2(value) };
}

/**
 * Which forms are open.
 *
 * Week 0 is the baseline and is open from the start. Week 4 is the follow-up
 * and opens on the first day of the programme's fourth week -- except while
 * `OPEN_BOTH_FOR_TESTING` is on, which opens both from day one so the whole
 * flow can be tried without waiting a month. Turn it off before the real
 * programme runs.
 */
export const OPEN_BOTH_FOR_TESTING = true;

/** Day 22 is the first day of week 4. */
export const WEEK_4_OPENS_ON_DAY = 22;

export type PhaseAccess = { open: true } | { open: false; reason: string };

export function phaseAccess(
  phase: Phase,
  programme: ProgrammeState | null,
  testing: boolean = OPEN_BOTH_FOR_TESTING
): PhaseAccess {
  if (phase === 'pre' || testing) return { open: true };
  if (programme === null || programme.status === 'no-date') {
    return { open: false, reason: 'Week 4 opens in the programme’s fourth week. No start date is set yet.' };
  }
  if (programme.status === 'before') {
    return { open: false, reason: `Week 4 opens in the programme’s fourth week. The programme starts on ${programme.startsOn}.` };
  }
  if (programme.day < WEEK_4_OPENS_ON_DAY) {
    const days = WEEK_4_OPENS_ON_DAY - programme.day;
    return { open: false, reason: `Week 4 opens in ${days} day${days === 1 ? '' : 's'}.` };
  }
  return { open: true };
}

// ---------------------------------------------------------------------------
// Reads and writes

type Row = {
  participant_id: string;
  domain: string;
  measure: string;
  pre_value: number | null;
  post_value: number | null;
};

const KEY_BY_STORED: Record<string, string> = Object.fromEntries(
  MEASURES.map((d) => [`${d.domain}|${d.measure}`, d.key])
);

/** Rows into per-participant pair tables. Rows the catalogue does not know are left out. */
export function toPairs(rows: Row[]): Record<string, PairValues> {
  const out: Record<string, PairValues> = {};
  for (const row of rows) {
    const key = KEY_BY_STORED[`${row.domain}|${row.measure}`];
    if (!key) continue;
    const table = (out[row.participant_id] ??= {});
    table[key] = {
      pre: row.pre_value === null ? null : Number(row.pre_value),
      post: row.post_value === null ? null : Number(row.post_value),
    };
  }
  return out;
}

/** Every assessment row this account can see; RLS decides whose. */
export async function fetchAssessments(participantIds?: string[]): Promise<Record<string, PairValues>> {
  let query = supabase
    .from('assessments')
    .select('participant_id, domain, measure, pre_value, post_value');
  if (participantIds) query = query.in('participant_id', participantIds);
  const { data, error } = await query;
  if (error) throw asError(error);
  return toPairs((data ?? []) as Row[]);
}

/**
 * The rows a save writes: every measure that has a value now, plus any that
 * had one before and is being cleared. Measures never touched get no row.
 */
export function rowsToSave(
  participantId: string,
  phase: Phase,
  next: Record<string, number | null>,
  existing: PairValues
) {
  const filled = withDerived(next);
  return MEASURES.filter(
    (def) => (filled[def.key] ?? null) !== null || existing[def.key]?.[phase] != null
  ).map((def) => {
    const base = {
      participant_id: participantId,
      domain: def.domain,
      measure: def.measure,
      unit: def.unit,
    };
    const value = filled[def.key] ?? null;
    return phase === 'pre' ? { ...base, pre_value: value } : { ...base, post_value: value };
  });
}

/**
 * Save one phase for one participant.
 *
 * An upsert on the table's own unique key. Only the phase's column is sent,
 * so saving Week 4 never touches Week 0 and the reverse.
 */
export async function saveAssessment(
  participantId: string,
  phase: Phase,
  next: Record<string, number | null>,
  existing: PairValues
): Promise<PairValues> {
  const rows = rowsToSave(participantId, phase, next, existing);
  if (rows.length > 0) {
    const { error } = await supabase
      .from('assessments')
      .upsert(rows, { onConflict: 'participant_id,domain,measure' });
    if (error) throw asError(error);
  }
  return mergePhase(existing, phase, next);
}

/** The pair table after a save, without a round trip. */
export function mergePhase(
  existing: PairValues,
  phase: Phase,
  next: Record<string, number | null>
): PairValues {
  const filled = withDerived(next);
  const out: PairValues = { ...existing };
  for (const def of MEASURES) {
    const value = filled[def.key] ?? null;
    const prev = out[def.key] ?? { pre: null, post: null };
    if (value === null && prev.pre === null && prev.post === null) continue;
    out[def.key] = { ...prev, [phase]: value };
  }
  return out;
}
