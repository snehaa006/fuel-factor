import { asError } from './errors';
import { supabase } from './supabase';
import {
  carbBand,
  positionInBand,
  proteinBand,
  type BandPosition,
  type CarbBand,
  type DayType,
} from './targets';
import type { IsoDate } from './streak';

/**
 * The gap analysis: what was eaten against what the programme asked for.
 *
 * This is the screen the pitch is about -- "the app doing something with the
 * data" -- so it is worth being exact about what it may and may not do.
 *
 * **Every target here is the programme's own.** There are exactly two, both
 * from the decks and both already in `targets.ts`: carbohydrate at 5-7 g/kg on
 * a training day, 6-8 on a match day and 3-4 on a rest day (Week 1), and
 * protein at 1.6-2.2 g/kg every day (Week 2). Nothing is added. Fluid has a
 * column and no target, so it is not charted; energy is computed and has no
 * stated band, so it is not charted either. A bar chart with a line on it is
 * the most persuasive thing in this app, which is exactly why the line has to
 * be somebody's actual recommendation rather than a plausible number.
 *
 * **Both targets are bands, and stay bands.** The decks set ranges. Collapsing
 * one to its midpoint to get a single bar height would invent a precision the
 * programme did not state, and would turn "inside the band" into "92% of
 * target". So a day is drawn against a band and described by where it fell.
 *
 * **A day that cannot be judged is not a gap.** No body weight, no day type,
 * or a food the database has no figure for all mean the rule has nothing to
 * apply to. Those days are counted and named, never folded in as zero: the
 * difference between "ate too little" and "we do not know what he ate" is the
 * whole difference between this screen and a wrong accusation.
 *
 * Pure apart from `fetchGaps`, so the arithmetic is testable without a
 * network and without the Supabase client in its import graph.
 */

export type Nutrient = 'carb' | 'protein';

export const NUTRIENT_LABEL: Record<Nutrient, string> = {
  carb: 'Carbohydrate',
  protein: 'Protein',
};

/** Which deck stated the band, so the screen can say whose number it is. */
export const NUTRIENT_SOURCE: Record<Nutrient, string> = {
  carb: 'Week 1 deck · 5–7 g/kg training, 6–8 match, 3–4 rest',
  protein: 'Week 2 deck · 1.6–2.2 g/kg every day',
};

/** One logged day, as the gap analysis sees it. */
export type GapDay = {
  date: IsoDate;
  dayType: DayType | null;
  /** Grams from the items that carry a figure. */
  carbs: number;
  protein: number;
  /** Items logged whose portion has no carbohydrate figure. */
  carbsUnknown: number;
  /** Items logged whose portion has no protein figure. */
  proteinUnknown: number;
};

/** One day against one nutrient's band. */
export type DayAgainstBand = {
  date: IsoDate;
  dayType: DayType | null;
  eaten: number;
  band: CarbBand | null;
  position: BandPosition | null;
  /** Why the day could not be judged, for the screen to say out loud. */
  unjudged: 'no-weight' | 'no-day-type' | 'missing-figures' | null;
  /** Grams short of the bottom of the band. 0 when inside or above. */
  shortfall: number;
};

export type NutrientGap = {
  nutrient: Nutrient;
  days: DayAgainstBand[];
  /** Days the band could be applied to. The denominator for everything below. */
  judged: number;
  below: number;
  inside: number;
  above: number;
  /** Mean grams across the judged days, or null when there are none. */
  meanEaten: number | null;
  /** The band on a typical judged day, or null when they differ or there are none. */
  typicalBand: CarbBand | null;
  /** Mean grams short across the judged days. 0 when nothing fell short. */
  meanShortfall: number;
};

export type GapAnalysis = {
  weightKg: number | null;
  from: IsoDate;
  to: IsoDate;
  /** Every day with a log in the window, newest last. */
  days: GapDay[];
  gaps: NutrientGap[];
};

function bandFor(nutrient: Nutrient, weightKg: number | null, dayType: DayType | null) {
  return nutrient === 'carb' ? carbBand(weightKg, dayType) : proteinBand(weightKg);
}

/**
 * Why a day could not be judged.
 *
 * Ordered by what the athlete can do about it: a missing weight is a question
 * for the research team, a missing day type is one tap on Today, and a food
 * without a figure is the database's gap and nobody's fault.
 */
function reasonUnjudged(
  nutrient: Nutrient,
  weightKg: number | null,
  dayType: DayType | null,
  unknownItems: number
): DayAgainstBand['unjudged'] {
  if (weightKg === null) return 'no-weight';
  // Protein's band is one range for every day, so a day type it does not need
  // must not be reported as the reason it could not be judged.
  if (nutrient === 'carb' && dayType === null) return 'no-day-type';
  if (unknownItems > 0) return 'missing-figures';
  return null;
}

export const UNJUDGED_REASON: Record<NonNullable<DayAgainstBand['unjudged']>, string> = {
  'no-weight': 'No body weight recorded, so the programme’s g/kg band cannot be worked out.',
  'no-day-type': 'No day type set, so there is no band for the day.',
  'missing-figures': 'Some foods logged have no figure in the database yet.',
};

/** One nutrient, day by day, against the programme's band. */
export function gapFor(
  nutrient: Nutrient,
  days: GapDay[],
  weightKg: number | null
): NutrientGap {
  const against: DayAgainstBand[] = days.map((day) => {
    const eaten = nutrient === 'carb' ? day.carbs : day.protein;
    const unknown = nutrient === 'carb' ? day.carbsUnknown : day.proteinUnknown;
    const band = bandFor(nutrient, weightKg, day.dayType);
    const unjudged = reasonUnjudged(nutrient, weightKg, day.dayType, unknown);
    const judged = band !== null && unjudged === null;

    return {
      date: day.date,
      dayType: day.dayType,
      eaten,
      band,
      position: judged ? positionInBand(eaten, band) : null,
      unjudged,
      shortfall: judged && eaten < band.min ? Math.round(band.min - eaten) : 0,
    };
  });

  const judged = against.filter((d) => d.position !== null);
  const bands = new Set(judged.map((d) => `${d.band?.min}-${d.band?.max}`));

  return {
    nutrient,
    days: against,
    judged: judged.length,
    below: judged.filter((d) => d.position === 'below').length,
    inside: judged.filter((d) => d.position === 'inside').length,
    above: judged.filter((d) => d.position === 'above').length,
    meanEaten:
      judged.length === 0
        ? null
        : Math.round(judged.reduce((sum, d) => sum + d.eaten, 0) / judged.length),
    // Only when every judged day shared one band. Carbohydrate's moves with
    // the day type, so a squad of training and rest days has no typical band
    // and the screen draws each day's own instead of averaging two rules.
    typicalBand: judged.length > 0 && bands.size === 1 ? (judged[0].band ?? null) : null,
    meanShortfall:
      judged.length === 0
        ? 0
        : Math.round(judged.reduce((sum, d) => sum + d.shortfall, 0) / judged.length),
  };
}

/** The whole analysis for one athlete's window of days. */
export function analyse(
  days: GapDay[],
  weightKg: number | null,
  from: IsoDate,
  to: IsoDate
): GapAnalysis {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return {
    weightKg,
    from,
    to,
    days: ordered,
    gaps: [gapFor('carb', ordered, weightKg), gapFor('protein', ordered, weightKg)],
  };
}

/**
 * The one sentence a gap is worth, or null when there is nothing to say.
 *
 * Deliberately an observation and not advice. "Eleven of fourteen days below
 * the band" is a count of logged days against a published number, which a
 * coach can check; "you need more carbohydrate" is a nutrition instruction and
 * belongs to the advice engine, where every sentence is a seeded rule with a
 * source and a review flag.
 */
export function gapHeadline(gap: NutrientGap): string | null {
  if (gap.judged === 0) return null;
  const label = NUTRIENT_LABEL[gap.nutrient].toLowerCase();
  if (gap.below === 0) {
    return `No day fell below the programme’s ${label} band.`;
  }
  return `${gap.below} of ${gap.judged} recorded ${gap.judged === 1 ? 'day' : 'days'} fell below the programme’s ${label} band, by ${gap.meanShortfall} g on average.`;
}

type LogRow = {
  id: string;
  log_date: string;
  day_type: DayType | null;
};

type ItemRow = {
  daily_log_id: string;
  quantity: number | string;
  food_portions: { carbs_g: number | null; protein_g: number | null } | null;
};

/**
 * Sum both nutrients per daily log.
 *
 * Exported for its own test: "unknown is not zero" is the rule this whole
 * screen rests on and it is enforced here, once, for both nutrients.
 */
export function sumItems(rows: ItemRow[]): Record<
  string,
  { carbs: number; protein: number; carbsUnknown: number; proteinUnknown: number }
> {
  const byLog: Record<
    string,
    { carbs: number; protein: number; carbsUnknown: number; proteinUnknown: number }
  > = {};

  for (const row of rows) {
    const entry = (byLog[row.daily_log_id] ??= {
      carbs: 0,
      protein: 0,
      carbsUnknown: 0,
      proteinUnknown: 0,
    });
    const quantity = Number(row.quantity);
    const carbs = row.food_portions?.carbs_g ?? null;
    const protein = row.food_portions?.protein_g ?? null;

    if (carbs === null) entry.carbsUnknown += 1;
    else entry.carbs += Number(carbs) * quantity;

    if (protein === null) entry.proteinUnknown += 1;
    else entry.protein += Number(protein) * quantity;
  }

  return byLog;
}

/**
 * The signed-in athlete's gap analysis over a window.
 *
 * Which athlete is never a parameter: row level security answers that from the
 * session, the same way `fetchToday` does, so a caller cannot ask about
 * somebody else's eating.
 */
export async function fetchGaps(from: IsoDate, to: IsoDate): Promise<GapAnalysis | null> {
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, weight_kg')
    .limit(1)
    .maybeSingle();

  if (participantError) throw asError(participantError);
  if (!participant) return null;

  const weightKg = participant.weight_kg === null ? null : Number(participant.weight_kg);

  const { data: logs, error: logsError } = await supabase
    .from('daily_logs')
    .select('id, log_date, day_type')
    .eq('participant_id', participant.id)
    .gte('log_date', from)
    .lte('log_date', to)
    .order('log_date')
    .returns<LogRow[]>();

  if (logsError) throw asError(logsError);

  const rows = logs ?? [];
  if (rows.length === 0) return analyse([], weightKg, from, to);

  const { data: items, error: itemsError } = await supabase
    .from('log_items')
    .select('daily_log_id, quantity, food_portions(carbs_g, protein_g)')
    .in(
      'daily_log_id',
      rows.map((l) => l.id)
    )
    .returns<ItemRow[]>();

  if (itemsError) throw asError(itemsError);

  const summed = sumItems(items ?? []);

  const days: GapDay[] = rows.map((log) => {
    const totals = summed[log.id];
    // A day whose row exists but holds no food at all is not a day of eating
    // nothing -- it is a day somebody opened and did not fill. Saying "0 g,
    // far below the band" about it would be the worst kind of wrong, so it
    // carries an unknown and drops out of the judged days.
    const empty = totals === undefined;
    return {
      date: log.log_date,
      dayType: log.day_type,
      carbs: totals?.carbs ?? 0,
      protein: totals?.protein ?? 0,
      carbsUnknown: empty ? 1 : totals.carbsUnknown,
      proteinUnknown: empty ? 1 : totals.proteinUnknown,
    };
  });

  return analyse(days, weightKg, from, to);
}
