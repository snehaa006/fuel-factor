import {
  CARB_G_PER_KG,
  carbBand,
  positionInBand,
  PROTEIN_G_PER_KG,
  PROTEIN_PER_MEAL_MAX_G,
  PROTEIN_WEEK,
  proteinBand,
} from '@/lib/targets';

describe('carbohydrate bands', () => {
  it('uses the Week 1 deck’s own per-kilogram figures', () => {
    expect(CARB_G_PER_KG).toEqual({
      training: { min: 5, max: 7 },
      rest: { min: 3, max: 4 },
    });
  });

  it('offers no band the deck did not give', () => {
    // 6-8 g/kg for game days exists in the deck, but day_type has no "game",
    // so there must be no third entry here either.
    expect(Object.keys(CARB_G_PER_KG)).toEqual(['training', 'rest']);
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

describe('proteinBand', () => {
  it('is the week 2 deck’s 1.6–2.2 g per kg', () => {
    expect(PROTEIN_G_PER_KG).toEqual({ min: 1.6, max: 2.2 });
    // The deck prints 96–154g for a 60–70 kg athlete: 1.6 x 60 and 2.2 x 70.
    expect(proteinBand(60)?.min).toBe(96);
    expect(proteinBand(70)?.max).toBe(154);
    expect(proteinBand(68)).toEqual({ min: 109, max: 150 });
  });

  it('is no band without a usable weight', () => {
    expect(proteinBand(null)).toBeNull();
    expect(proteinBand(0)).toBeNull();
    expect(proteinBand(Number.NaN)).toBeNull();
  });

  it('caps a meal at the top of the deck’s 25–35 g sweet spot, from week 2', () => {
    expect(PROTEIN_PER_MEAL_MAX_G).toBe(35);
    expect(PROTEIN_WEEK).toBe(2);
  });
});
