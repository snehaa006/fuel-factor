import { Constants } from '@/lib/database.types';
import {
  MACROS,
  computeNutrition,
  fetchNutrition,
  isComputed,
  macroText,
  type RecallNutrition,
} from '@/lib/recall-nutrition';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const mockFrom = supabase.from as unknown as jest.Mock;
const mockRpc = supabase.rpc as unknown as jest.Mock;

const nothing: RecallNutrition = {
  method: 'not_computed',
  kcal: null,
  carbs_g: null,
  protein_g: null,
  fat_g: null,
  note: 'The programme’s food composition tables are not loaded yet.',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the four figures the dietitian named', () => {
  it('are calories, carbohydrate, protein and fat, in that order', () => {
    // "the calories is estimated and calculated based on our composition data
    // that we have ... the average protein, fat."
    expect(MACROS.map((m) => m.field)).toEqual(['kcal', 'carbs_g', 'protein_g', 'fat_g']);
  });

  it('have only the two methods the database knows', () => {
    expect(Constants.public.Enums.nutrition_method).toEqual(['not_computed', 'food_database']);
  });
});

describe('macroText', () => {
  it('says a missing figure in words rather than as a dash or a zero', () => {
    // Zero carbohydrate and unknown carbohydrate are different facts. The food
    // database already carries that distinction in its nulls, and this is the
    // same distinction on screen.
    expect(macroText(null, 'g')).toBe('Not computed yet');
    expect(macroText(0, 'g')).toBe('0 g');
    expect(macroText(57, 'g')).toBe('57 g');
  });
});

describe('isComputed', () => {
  it('is false for the state every row is in today', () => {
    // Nothing can be computed until the Jakarta composition tables are loaded:
    // this database holds carbohydrate for seven foods and no protein or fat
    // for any food at all.
    expect(isComputed(nothing)).toBe(false);
  });

  it('is false when there is no row yet', () => {
    expect(isComputed(null)).toBe(false);
  });

  it('is false for a food_database row that still produced no figure', () => {
    // A day whose meals matched nothing in the database is not a computed day.
    expect(isComputed({ ...nothing, method: 'food_database' })).toBe(false);
  });

  it('is true once the backend returns a figure', () => {
    expect(isComputed({ ...nothing, method: 'food_database', carbs_g: 212 })).toBe(true);
  });
});

describe('computeNutrition', () => {
  it('asks the backend rather than working anything out here', () => {
    // "This will be backend. This is not manual calculation." Nothing in this
    // module multiplies a portion by a gram figure.
    mockRpc.mockResolvedValue({
      data: {
        recall_id: 'r-1',
        method: 'not_computed',
        kcal: null,
        carbs_g: null,
        protein_g: null,
        fat_g: null,
        note: 'not loaded',
        computed_at: '2026-11-01T00:00:00Z',
      },
      error: null,
    });

    return computeNutrition('r-1').then((result) => {
      expect(mockRpc).toHaveBeenCalledWith('compute_recall_nutrition', { p_recall_id: 'r-1' });
      expect(result.method).toBe('not_computed');
      expect(result.carbs_g).toBeNull();
    });
  });

  it('reports a refusal as a sentence, not [object Object]', () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'no recall with that id' } });
    return expect(computeNutrition('r-9')).rejects.toThrow('no recall with that id');
  });
});

describe('fetchNutrition', () => {
  it('asks for nothing when there is nothing to ask about', () => {
    return fetchNutrition([]).then((result) => {
      expect(result).toEqual({});
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  it('keys what it finds on the recall id', () => {
    const inFilter = jest.fn().mockResolvedValue({
      data: [{ recall_id: 'r-1', method: 'not_computed', kcal: null, carbs_g: null, protein_g: null, fat_g: null, note: 'x' }],
      error: null,
    });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ in: inFilter }) });

    return fetchNutrition(['r-1', 'r-2']).then((result) => {
      expect(Object.keys(result)).toEqual(['r-1']);
      expect(result['r-1'].method).toBe('not_computed');
    });
  });
});
