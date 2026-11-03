import {
  appendFood,
  fetchRecallFoods,
  saveRecall,
  saveRecallFoods,
  totalMacros,
  type RecallEntry,
  type RecallFood,
} from '@/lib/recall';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const mockFrom = supabase.from as unknown as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const food = (over: Partial<RecallFood> = {}): RecallFood => ({
  meal: 'lunch',
  portionId: 'p-nasi-200',
  foodName: 'Nasi',
  portionLabel: '200 g',
  quantity: 1,
  macros: { kcal: 360, carbs_g: 79.6, protein_g: 6, fat_g: 0.6 },
  ...over,
});

describe('totalMacros', () => {
  it('adds up the foods picked', () => {
    const eggs = food({ meal: 'breakfast', foodName: 'Telur Ayam', macros: { kcal: 162, carbs_g: 0.7, protein_g: 12.8, fat_g: 11.5 } });
    expect(totalMacros([food(), eggs])).toEqual({ kcal: 522, carbs_g: 80.3, protein_g: 18.8, fat_g: 12.1 });
  });

  it('leaves a figure blank when any food lacks it, rather than undercounting', () => {
    const deck = food({ macros: { kcal: 260, carbs_g: 57, protein_g: null, fat_g: null } });
    expect(totalMacros([food(), deck])).toEqual({ kcal: 620, carbs_g: 136.6, protein_g: null, fat_g: null });
  });

  it('is null with nothing picked', () => {
    expect(totalMacros([])).toBeNull();
  });
});

describe('appendFood', () => {
  it('writes the food into an empty meal', () => {
    expect(appendFood(null, 'Nasi 200 g')).toBe('Nasi 200 g');
  });

  it('adds to what was typed', () => {
    expect(appendFood('chicken curry', 'Nasi 200 g')).toBe('chicken curry, Nasi 200 g');
  });

  it('does not repeat a food already written', () => {
    expect(appendFood('Nasi 200 g', 'nasi 200 g')).toBe('Nasi 200 g');
  });
});

describe('saving', () => {
  it('never sends the picked foods as a recalls column', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
    const upsert = jest.fn().mockReturnValue({ select: () => ({ single }) });
    mockFrom.mockReturnValue({ upsert });
    const entry = { lunch: 'Nasi 200 g', foods: [food()] } as unknown as RecallEntry;
    await saveRecall('p-1', 1, entry);
    expect(upsert.mock.calls[0][0]).not.toHaveProperty('foods');
  });

  it('replaces the day’s foods', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: () => ({ eq }), insert });
    await saveRecallFoods('r1', [food({ quantity: 1.5 })]);
    expect(eq).toHaveBeenCalledWith('recall_id', 'r1');
    expect(insert).toHaveBeenCalledWith([
      { recall_id: 'r1', meal: 'lunch', food_portion_id: 'p-nasi-200', quantity: 1.5 },
    ]);
  });

  it('only clears when nothing is picked', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const insert = jest.fn();
    mockFrom.mockReturnValue({ delete: () => ({ eq }), insert });
    await saveRecallFoods('r1', []);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('fetchRecallFoods', () => {
  it('groups the foods by day and scales the figures by quantity', async () => {
    const rows = [
      {
        meal: 'lunch', quantity: 2, food_portion_id: 'p1', recalls: { day_number: 4 },
        food_portions: { label: '100 g', kcal: 180, carbs_g: 39.8, protein_g: 3, fat_g: 0.3, food_items: { name_id: 'Nasi' } },
      },
    ];
    const chain: Record<string, jest.Mock> = {};
    for (const k of ['select', 'eq', 'in', 'order']) chain[k] = jest.fn(() => chain);
    chain.returns = jest.fn().mockResolvedValue({ data: rows, error: null });
    mockFrom.mockReturnValue(chain);

    const byDay = await fetchRecallFoods('p-1', [4, 5, 6]);
    expect(byDay[4]).toEqual([
      {
        meal: 'lunch', portionId: 'p1', foodName: 'Nasi', portionLabel: '100 g', quantity: 2,
        macros: { kcal: 360, carbs_g: 79.6, protein_g: 6, fat_g: 0.6 },
      },
    ]);
    expect(chain.eq).toHaveBeenCalledWith('recalls.participant_id', 'p-1');
  });
});
