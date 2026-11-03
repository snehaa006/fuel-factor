import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defaultPortion, macroLine, portionSummary, QUANTITIES, searchFoods } from '@/lib/logger';
import { DEMO_FOODS } from '@/lib/__fixtures__/today';
import type { FoodPortion, FoodWithPortions } from '@/lib/food';

const read = (p: string) => readFileSync(resolve(__dirname, '../../../..', p), 'utf8');

const names = (foods: FoodWithPortions[]) => foods.map((f) => f.name_id);

describe('searchFoods', () => {
  it('returns everything for an empty query', () => {
    expect(searchFoods(DEMO_FOODS, '')).toHaveLength(DEMO_FOODS.length);
  });

  it('matches the Indonesian name', () => {
    expect(names(searchFoods(DEMO_FOODS, 'nasi'))).toEqual(['Nasi putih', 'Nasi merah']);
  });

  it('matches the English name, because the squad uses both', () => {
    expect(names(searchFoods(DEMO_FOODS, 'rice'))).toEqual(['Nasi putih', 'Nasi merah']);
  });

  it('ignores case', () => {
    expect(names(searchFoods(DEMO_FOODS, 'PISANG'))).toEqual(['Pisang']);
  });

  it('ignores surrounding whitespace', () => {
    expect(names(searchFoods(DEMO_FOODS, '  oat '))).toEqual(['Oat']);
  });

  it('puts a name that starts with the query before one that merely contains it', () => {
    const foods = [
      { ...DEMO_FOODS[0], id: 'a', name_id: 'Bubur ayam', name_en: null },
      { ...DEMO_FOODS[0], id: 'b', name_id: 'Ayam goreng', name_en: null },
    ];
    expect(names(searchFoods(foods, 'ayam'))).toEqual(['Ayam goreng', 'Bubur ayam']);
  });

  it('keeps the database’s own order otherwise, which puts eat-daily first', () => {
    // The ordering is not a nutrition judgement: nothing is hidden or ranked
    // down, and the lower-priority foods are still returned.
    const results = searchFoods(DEMO_FOODS, 'a');
    expect(results.some((f) => f.guidance === 'not_the_priority')).toBe(true);
  });

  it('finds a food the deck lists as lower priority just as readily', () => {
    expect(names(searchFoods(DEMO_FOODS, 'mie'))).toEqual(['Mie instan']);
  });

  it('returns nothing for a food that is not in the database', () => {
    expect(searchFoods(DEMO_FOODS, 'rendang')).toEqual([]);
  });
});

describe('defaultPortion', () => {
  it('opens on the portion marked default', () => {
    expect(defaultPortion(DEMO_FOODS[0])?.label).toBe('200g cooked');
  });

  it('falls back to the first when none is marked', () => {
    const food = {
      ...DEMO_FOODS[0],
      food_portions: DEMO_FOODS[0].food_portions.map((p) => ({ ...p, is_default: false })),
    };
    expect(defaultPortion(food)?.label).toBe('200g cooked');
  });

  it('is null for a food with no portions at all', () => {
    expect(defaultPortion({ ...DEMO_FOODS[0], food_portions: [] })).toBeNull();
  });
});

describe('portionSummary', () => {
  const nasi = DEMO_FOODS[0].food_portions[0];
  const pepaya = DEMO_FOODS.find((f) => f.name_id === 'Pepaya / mangga')!.food_portions[0];

  it('scales the deck’s figure by the quantity', () => {
    expect(portionSummary(nasi, 2)).toMatchObject({ carbs_g: 114, kcal: 520, unknown: false });
  });

  it('handles a half portion, because half a bowl is a real portion', () => {
    expect(portionSummary(nasi, 0.5).carbs_g).toBe(28.5);
  });

  it('reports a missing figure as unknown, never as zero', () => {
    // Pepaya is listed in the deck with a kcal range and no carbohydrate, so a
    // zero here would tell an athlete they ate no carbohydrate. They did.
    expect(portionSummary(pepaya, 1)).toMatchObject({ carbs_g: null, unknown: true });
  });

  it('keeps a missing figure missing however many are logged', () => {
    expect(portionSummary(pepaya, 3).carbs_g).toBeNull();
  });
});

describe('the quantities offered', () => {
  it('includes halves and nothing absurd', () => {
    expect(QUANTITIES).toEqual([0.5, 1, 1.5, 2, 3]);
    expect(Math.max(...QUANTITIES)).toBeLessThanOrEqual(3);
    expect(Math.min(...QUANTITIES)).toBeGreaterThan(0);
  });
});

describe('the demo food fixture', () => {
  const week1 = DEMO_FOODS.filter((f) => f.source === 'week-1-deck');
  const week2 = DEMO_FOODS.filter((f) => f.source === 'week-2-deck');

  it('matches the seed, including the foods with no figures', () => {
    const withoutCarbs = week1.filter((f) => f.food_portions[0].carbs_g === null);
    expect(withoutCarbs.map((f) => f.name_id)).toEqual(['Pepaya / mangga', 'Mie instan']);
  });

  it('carries no protein or fat on a week 1 food, because that deck gives neither', () => {
    const portions: FoodPortion[] = week1.flatMap((f) => f.food_portions);
    expect(portions.every((p) => p.protein_g === null && p.fat_g === null)).toBe(true);
  });

  it('carries the week 2 deck’s protein figures as seed 0010 does, and nothing else', () => {
    const seed = read('supabase/seed/0010_week2_foods.sql');
    for (const food of week2) {
      const p = food.food_portions[0];
      const row = new RegExp(`\\('${food.name_id}',\\s+'${p.label}',\\s+[^,]+,\\s+([^,]+),`).exec(seed);
      expect(`${food.name_id}: ${row?.[1].trim().replace('::numeric', '')}`).toBe(
        `${food.name_id}: ${p.protein_g === null ? 'null' : `${p.protein_g}.0`}`
      );
      expect(p.carbs_g).toBeNull();
      expect(p.fat_g).toBeNull();
      expect(food.category).toBe('protein');
    }
    expect(week2.length).toBeGreaterThan(0);
  });
});

describe('macroLine', () => {
  const egg = DEMO_FOODS.find((f) => f.name_id === 'Telur')!.food_portions[0];
  const tahu = DEMO_FOODS.find((f) => f.name_id === 'Tahu')!.food_portions[0];
  const nasi = DEMO_FOODS[0].food_portions[0];

  it('gives carbohydrate for a week 1 food', () => {
    expect(macroLine(portionSummary(nasi, 1))).toBe('57 g carbs');
  });

  it('gives protein for a week 2 food', () => {
    expect(macroLine(portionSummary(egg, 2))).toBe('36 g protein');
  });

  it('says so when the programme has given neither', () => {
    expect(portionSummary(tahu, 1).unknown).toBe(true);
    expect(macroLine(portionSummary(tahu, 1))).toBe('No figure for this yet — it will still be logged.');
  });

  it('gives both when a portion carries both', () => {
    expect(macroLine({ carbs_g: 27, protein_g: 18, kcal: null, unknown: false })).toBe(
      '27 g carbs · 18 g protein'
    );
  });
});
