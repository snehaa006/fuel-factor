import type { Enums } from './database.types';

export type DayType = Enums<'day_type'>;

export type CarbBand = { min: number; max: number };

/**
 * Carbohydrate per kilogram of body weight, by day type.
 *
 * Straight from the Week 1 deck. These are the programme's numbers, not the
 * app's: nothing here is interpolated, rounded or collapsed to a midpoint, and
 * nothing is added. The deck also gives 6-8 g/kg for game days, but the
 * tracker's Day Type column holds only training and rest, so that band has
 * nowhere to live until the dietitian adds the value.
 */
export const CARB_G_PER_KG: Record<DayType, CarbBand> = {
  training: { min: 5, max: 7 },
  rest: { min: 3, max: 4 },
};

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
