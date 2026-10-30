import { MEAL_SLOTS, summariseDay, todayIso, type LoggedItem } from '@/lib/today';

const emptyLog = {
  day_type: 'training' as const,
  dq_score: null,
  breakfast: false,
  pre_training: false,
  lunch: false,
  post_training: false,
  dinner: false,
  evening_snack: false,
};

const oats: LoggedItem = { slot: 'breakfast', quantity: 1, carbs_g: 54, name: 'Oat' };
const nasi: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: 57, name: 'Nasi putih' };
const mie: LoggedItem = { slot: 'dinner', quantity: 1, carbs_g: null, name: 'Mie instan' };

describe('the day’s six slots', () => {
  it('are the DAILY LOG sheet’s slots, in its order', () => {
    expect(MEAL_SLOTS).toEqual([
      'breakfast', 'pre_training', 'lunch', 'post_training', 'dinner', 'evening_snack',
    ]);
  });

  it('are all present even on a day with nothing logged', () => {
    const summary = summariseDay(null, [], 68);
    expect(summary.slots).toHaveLength(6);
    expect(summary.slots.every((s) => !s.logged)).toBe(true);
  });

  it('marks a slot logged from the sheet’s tick', () => {
    const summary = summariseDay({ ...emptyLog, breakfast: true }, [], 68);
    expect(summary.slots.find((s) => s.slot === 'breakfast')?.logged).toBe(true);
  });

  it('marks a slot logged from its items, even without a tick', () => {
    const summary = summariseDay(emptyLog, [oats], 68);
    expect(summary.slots.find((s) => s.slot === 'breakfast')?.logged).toBe(true);
  });
});

describe('carbohydrate for the day', () => {
  it('sums the portions that carry a figure', () => {
    expect(summariseDay(emptyLog, [oats, nasi], 68).carbsEaten).toBe(111);
  });

  it('scales a portion by its quantity', () => {
    const summary = summariseDay(emptyLog, [{ ...nasi, quantity: 2, carbs_g: 114 }], 68);
    expect(summary.carbsEaten).toBe(114);
  });

  it('counts items with no figure instead of treating them as zero', () => {
    // A total that silently reads "unknown" as nothing would understate the day
    // and the athlete would never be told. The count is surfaced beside the ring.
    const summary = summariseDay(emptyLog, [oats, mie], 68);
    expect(summary.carbsEaten).toBe(54);
    expect(summary.itemsWithoutFigures).toBe(1);
  });

  it('leaves a slot’s carbohydrate null when none of its items carry a figure', () => {
    const summary = summariseDay(emptyLog, [mie], 68);
    expect(summary.slots.find((s) => s.slot === 'dinner')?.carbs_g).toBeNull();
  });
});

describe('the band', () => {
  it('is the training band for Theo’s 68 kg', () => {
    expect(summariseDay(emptyLog, [], 68).band).toEqual({ min: 340, max: 476 });
  });

  it('is null without a body weight', () => {
    expect(summariseDay(emptyLog, [], null).band).toBeNull();
  });

  it('is null when the day type is unset', () => {
    expect(summariseDay({ ...emptyLog, day_type: null }, [], 68).band).toBeNull();
  });
});

describe('the DQ score', () => {
  it('stays null, because the sheet states no formula', () => {
    expect(summariseDay(emptyLog, [oats, nasi], 68).dqScore).toBeNull();
  });

  it('is shown when the programme has supplied one', () => {
    expect(summariseDay({ ...emptyLog, dq_score: 9 }, [], 68).dqScore).toBe(9);
  });
});

describe('todayIso', () => {
  it('formats the local date, not UTC', () => {
    // 1 Nov 2026, 00:30 local. A UTC conversion would report 31 October.
    const local = new Date(2026, 10, 1, 0, 30);
    expect(todayIso(local)).toBe('2026-11-01');
  });
});
