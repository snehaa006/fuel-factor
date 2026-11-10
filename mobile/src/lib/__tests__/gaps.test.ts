import {
  analyse,
  gapFor,
  gapHeadline,
  sumItems,
  type GapDay,
} from '@/lib/gaps';

/**
 * The gap analysis, which is the most persuasive screen in the app and
 * therefore the one with the most to get wrong.
 *
 * The rule under every test here: a day the programme's band cannot be
 * applied to is **not** a gap. Unknown and zero are different facts, and
 * conflating them would turn a hole in the food database into an accusation
 * about a 14 year old's eating.
 */

const day = (over: Partial<GapDay> = {}): GapDay => ({
  date: '2026-11-01',
  dayType: 'training',
  carbs: 300,
  protein: 100,
  carbsUnknown: 0,
  proteinUnknown: 0,
  ...over,
});

describe('one nutrient against the programme’s band', () => {
  it('uses the Week 1 deck’s band for the day type, not an average of them', () => {
    // 60 kg: training is 5-7 g/kg = 300-420, rest is 3-4 = 180-240. The same
    // 200 g is below the band on a training day and inside it on a rest day.
    const training = gapFor('carb', [day({ carbs: 200, dayType: 'training' })], 60);
    const rest = gapFor('carb', [day({ carbs: 200, dayType: 'rest' })], 60);

    expect(training.days[0].band).toEqual({ min: 300, max: 420 });
    expect(training.days[0].position).toBe('below');
    expect(rest.days[0].band).toEqual({ min: 180, max: 240 });
    expect(rest.days[0].position).toBe('inside');
  });

  it('uses one protein band for every day, because the deck gives no split', () => {
    // 1.6-2.2 g/kg at 60 kg = 96-132, training day or rest day alike.
    const gap = gapFor(
      'protein',
      [day({ dayType: 'training' }), day({ date: '2026-11-02', dayType: 'rest' })],
      60
    );
    expect(gap.days.map((d) => d.band)).toEqual([
      { min: 96, max: 132 },
      { min: 96, max: 132 },
    ]);
    expect(gap.typicalBand).toEqual({ min: 96, max: 132 });
  });

  it('counts the shortfall from the bottom of the band, and nothing above it', () => {
    const gap = gapFor(
      'carb',
      [
        day({ carbs: 200 }), // 100 short of 300
        day({ date: '2026-11-02', carbs: 350 }), // inside
        day({ date: '2026-11-03', carbs: 500 }), // above
      ],
      60
    );

    expect(gap.days.map((d) => d.shortfall)).toEqual([100, 0, 0]);
    expect({ below: gap.below, inside: gap.inside, above: gap.above }).toEqual({
      below: 1,
      inside: 1,
      above: 1,
    });
    // The mean shortfall is across every judged day, not only the short ones:
    // "short by 33 g on average" is about the fortnight.
    expect(gap.meanShortfall).toBe(33);
  });
});

describe('a day the band cannot be applied to', () => {
  it('is not judged without a body weight, because the band is per kilogram', () => {
    const gap = gapFor('carb', [day({ carbs: 10 })], null);
    expect(gap.days[0].position).toBeNull();
    expect(gap.days[0].unjudged).toBe('no-weight');
    expect(gap.below).toBe(0);
    expect(gap.judged).toBe(0);
  });

  it('is not judged without a day type, which is what picks the carb band', () => {
    const gap = gapFor('carb', [day({ carbs: 10, dayType: null })], 60);
    expect(gap.days[0].unjudged).toBe('no-day-type');
    expect(gap.below).toBe(0);
  });

  it('is still judged for protein without a day type, which does not need one', () => {
    const gap = gapFor('protein', [day({ protein: 100, dayType: null })], 60);
    expect(gap.days[0].unjudged).toBeNull();
    expect(gap.days[0].position).toBe('inside');
  });

  it('is not judged while any logged food has no figure', () => {
    // The total is a floor, not a total. Calling it below the band would be
    // reading the food database's gap as the athlete's.
    const gap = gapFor('carb', [day({ carbs: 200, carbsUnknown: 2 })], 60);
    expect(gap.days[0].unjudged).toBe('missing-figures');
    expect(gap.below).toBe(0);
    expect(gap.judged).toBe(0);
  });

  it('never reports a mean when nothing could be judged', () => {
    const gap = gapFor('carb', [day({ carbsUnknown: 1 })], 60);
    expect(gap.meanEaten).toBeNull();
    expect(gap.meanShortfall).toBe(0);
    expect(gapHeadline(gap)).toBeNull();
  });
});

describe('the typical band', () => {
  it('is null when the day types gave different bands', () => {
    // A window of training and rest days has no one band, and averaging two
    // of the deck's rules into one would invent a third.
    const gap = gapFor(
      'carb',
      [day({ dayType: 'training' }), day({ date: '2026-11-02', dayType: 'rest' })],
      60
    );
    expect(gap.typicalBand).toBeNull();
  });

  it('is the shared band when every judged day had the same one', () => {
    const gap = gapFor(
      'carb',
      [day({ dayType: 'match' }), day({ date: '2026-11-02', dayType: 'match' })],
      60
    );
    expect(gap.typicalBand).toEqual({ min: 360, max: 480 });
  });
});

describe('the headline', () => {
  it('counts days rather than giving advice', () => {
    const gap = gapFor(
      'carb',
      [day({ carbs: 200 }), day({ date: '2026-11-02', carbs: 200 }), day({ date: '2026-11-03' })],
      60
    );
    expect(gapHeadline(gap)).toBe(
      '2 of 3 recorded days fell below the programme’s carbohydrate band, by 67 g on average.'
    );
  });

  it('says so plainly when no day fell short', () => {
    const gap = gapFor('carb', [day({ carbs: 350 })], 60);
    expect(gapHeadline(gap)).toBe('No day fell below the programme’s carbohydrate band.');
  });
});

describe('summing a day’s items', () => {
  it('counts a missing figure rather than treating it as zero', () => {
    const summed = sumItems([
      {
        daily_log_id: 'l1',
        quantity: 2,
        food_portions: { carbs_g: 40, protein_g: 3 },
      },
      // A week 1 food: carbohydrate figure, no protein figure.
      { daily_log_id: 'l1', quantity: 1, food_portions: { carbs_g: 25, protein_g: null } },
      // Free text: no portion at all, so neither figure is known.
      { daily_log_id: 'l1', quantity: 1, food_portions: null },
    ]);

    expect(summed.l1).toEqual({
      carbs: 105, // 40*2 + 25
      protein: 6, // 3*2
      carbsUnknown: 1,
      proteinUnknown: 2,
    });
  });

  it('keeps each log’s items to that log', () => {
    const summed = sumItems([
      { daily_log_id: 'l1', quantity: 1, food_portions: { carbs_g: 10, protein_g: 1 } },
      { daily_log_id: 'l2', quantity: 1, food_portions: { carbs_g: 20, protein_g: 2 } },
    ]);
    expect(summed.l1.carbs).toBe(10);
    expect(summed.l2.carbs).toBe(20);
  });

  it('handles the numeric strings Postgres hands back', () => {
    const summed = sumItems([
      { daily_log_id: 'l1', quantity: '3', food_portions: { carbs_g: 10, protein_g: 2 } },
    ]);
    expect(summed.l1).toEqual({ carbs: 30, protein: 6, carbsUnknown: 0, proteinUnknown: 0 });
  });
});

describe('the whole analysis', () => {
  it('orders the days oldest first, whatever order they arrived in', () => {
    const analysis = analyse(
      [day({ date: '2026-11-03' }), day({ date: '2026-11-01' }), day({ date: '2026-11-02' })],
      60,
      '2026-11-01',
      '2026-11-03'
    );
    expect(analysis.days.map((d) => d.date)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
  });

  it('charts the two nutrients the programme set bands for, and no others', () => {
    // Fluid is a column with no target and energy is computed with no stated
    // band. Charting either would mean inventing the line.
    const analysis = analyse([day()], 60, '2026-11-01', '2026-11-01');
    expect(analysis.gaps.map((g) => g.nutrient)).toEqual(['carb', 'protein']);
  });

  it('survives a window with nothing logged in it', () => {
    const analysis = analyse([], 60, '2026-11-01', '2026-11-14');
    expect(analysis.days).toEqual([]);
    expect(analysis.gaps.every((g) => g.judged === 0)).toBe(true);
    expect(analysis.gaps.every((g) => g.meanEaten === null)).toBe(true);
  });
});
