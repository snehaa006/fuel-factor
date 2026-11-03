import { CARB_G_PER_KG, carbBand, hasSessionDay, positionInBand } from '@/lib/targets';

describe('carbohydrate bands', () => {
  it('uses the Week 1 deck’s own per-kilogram figures', () => {
    expect(CARB_G_PER_KG).toEqual({
      training: { min: 5, max: 7 },
      match: { min: 6, max: 8 },
      rest: { min: 3, max: 4 },
    });
  });

  it('offers no band the deck did not give', () => {
    // One band per Day Type the tracker carries: Training, Match, Rest.
    expect(Object.keys(CARB_G_PER_KG)).toEqual(['training', 'match', 'rest']);
  });

  it('gives a match day the deck’s game-day band', () => {
    expect(carbBand(68, 'match')).toEqual({ min: 408, max: 544 });
  });

  it('treats training and match as days with a session, and rest as not', () => {
    expect(hasSessionDay('training')).toBe(true);
    expect(hasSessionDay('match')).toBe(true);
    expect(hasSessionDay('rest')).toBe(false);
    expect(hasSessionDay(null)).toBe(false);
  });

  it('computes Theo’s training band from the 68 kg both tabs agree on', () => {
    expect(carbBand(68, 'training')).toEqual({ min: 340, max: 476 });
  });

  it('computes a rest-day band', () => {
    expect(carbBand(68, 'rest')).toEqual({ min: 204, max: 272 });
  });

  it('returns a band, never a single target', () => {
    const band = carbBand(71, 'training');
    expect(band).not.toBeNull();
    expect(band!.min).toBeLessThan(band!.max);
  });

  it('gives no band without a body weight', () => {
    // Targets are g per kg. Without a weight the programme's rule has nothing
    // to apply to, and the ring must say so rather than invent a number.
    expect(carbBand(null, 'training')).toBeNull();
  });

  it('gives no band without a day type', () => {
    expect(carbBand(68, null)).toBeNull();
  });

  it('rejects a nonsense weight rather than returning a nonsense band', () => {
    expect(carbBand(0, 'training')).toBeNull();
    expect(carbBand(-5, 'training')).toBeNull();
    expect(carbBand(Number.NaN, 'training')).toBeNull();
  });
});

describe('position against a band', () => {
  const band = { min: 340, max: 476 };

  it('reads the edges as inside, not outside', () => {
    expect(positionInBand(340, band)).toBe('inside');
    expect(positionInBand(476, band)).toBe('inside');
  });

  it('places amounts either side', () => {
    expect(positionInBand(111, band)).toBe('below');
    expect(positionInBand(500, band)).toBe('above');
  });
});
