import type { Enums } from './database.types';

export type DayType = Enums<'day_type'>;

export type CarbBand = { min: number; max: number };

/**
 * Carbohydrate per kilogram of body weight, by day type.
 *
 * Straight from the Week 1 deck. These are the programme's numbers, not the
 * app's: nothing here is interpolated, rounded or collapsed to a midpoint, and
 * nothing is added. Match days take the deck's game-day band, now that the
 * tracker's Day Type column holds Training, Match and Rest.
 */
export const CARB_G_PER_KG: Record<DayType, CarbBand> = {
  training: { min: 5, max: 7 },
  match: { min: 6, max: 8 },
  rest: { min: 3, max: 4 },
};

/**
 * A day with a session in it: training or a match. The breakfast and
 * pre-session advice, and the session times, apply to both.
 */
export function hasSessionDay(dayType: DayType | null): boolean {
  return dayType === 'training' || dayType === 'match';
}

/**
 * Today's carbohydrate band in grams, or null when it cannot be computed.
 *
 * Null is a real answer and must reach the screen. A missing body weight or an
 * unset day type means the programme's rule has nothing to apply to, and the
 * ring says so rather than showing a target nobody set.
 */
export function carbBand(weightKg: number | null, dayType: DayType | null): CarbBand | null {
  if (weightKg === null || dayType === null) return null;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;

  const perKg = CARB_G_PER_KG[dayType];
  return {
    min: Math.round(perKg.min * weightKg),
    max: Math.round(perKg.max * weightKg),
  };
}

export type BandPosition = 'below' | 'inside' | 'above';

/** Where an amount sits against a band. Position, not a grade. */
export function positionInBand(grams: number, band: CarbBand): BandPosition {
  if (grams < band.min) return 'below';
  if (grams > band.max) return 'above';
  return 'inside';
}

/**
 * The Week 2 deck's daily protein band: "1.6–2.2g per kg bodyweight needed
 * daily for teen male athletes", printed as 96–154g for a 60–70 kg athlete.
 *
 * One band for every day: the deck gives no training/rest split for protein,
 * so the app does not invent one. Shown as a range for the same reason the
 * carbohydrate ring is -- the programme set a band, not a midpoint.
 */
export const PROTEIN_G_PER_KG: CarbBand = { min: 1.6, max: 2.2 };

export function proteinBand(weightKg: number | null): CarbBand | null {
  if (weightKg === null || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  return {
    min: Math.round(PROTEIN_G_PER_KG.min * weightKg),
    max: Math.round(PROTEIN_G_PER_KG.max * weightKg),
  };
}

/**
 * "The body can only use 25–35g per meal for muscle protein synthesis.
 * Above that, surplus amino acids are burned as fuel." The top of that sweet
 * spot is the line past which a meal is carrying protein it cannot use.
 */
export const PROTEIN_PER_MEAL_MAX_G = 35;

/** Protein is taught in week 2, so nothing about it is shown or said before. */
export const PROTEIN_WEEK = 2;
