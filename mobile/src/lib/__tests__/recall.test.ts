import {
  EMPTY_RECALL,
  RECALL_LIMITS,
  RECALL_MEALS,
  RECALL_RATINGS,
  fetchRecalls,
  hasAnyAnswer,
  hasAnyMeal,
  parseFluid,
  parseSleepHours,
  parseText,
  saveRecall,
  type RecallEntry,
} from '@/lib/recall';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as unknown as jest.Mock;

const entry = (over: Partial<RecallEntry> = {}): RecallEntry => ({ ...EMPTY_RECALL, ...over });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the form mirrors the RECALL sheet', () => {
  it('asks for the sheet’s three meals, in its order', () => {
    expect(RECALL_MEALS.map((m) => m.field)).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('asks for the sheet’s two ratings, not the daily log’s five', () => {
    // The DAILY LOG sheet carries five self-ratings; a recall day carries two.
    // Adding the other three here would mean adding columns to a research table.
    expect(RECALL_RATINGS.map((r) => r.field)).toEqual(['energy', 'recovery']);
  });

  it('never asks for est_calories', () => {
    // The sheet holds hand-typed estimates there and replacing them with
    // computed figures is the point: "the calories is estimated and calculated
    // based on our composition data ... This will be backend."
    expect(Object.keys(EMPTY_RECALL)).not.toContain('est_calories');
  });

  it('carries every other column of the sheet', () => {
    expect(Object.keys(EMPTY_RECALL).sort()).toEqual(
      [
        'activities',
        'breakfast',
        'day_type',
        'dinner',
        'energy',
        'fluid_ml',
        'lunch',
        'notes',
        'recall_date',
        'recovery',
        'sleep_hours',
        'supplements',
        'urine_colour',
      ].sort()
    );
  });

  it('takes its bounds from the migration’s check constraints', () => {
    expect(RECALL_LIMITS.sleep_hours).toEqual({ min: 0, max: 24 });
    expect(RECALL_LIMITS.fluid_ml).toEqual({ min: 0, max: 15000 });
    expect(RECALL_LIMITS.rating).toEqual({ min: 1, max: 10 });
    expect(RECALL_LIMITS.urine).toEqual({ min: 1, max: 8 });
  });
});

describe('parsing a blank field', () => {
  it('leaves sleep null rather than zero', () => {
    // Not answered and slept for no hours are different facts.
    expect(parseSleepHours('')).toBeNull();
    expect(parseSleepHours('   ')).toBeNull();
    expect(parseSleepHours('0')).toBe(0);
  });

  it('keeps a half hour', () => {
    expect(parseSleepHours('7.5')).toBe(7.5);
  });

  it('holds sleep inside the column’s own bound', () => {
    expect(parseSleepHours('99')).toBe(24);
  });

  it('leaves fluid null rather than zero', () => {
    expect(parseFluid('')).toBeNull();
    expect(parseFluid('0')).toBe(0);
    expect(parseFluid('1500')).toBe(1500);
  });

  it('clamps fluid to the column’s bound', () => {
    expect(parseFluid('99999')).toBe(15000);
    expect(parseFluid('-5')).toBe(0);
  });

  it('ignores something that is not a number', () => {
    expect(parseFluid('lots')).toBeNull();
    expect(parseSleepHours('a while')).toBeNull();
  });

  it('leaves empty text null rather than an empty string', () => {
    expect(parseText('')).toBeNull();
    expect(parseText('  ')).toBeNull();
    expect(parseText(' nasi putih ')).toBe('nasi putih');
  });
});

describe('hasAnyAnswer', () => {
  it('is false for a blank day', () => {
    // An empty recall must not be saved: it would write a row of nulls into a
    // research table and count as one of the programme's three days.
    expect(hasAnyAnswer(entry())).toBe(false);
  });

  it('is true for a single answer anywhere', () => {
    expect(hasAnyAnswer(entry({ urine_colour: 6 }))).toBe(true);
    expect(hasAnyAnswer(entry({ breakfast: 'oats' }))).toBe(true);
    expect(hasAnyAnswer(entry({ fluid_ml: 0 }))).toBe(true);
  });
});

describe('hasAnyMeal', () => {
  it('is false for a day with readings but no food', () => {
    // Exactly what the baseline's nine days hold. They are real data and are
    // still not something the food database can be run against.
    expect(hasAnyMeal(entry({ urine_colour: 6, energy: 4 }))).toBe(false);
  });

  it('is true as soon as one meal says something', () => {
    expect(hasAnyMeal(entry({ breakfast: 'skipped' }))).toBe(true);
    expect(hasAnyMeal(entry({ dinner: 'nasi goreng' }))).toBe(true);
  });
});

describe('saveRecall', () => {
  function upsertReturning(id: string) {
    const single = jest.fn().mockResolvedValue({ data: { id }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const upsert = jest.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ upsert });
    return { upsert };
  }

  it('upserts on the sheet’s own key, so re-opening a day edits it', () => {
    const { upsert } = upsertReturning('recall-1');
    return saveRecall('p-1', 2, entry({ breakfast: 'oats' })).then((id) => {
      expect(id).toBe('recall-1');
      expect(mockFrom).toHaveBeenCalledWith('recalls');
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ participant_id: 'p-1', day_number: 2, breakfast: 'oats' }),
        { onConflict: 'participant_id,day_number' }
      );
    });
  });

  it('writes no est_calories, even as a null', () => {
    // A null written here would still be the app touching a column the export
    // reads. The computed figures live in recall_nutrition instead.
    const { upsert } = upsertReturning('recall-1');
    return saveRecall('p-1', 1, entry({ lunch: 'nasi' })).then(() => {
      expect(Object.keys(upsert.mock.calls[0][0])).not.toContain('est_calories');
    });
  });

  it('reports a refusal the way supabase-js actually rejects', () => {
    // supabase-js rejects with a plain object, so `e instanceof Error` is false
    // and String(e) gives [object Object]. Rejecting with a real Error here
    // would hide exactly the bug that reached the screen once already.
    const single = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy' } });
    mockFrom.mockReturnValue({
      upsert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) }),
    });

    return expect(saveRecall('p-1', 1, entry({ lunch: 'nasi' }))).rejects.toThrow(
      /row-level security/
    );
  });
});

describe('fetchRecalls', () => {
  it('reports whether a day holds any meal text at all', () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { id: 'r1', day_number: 1, recall_date: null, breakfast: null, lunch: null, dinner: null },
        { id: 'r2', day_number: 2, recall_date: '2026-11-01', breakfast: 'oats', lunch: null, dinner: null },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order }) }),
    });

    return fetchRecalls('p-1').then((days) => {
      expect(days).toEqual([
        { id: 'r1', dayNumber: 1, recallDate: null, hasMeals: false },
        { id: 'r2', dayNumber: 2, recallDate: '2026-11-01', hasMeals: true },
      ]);
    });
  });
});
