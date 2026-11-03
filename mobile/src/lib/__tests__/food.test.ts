import {
  carbsFor,
  GUIDANCE_LABEL,
  macroLine,
  macrosFor,
  searchTerm,
  suggestable,
  type FoodPortion,
  type FoodWithPortions,
} from '@/lib/food';

const portion = (over: Partial<FoodPortion> = {}): FoodPortion => ({
  id: 'p', food_id: 'f', label: '200g cooked', grams: 200, kcal: 260, carbs_g: 57,
  protein_g: null, fat_g: null, source_note: null, is_default: true,
  created_at: '2026-10-31T00:00:00Z', ...over,
});

const food = (over: Partial<FoodWithPortions> = {}): FoodWithPortions => ({
  id: 'f', name_id: 'Nasi putih', name_en: 'White rice', category: 'carbohydrate',
  guidance: 'eat_daily', guidance_note: null, is_pork: false, source: 'week-1-deck', tkpi_id: null,
  created_at: '2026-10-31T00:00:00Z', food_portions: [portion()], ...over,
});

describe('carbsFor', () => {
  it('scales a known figure by the quantity', () => {
    expect(carbsFor(portion(), 2)).toBe(114);
  });

  it('returns null when the programme has given no figure', () => {
    // Seven of the fifteen seeded foods have no carbohydrate number. Returning 0
    // would quietly tell an athlete they ate nothing.
    expect(carbsFor(portion({ carbs_g: null }), 3)).toBeNull();
  });
});

describe('suggestable', () => {
  it('offers only the foods the deck says to eat daily', () => {
    const foods = [food(), food({ id: 'g', name_id: 'Mie instan', guidance: 'not_the_priority' })];
    expect(suggestable(foods).map((f) => f.name_id)).toEqual(['Nasi putih']);
  });

  it('never suggests pork, though pork can still be logged', () => {
    const foods = [food({ id: 'h', name_id: 'Babi panggang', is_pork: true })];
    expect(suggestable(foods)).toHaveLength(0);
  });
});

describe('guidance labels', () => {
  it('has exactly the deck’s two registers, and labels neither as bad', () => {
    expect(Object.keys(GUIDANCE_LABEL)).toEqual(['eat_daily', 'not_the_priority']);
    const labels = Object.values(GUIDANCE_LABEL).join(' ').toLowerCase();
    for (const word of ['bad', 'avoid', 'never', 'unhealthy', 'junk']) {
      expect(`label says "${word}": ${labels.includes(word)}`).toBe(`label says "${word}": false`);
    }
  });
});

describe('the composition-table helpers', () => {
  it('scales every figure by the quantity, and keeps a missing one missing', () => {
    const p = portion({ kcal: 180, carbs_g: 39.8, protein_g: 3, fat_g: null });
    expect(macrosFor(p, 2)).toEqual({ kcal: 360, carbs_g: 79.6, protein_g: 6, fat_g: null });
  });

  it('prints what is known and leaves out what is not', () => {
    expect(macroLine({ kcal: 360, carbs_g: 79.6, protein_g: 6, fat_g: null })).toBe(
      '360 kcal · 80 g carbs · 6 g protein'
    );
  });

  it('strips characters that are filter syntax from a search', () => {
    expect(searchTerm(' nasi, (goreng)* ')).toBe('nasi goreng');
  });
});
