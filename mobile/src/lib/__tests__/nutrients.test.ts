import {
  CARB_SOURCE_WORDS,
  hasNutrient,
  headWord,
  namesSource,
  PROTEIN_SOURCE_WORDS,
} from '@/lib/nutrients';
import { toLoggedItem } from '@/lib/today';

const isProtein = (name: string) => namesSource(name, PROTEIN_SOURCE_WORDS);
const isCarb = (name: string) => namesSource(name, CARB_SOURCE_WORDS);

describe('composition-table foods are sources by their head word', () => {
  it('reads the first word', () => {
    expect(headWord('Telur Ayam')).toBe('telur');
    expect(headWord('  Kepala Susu (Krim)')).toBe('kepala');
  });

  it('credits the protein sources week 2 names', () => {
    for (const name of ['Telur Ayam', 'Tempe Goreng', 'Tahu goreng', 'Ayam', 'Ikan Kembung', 'Daging Sapi', 'Susu bubuk', 'Yoghurt']) {
      expect(`${name}: ${isProtein(name)}`).toBe(`${name}: true`);
    }
  });

  it('credits the carb sources week 1 names, in the table’s own spellings', () => {
    for (const name of ['Nasi', 'Nasi Goreng', 'Roti Putih', 'Pisang Ambon', 'Singkong Goreng', 'Mi basah', 'Mie ayam', 'Havermout', 'Makaroni']) {
      expect(`${name}: ${isCarb(name)}`).toBe(`${name}: true`);
    }
  });

  it('does not credit a food that only mentions a source', () => {
    // Leaves, flowers, cream and a peanut snack, all named after a source.
    for (const name of ['Daun Ubi Jalar', 'Jantung Pisang segar', 'Bunga pepaya segar']) {
      expect(`${name}: ${isCarb(name)}`).toBe(`${name}: false`);
    }
    for (const name of ['Kepala Susu (Krim)', 'Kacang Telur', 'Coklat Susu batang']) {
      expect(`${name}: ${isProtein(name)}`).toBe(`${name}: false`);
    }
  });

  it('does not make rice a protein source, whatever its figure', () => {
    expect(isProtein('Nasi')).toBe(false);
  });
});

describe('toLoggedItem with the composition table', () => {
  const row = (name_id: string, protein_g: string, carbs_g: string) => ({
    slot: 'lunch' as const,
    quantity: 1,
    free_text: null,
    food_portions: {
      carbs_g, protein_g,
      food_items: { name_id, category: null, source: 'tkpi' },
    } as never,
  });

  it('marks telur ayam a protein source and not a carb source', () => {
    const item = toLoggedItem(row('Telur Ayam', '12.8', '0.7'));
    expect(item).toMatchObject({ protein_g: 12.8, proteinSource: true, carbSource: false });
    expect(hasNutrient(item, 'protein')).toBe(true);
  });

  it('marks nasi a carb source and not a protein source', () => {
    const item = toLoggedItem(row('Nasi', '3', '39.8'));
    expect(item).toMatchObject({ carbSource: true, proteinSource: false });
    expect(hasNutrient(item, 'protein')).toBe(false);
  });
});
