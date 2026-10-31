import { DEMO_PROGRESS } from '@/lib/__fixtures__/today';
import {
  change,
  fetchProgress,
  frequency,
  mean,
  toMetrics,
  urineNote,
  type Metric,
} from '@/lib/progress';
import { sinceDate } from '@/lib/use-progress';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const mockFrom = supabase.from as unknown as jest.Mock;

const recall = (over = {}) => ({
  urine_colour: null,
  energy: null,
  fluid_ml: null,
  est_calories: null,
  breakfast: null,
  ...over,
});

const log = (over = {}) => ({
  urine_colour: null,
  energy_am: null,
  fluid_ml: null,
  breakfast: false,
  ...over,
});

const byKey = (metrics: Metric[], key: string) => metrics.find((m) => m.key === key)!;

describe('mean', () => {
  it('averages the readings there are', () => {
    expect(mean([6, 6, 6])).toEqual({ value: 6, days: 3 });
  });

  it('ignores a blank rather than counting it as zero', () => {
    // Not answered is not the same as zero, which is the rule the whole
    // check-in is built on.
    expect(mean([4, null, 6])).toEqual({ value: 5, days: 2 });
  });

  it('is null when nothing was recorded', () => {
    expect(mean([null, null])).toEqual({ value: null, days: 0 });
    expect(mean([])).toEqual({ value: null, days: 0 });
  });

  it('rounds to one decimal', () => {
    expect(mean([5, 5, 6]).value).toBe(5.3);
  });
});

describe('frequency', () => {
  it('counts the yes days as a percentage', () => {
    expect(frequency([true, true, false, false])).toEqual({ value: 50, days: 4 });
  });

  it('is null with no days at all', () => {
    expect(frequency([])).toEqual({ value: null, days: 0 });
  });
});

describe('change', () => {
  const metric = (baseline: number | null, current: number | null): Metric => ({
    key: 'k', label: 'l', unit: null,
    baseline: { value: baseline, days: baseline === null ? 0 : 3 },
    current: { value: current, days: current === null ? 0 : 3 },
    note: null, missingNote: null,
  });

  it('is the signed arithmetic', () => {
    expect(change(metric(6, 5.2))).toBe(-0.8);
    expect(change(metric(5, 7))).toBe(2);
  });

  it('is null when either end is missing', () => {
    // No baseline means no comparison, rather than a comparison against zero.
    expect(change(metric(null, 5))).toBeNull();
    expect(change(metric(6, null))).toBeNull();
  });
});

describe('urineNote', () => {
  it('uses the tracker’s own wording', () => {
    expect(urineNote(6)).toBe('Dehydrated — drink immediately');
    expect(urineNote(3)).toBe('Fine');
  });

  it('rounds to a printed level', () => {
    expect(urineNote(5.4)).toBe('Drink more today');
  });

  it('says nothing for a level the programme has not worded', () => {
    // Levels 1, 2, 7 and 8 have no wording in the workbook. Inventing one
    // would be inventing the instrument.
    expect(urineNote(7)).toBeNull();
    expect(urineNote(1)).toBeNull();
    expect(urineNote(null)).toBeNull();
  });
});

describe('toMetrics', () => {
  it('builds the four measures the brief names', () => {
    expect(toMetrics([], []).map((m) => m.key)).toEqual(['urine', 'fluid', 'breakfast', 'energy']);
  });

  it('reads a baseline urine average off the recall days', () => {
    // Theo's own three days at 6, which the workbook calls drink immediately.
    const metrics = toMetrics(
      [recall({ urine_colour: 6 }), recall({ urine_colour: 6 }), recall({ urine_colour: 6 })],
      []
    );
    expect(byKey(metrics, 'urine').baseline).toEqual({ value: 6, days: 3 });
  });

  it('leaves a measure the recall never collected without a baseline', () => {
    // Fluid is null on all nine seeded recall days, and that absence is one
    // of the programme's own findings.
    const metrics = toMetrics([recall({ urine_colour: 6 })], []);
    expect(byKey(metrics, 'fluid').baseline.value).toBeNull();
    expect(byKey(metrics, 'fluid').missingNote).toMatch(/never been collected/);
  });

  it('explains a missing baseline rather than showing a blank', () => {
    const metrics = toMetrics([recall()], []);
    for (const key of ['breakfast', 'energy']) {
      expect(byKey(metrics, key).missingNote).toMatch(/free text/);
    }
  });

  it('counts a recall breakfast by whether the meal was written down', () => {
    const metrics = toMetrics(
      [recall({ breakfast: 'Nasi goreng' }), recall({ breakfast: '' })],
      []
    );
    expect(byKey(metrics, 'breakfast').baseline).toEqual({ value: 50, days: 2 });
  });

  it('counts current breakfast off the daily log tick', () => {
    const metrics = toMetrics([], [log({ breakfast: true }), log({ breakfast: false })]);
    expect(byKey(metrics, 'breakfast').current).toEqual({ value: 50, days: 2 });
  });

  it('prints the tracker’s wording only for urine', () => {
    // The one measure the programme supplies meaning for, so the one the app
    // prints any for.
    const metrics = toMetrics([recall({ urine_colour: 6, energy: 4 })], []);
    expect(byKey(metrics, 'urine').note).toBe('Dehydrated — drink immediately');
    for (const key of ['fluid', 'breakfast', 'energy']) {
      expect(byKey(metrics, key).note).toBeNull();
    }
  });

  it('says nothing about whether a change is good', () => {
    // No direction, no verdict, no field a colour could be chosen from. The
    // dietitian has given no direction for any of these.
    const metrics = toMetrics([recall({ urine_colour: 6 })], [log({ urine_colour: 3 })]);
    for (const metric of metrics) {
      expect(Object.keys(metric)).toEqual([
        'key', 'label', 'unit', 'baseline', 'current', 'note', 'missingNote',
      ]);
    }
  });

  it('survives an athlete with no baseline and no logs', () => {
    const metrics = toMetrics([], []);
    expect(metrics.every((m) => m.baseline.value === null && m.current.value === null)).toBe(true);
  });
});

describe('sinceDate', () => {
  it('reaches back the programme’s four weeks', () => {
    expect(sinceDate('2026-11-29')).toBe('2026-11-01');
  });
});

describe('fetchProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'recalls') {
        return { select: async () => ({ data: [recall({ urine_colour: 6 })], error: null }) };
      }
      if (table === 'daily_logs') {
        return {
          select: () => ({ gte: async () => ({ data: [log({ urine_colour: 4 })], error: null }) }),
        };
      }
      return {
        select: () => ({
          order: async () => ({
            data: [{ measure: 'Cooper 12-min run', unit: 'm', pre_value: 2680, post_value: null }],
            error: null,
          }),
        }),
      };
    });
  });

  it('builds the metrics and the assessments', async () => {
    const progress = await fetchProgress('2026-10-03');
    expect(byKey(progress.metrics, 'urine').baseline.value).toBe(6);
    expect(byKey(progress.metrics, 'urine').current.value).toBe(4);
    expect(progress.assessments).toEqual([
      { measure: 'Cooper 12-min run', unit: 'm', pre: 2680, post: null },
    ]);
  });

  it('keeps a test that has not been re-run as not re-measured', async () => {
    // post_value is null for every athlete until the December recall.
    expect((await fetchProgress('2026-10-03')).assessments[0].post).toBeNull();
  });

  it('reports a refusal the way supabase-js refuses', async () => {
    // supabase-js rejects with a plain object, not an Error, and each of
    // these three reads has a different chain. The mock answers whichever
    // link the caller reaches for, so the refusal is the thing under test
    // rather than the shape of the stub.
    const refused = { data: null, error: { message: 'permission denied' } };
    mockFrom.mockImplementation(() => {
      const result = Promise.resolve(refused) as Promise<typeof refused> & {
        gte: () => typeof result;
        order: () => typeof result;
      };
      result.gte = () => result;
      result.order = () => result;
      return { select: () => result };
    });
    await expect(fetchProgress('2026-10-03')).rejects.toThrow('permission denied');
  });
});

describe('the demo progress matches the seeds', () => {
  it('gives a baseline only to the measure the seed actually holds', () => {
    // 0003_baseline_roster.sql seeds urine colour for all nine recall-days
    // and leaves fluid, energy and the meal text null. A fixture that filled
    // those in would be the one place invented nutrition data reached a demo.
    const measured = DEMO_PROGRESS.metrics.filter((m) => m.baseline.value !== null);
    expect(measured.map((m) => m.key)).toEqual(['urine']);
  });

  it('carries Theo’s own baseline reading', () => {
    expect(byKey(DEMO_PROGRESS.metrics, 'urine').baseline).toEqual({ value: 6, days: 3 });
  });

  it('leaves the Cooper run not re-measured', () => {
    expect(DEMO_PROGRESS.assessments.every((a) => a.post === null)).toBe(true);
  });
});
