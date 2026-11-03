import { MEAL_SLOTS, summariseDay, todayIso, toLoggedItem, type LoggedItem } from '@/lib/today';

const emptyLog = {
  day_type: 'training' as const,
  dq_score: null,
  urine_colour: null,
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

describe('protein on the day', () => {
  const egg: LoggedItem = { slot: 'breakfast', quantity: 2, carbs_g: null, protein_g: 36, name: 'Telur', proteinSource: true };
  const nasi: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: 57, protein_g: null, name: 'Nasi putih', carbSource: true };
  const tempe: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: null, protein_g: 19, name: 'Tempe', proteinSource: true };

  it('sums protein from the items that carry a figure, and counts the ones that do not', () => {
    const day = summariseDay(null, [egg, nasi, tempe], 68);
    expect(day.proteinEaten).toBe(55);
    expect(day.itemsWithoutProtein).toBe(1);
    expect(day.slots.find((s) => s.slot === 'lunch')?.protein_g).toBe(19);
    expect(day.slots.find((s) => s.slot === 'dinner')?.protein_g).toBeNull();
  });

  it('carries the week 2 band from the athlete’s weight, whatever the day type', () => {
    expect(summariseDay(null, [], 68).proteinBand).toEqual({ min: 109, max: 150 });
    expect(summariseDay(null, [], null).proteinBand).toBeNull();
  });

  it('reads an item with no protein field as having no figure', () => {
    // Older callers build items without the field; that is "unknown", not zero.
    const old: LoggedItem = { slot: 'lunch', quantity: 1, carbs_g: 57, name: 'Nasi putih' };
    expect(summariseDay(null, [old], 68)).toMatchObject({ proteinEaten: 0, itemsWithoutProtein: 1 });
  });
});

describe('toLoggedItem', () => {
  const row = (food: { name_id: string; category: string; source: string } | null, portion = {}) => ({
    slot: 'lunch' as const,
    quantity: '2',
    free_text: food ? null : 'nasi padang',
    food_portions: food
      ? ({ carbs_g: null, protein_g: null, ...portion, food_items: food } as never)
      : null,
  });

  it('marks a week 1 food a carb source and a week 2 protein a protein source', () => {
    const nasi = toLoggedItem(row({ name_id: 'Nasi putih', category: 'carbohydrate', source: 'week-1-deck' }, { carbs_g: '57' }));
    expect(nasi).toMatchObject({ carbs_g: 114, protein_g: null, carbSource: true, proteinSource: false });
    const tahu = toLoggedItem(row({ name_id: 'Tahu', category: 'protein', source: 'week-2-deck' }));
    expect(tahu).toMatchObject({ name: 'Tahu', protein_g: null, carbSource: false, proteinSource: true });
  });

  it('makes nothing of free text', () => {
    expect(toLoggedItem(row(null))).toMatchObject({
      name: 'nasi padang', carbs_g: null, protein_g: null, carbSource: false, proteinSource: false,
    });
  });
});
