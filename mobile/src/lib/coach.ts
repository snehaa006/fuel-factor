import { asError, messageOf } from './errors';
import { supabase } from './supabase';
import { carbBand, positionInBand, type BandPosition } from './targets';
import type { Enums } from './database.types';
import type { IsoDate } from './streak';

/**
 * The coach dashboard.
 *
 * The B2B half of the pitch: a roster, who logged today, how often breakfast
 * happened, where the days landed against the deck's carbohydrate band, and
 * two flags. It is a read-only view assembled from rows a coach may already
 * see -- the policies have said "a coach sees their team's rows" since the
 * first migration, so this needs no function of its own, unlike the
 * leaderboard.
 *
 * **Both flags are the programme's thresholds, not the app's.** Under-fuelling
 * is three days running below the band in `targets.ts`, which is the Week 1
 * deck's own 5-7 and 3-4 g/kg; dehydrated is a urine reading of 5 or worse,
 * which is the threshold the seeded `urine_five_or_worse` rule already fires
 * on and which the tracker's own scale calls act now. The app supplies the
 * counting and nothing else.
 *
 * A coach never sees a challenge photo. The storage policies grant them no
 * access and four tests assert it; a tick on a log is what this screen is for.
 */

/** Days running below the band before an athlete is flagged. */
export const UNDER_FUELLING_DAYS = 3;

/** The urine reading the programme's own rule already treats as act now. */
export const DEHYDRATED_AT = 5;

export type FlagCode = 'under_fuelling' | 'dehydrated';

export type Flag = {
  code: FlagCode;
  /** What the coach reads. States the threshold, so it is checkable. */
  detail: string;
};

export type DayRollUp = {
  date: IsoDate;
  breakfast: boolean;
  urineColour: number | null;
  dayType: Enums<'day_type'> | null;
  /** Carbohydrate from the items that carry a figure. Null when none were logged. */
  carbsEaten: number | null;
  /** Where the day landed, or null when no band could be computed for it. */
  position: BandPosition | null;
};

export type CoachAthlete = {
  participantId: string;
  name: string;
  /** Needed for the band, and shown nowhere. */
  weightKg: number | null;
  days: DayRollUp[];
  loggedToday: boolean;
  daysLogged: number;
  breakfastDays: number;
  /** Days that landed inside the deck's band, and days that could be judged at all. */
  insideBand: number;
  daysWithBand: number;
  flags: Flag[];
};

export type CoachView = {
  teamName: string | null;
  athletes: CoachAthlete[];
  /** How many of the squad logged today. The number a coach opens this for. */
  loggedToday: number;
  windowDays: number;
};

/**
 * Three days running below the band, counting back from the most recent day.
 *
 * Consecutive in recorded days rather than in calendar days: a day with
 * nothing logged is not evidence of under-fuelling, it is evidence of not
 * logging, and the two must not be conflated into a clinical-sounding flag.
 */
export function underFuelling(days: DayRollUp[]): boolean {
  const judged = days.filter((d) => d.position !== null);
  if (judged.length < UNDER_FUELLING_DAYS) return false;
  return judged
    .slice(-UNDER_FUELLING_DAYS)
    .every((d) => d.position === 'below');
}

/** The most recent reading there is, or null when none was taken. */
export function latestUrine(days: DayRollUp[]): number | null {
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].urineColour !== null) return days[i].urineColour;
  }
  return null;
}

export function flagsFor(days: DayRollUp[]): Flag[] {
  const flags: Flag[] = [];

  if (underFuelling(days)) {
    flags.push({
      code: 'under_fuelling',
      detail: `${UNDER_FUELLING_DAYS} recorded days running below the programme's band.`,
    });
  }

  const urine = latestUrine(days);
  if (urine !== null && urine >= DEHYDRATED_AT) {
    flags.push({
      code: 'dehydrated',
      detail: `Last urine reading was ${urine}. The tracker's scale calls ${DEHYDRATED_AT} or worse act now.`,
    });
  }

  return flags;
}

type ParticipantRow = { id: string; name: string; weight_kg: number | null };

type LogRow = {
  id: string;
  participant_id: string;
  log_date: string;
  day_type: Enums<'day_type'> | null;
  breakfast: boolean;
  urine_colour: number | null;
};

/** Carbohydrate already summed per daily log, keyed by log id. */
export type CarbsByLog = Record<string, { grams: number; itemsWithoutFigures: number }>;

/**
 * Build the dashboard from the rows.
 *
 * Exported so the whole roll-up, including the flags, can be tested without a
 * network -- which matters more here than anywhere else in the app, because a
 * wrong flag on a 14-year-old is not a cosmetic bug.
 */
export function toCoachView(
  participants: ParticipantRow[],
  logs: LogRow[],
  carbs: CarbsByLog,
  today: IsoDate,
  windowDays: number,
  teamName: string | null
): CoachView {
  const athletes = participants
    .map((p) => {
      const weightKg = p.weight_kg === null ? null : Number(p.weight_kg);

      const days: DayRollUp[] = logs
        .filter((l) => l.participant_id === p.id)
        .sort((a, b) => a.log_date.localeCompare(b.log_date))
        .map((l) => {
          const summed = carbs[l.id];
          const band = carbBand(weightKg, l.day_type);
          return {
            date: l.log_date,
            breakfast: l.breakfast,
            urineColour: l.urine_colour,
            dayType: l.day_type,
            carbsEaten: summed ? summed.grams : null,
            // A day is judged only when the programme's rule has something to
            // apply to and something was actually logged. No weight, no day
            // type or no food means no position -- never a silent 'below'.
            position:
              band !== null && summed !== undefined && summed.itemsWithoutFigures === 0
                ? positionInBand(summed.grams, band)
                : null,
          };
        });

      const withBand = days.filter((d) => d.position !== null);

      return {
        participantId: p.id,
        name: p.name,
        weightKg,
        days,
        loggedToday: days.some((d) => d.date === today),
        daysLogged: days.length,
        breakfastDays: days.filter((d) => d.breakfast).length,
        insideBand: withBand.filter((d) => d.position === 'inside').length,
        daysWithBand: withBand.length,
        flags: flagsFor(days),
      };
    })
    // Alphabetical. A coach's roster is a list of people, not a ranking, and
    // sorting it by any figure here would make one.
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    teamName,
    athletes,
    loggedToday: athletes.filter((a) => a.loggedToday).length,
    windowDays,
  };
}

export class CoachError extends Error {}

/** Join a team as its coach. The code is not the athletes' join code. */
export async function claimCoach(coachCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_coach', { p_coach_code: coachCode });
  // The function raises with a sentence meant to be read.
  if (error) throw new CoachError(messageOf(error));
  return data as string;
}

/** Whether this device is a coach of anything. */
export async function isCoach(): Promise<boolean> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('role', 'coach')
    .limit(1)
    .maybeSingle();

  if (error) throw asError(error);
  return data !== null;
}

export async function fetchCoachView(
  today: IsoDate,
  since: IsoDate,
  windowDays: number
): Promise<CoachView> {
  const [team, participants, logs] = await Promise.all([
    supabase.from('teams').select('name').limit(1).maybeSingle(),
    // Row level security answers "whose athletes": a coach reads their team's
    // participants and nobody else's.
    supabase.from('participants').select('id, name, weight_kg').order('name'),
    supabase
      .from('daily_logs')
      .select('id, participant_id, log_date, day_type, breakfast, urine_colour')
      .gte('log_date', since)
      .returns<LogRow[]>(),
  ]);

  if (team.error) throw asError(team.error);
  if (participants.error) throw asError(participants.error);
  if (logs.error) throw asError(logs.error);

  const logIds = (logs.data ?? []).map((l) => l.id);
  const carbs = logIds.length > 0 ? await fetchCarbs(logIds) : {};

  return toCoachView(
    participants.data ?? [],
    logs.data ?? [],
    carbs,
    today,
    windowDays,
    team.data?.name ?? null
  );
}

type ItemRow = {
  daily_log_id: string;
  quantity: number;
  food_portions: { carbs_g: number | null } | null;
};

/**
 * Carbohydrate per daily log.
 *
 * Items whose portion carries no figure are counted rather than treated as
 * zero, and a day holding one is left unjudged above. Treating unknown as
 * zero here would manufacture an under-fuelling flag out of a gap in the food
 * database.
 */
export async function fetchCarbs(logIds: string[]): Promise<CarbsByLog> {
  const { data, error } = await supabase
    .from('log_items')
    .select('daily_log_id, quantity, food_portions(carbs_g)')
    .in('daily_log_id', logIds)
    .returns<ItemRow[]>();

  if (error) throw asError(error);

  const byLog: CarbsByLog = {};
  for (const row of data ?? []) {
    const entry = (byLog[row.daily_log_id] ??= { grams: 0, itemsWithoutFigures: 0 });
    const perPortion = row.food_portions?.carbs_g;
    if (perPortion === null || perPortion === undefined) {
      entry.itemsWithoutFigures += 1;
    } else {
      entry.grams += Number(perPortion) * Number(row.quantity);
    }
  }
  return byLog;
}
