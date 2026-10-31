import { URINE_WORDING } from './check-in';
import { asError } from './errors';
import { supabase } from './supabase';
import type { IsoDate } from './streak';

/**
 * Progress: baseline against now.
 *
 * This is the screen that turns the study into the pitch, and the one most
 * likely to tempt somebody into filling a gap. It does the opposite: a
 * measure the programme has not collected reads "not yet measured", and a
 * measure it has collected is printed as the number it is.
 *
 * **Nothing here says whether a change is good.** The app shows the baseline,
 * shows the current figure, and shows the arithmetic between them. Calling a
 * move in urine colour an improvement is a nutrition judgement, and the
 * programme has given no direction for any of these measures -- so the one
 * piece of meaning on the screen is the tracker's own printed wording for a
 * urine level, which is theirs, not the app's.
 *
 * Carbohydrate, breakfast frequency and energy have no baseline in this
 * database at all: the three-day recall holds those as free text and blank
 * columns, and that text is not in this repository. They render as not
 * measured, which is the honest state and is itself one of the findings.
 */

/** A measure is either collected or it is not. There is no third state. */
export type MetricValue = {
  value: number | null;
  /** How many readings it came from, so "one day" never reads like a trend. */
  days: number;
};

export type Metric = {
  key: string;
  label: string;
  unit: string | null;
  baseline: MetricValue;
  current: MetricValue;
  /**
   * The programme's own words about this figure, where it has any. Null for
   * every measure except urine colour, because the tracker prints a scale for
   * that one and for nothing else.
   */
  note: string | null;
  /** Why a missing baseline is missing, in words the athlete can read. */
  missingNote: string | null;
};

export type Progress = {
  metrics: Metric[];
  /** The Cooper run and anything else the ASSESSMENTS tab holds, pre vs post. */
  assessments: Assessment[];
};

export type Assessment = {
  measure: string;
  unit: string | null;
  pre: number | null;
  post: number | null;
};

const ROUND = (n: number) => Math.round(n * 10) / 10;

/** The mean of the readings there are, or null when there are none. */
export function mean(values: (number | null)[]): MetricValue {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (present.length === 0) return { value: null, days: 0 };
  return { value: ROUND(present.reduce((a, b) => a + b, 0) / present.length), days: present.length };
}

/** How many of the days answered yes, as a percentage of the days there are. */
export function frequency(values: boolean[]): MetricValue {
  if (values.length === 0) return { value: null, days: 0 };
  return { value: Math.round((values.filter(Boolean).length / values.length) * 100), days: values.length };
}

/**
 * The change from baseline to now, or null when either end is missing.
 *
 * Signed and unlabelled. Which direction is better is a question for the
 * dietitian, and until she answers it the screen prints the arithmetic.
 */
export function change(metric: Metric): number | null {
  if (metric.baseline.value === null || metric.current.value === null) return null;
  return ROUND(metric.current.value - metric.baseline.value);
}

/** The tracker's wording for a urine average, rounded to a printed level. */
export function urineNote(value: number | null): string | null {
  if (value === null) return null;
  return URINE_WORDING[Math.round(value)] ?? null;
}

type RecallRow = {
  urine_colour: number | null;
  energy: number | null;
  fluid_ml: number | null;
  est_calories: number | null;
  breakfast: string | null;
};

type LogRow = {
  urine_colour: number | null;
  energy_am: number | null;
  fluid_ml: number | null;
  breakfast: boolean;
};

/**
 * Build the four measures from the rows.
 *
 * Exported so the whole shape can be tested without a network, including the
 * case that matters most -- a baseline that is entirely absent.
 */
export function toMetrics(recalls: RecallRow[], logs: LogRow[]): Metric[] {
  const noBaseline =
    'The three-day recall holds this as free text, which has not been exported yet.';

  return [
    {
      key: 'urine',
      label: 'Hydration',
      unit: 'on the 1–8 scale',
      baseline: mean(recalls.map((r) => r.urine_colour)),
      current: mean(logs.map((l) => l.urine_colour)),
      note: null,
      missingNote: 'No urine readings recorded yet.',
    },
    {
      key: 'fluid',
      label: 'Fluid',
      unit: 'mL a day',
      baseline: mean(recalls.map((r) => r.fluid_ml)),
      current: mean(logs.map((l) => l.fluid_ml)),
      note: null,
      // The programme has never collected fluid. It is the gap the brief
      // raises in its own section 10, and the app should say so rather than
      // showing an empty row.
      missingNote: 'Fluid has never been collected by the programme.',
    },
    {
      key: 'breakfast',
      label: 'Breakfast',
      unit: '% of days',
      // A recall's breakfast column is the meal in words, so a non-empty one
      // is a breakfast eaten. Null means the export has not landed.
      baseline: frequency(
        recalls.filter((r) => r.breakfast !== null).map((r) => (r.breakfast ?? '').trim() !== '')
      ),
      current: frequency(logs.map((l) => l.breakfast)),
      note: null,
      missingNote: noBaseline,
    },
    {
      key: 'energy',
      label: 'Morning energy',
      unit: 'out of 10',
      baseline: mean(recalls.map((r) => r.energy)),
      current: mean(logs.map((l) => l.energy_am)),
      note: null,
      missingNote: noBaseline,
    },
  ].map((metric) =>
    metric.key === 'urine'
      ? // The one place the programme supplies meaning, so the one place the
        // app prints any.
        { ...metric, note: urineNote(metric.current.value ?? metric.baseline.value) }
      : metric
  );
}

/**
 * Read the athlete's own baseline and their logs since.
 *
 * Every read is of their own rows, so row level security answers it. The
 * recall rows are the research tier and are read, never written: the app does
 * not fill in a study instrument.
 */
export async function fetchProgress(since: IsoDate): Promise<Progress> {
  const [recalls, logs, assessments] = await Promise.all([
    supabase.from('recalls').select('urine_colour, energy, fluid_ml, est_calories, breakfast'),
    supabase
      .from('daily_logs')
      .select('urine_colour, energy_am, fluid_ml, breakfast')
      .gte('log_date', since),
    supabase.from('assessments').select('measure, unit, pre_value, post_value').order('measure'),
  ]);

  if (recalls.error) throw asError(recalls.error);
  if (logs.error) throw asError(logs.error);
  if (assessments.error) throw asError(assessments.error);

  return {
    metrics: toMetrics(recalls.data ?? [], logs.data ?? []),
    assessments: (assessments.data ?? []).map((a) => ({
      measure: a.measure,
      unit: a.unit,
      pre: a.pre_value,
      post: a.post_value,
    })),
  };
}
