import {
  COMPARISON_ROWS,
  delta,
  derive,
  DOMAINS,
  fetchAssessments,
  fetchRecallFigures,
  formatDelta,
  hadBreakfast,
  measureByKey,
  MEASURES,
  mergePhase,
  parseEntry,
  phaseAccess,
  phaseValues,
  recallFill,
  rowsToSave,
  saveAssessment,
  toPairs,
  withDerived,
  withRecallFill,
  WEEK_4_OPENS_ON_DAY,
  type RecallDayFigures,
} from '@/lib/assessments';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const mockFrom = supabase.from as unknown as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('the catalogue mirrors the ASSESSMENTS tab', () => {
  it('has the sheet’s eight domains, in order', () => {
    expect(DOMAINS.map((d) => d.domain)).toEqual([
      'ANTHROPOMETRY', 'AEROBIC', 'SPEED', 'POWER', 'CARDIOVASCULAR', 'DIETARY', 'SUBJECTIVE', 'HYDRATION',
    ]);
  });

  it('stores measures under the sheet’s own names', () => {
    expect(measureByKey('sprint1').measure).toBe('30m Sprint - Attempt 1');
    expect(measureByKey('jumpBest').measure).toBe('Vertical Jump - Best');
    expect(measureByKey('hrAvg').measure).toBe('Resting HR - Average');
    expect(measureByKey('fv').measure).toBe('F & V Servings/Day');
  });

  it('keeps the Cooper run under the name its seeded baselines use', () => {
    expect(measureByKey('cooper')).toMatchObject({ domain: 'AEROBIC', measure: 'Cooper 12-min run', unit: 'm' });
  });

  it('has unique keys and unique stored names', () => {
    expect(new Set(MEASURES.map((d) => d.key)).size).toBe(MEASURES.length);
    expect(new Set(MEASURES.map((d) => `${d.domain}|${d.measure}`)).size).toBe(MEASURES.length);
  });

  it('only compares measures the form records', () => {
    for (const row of COMPARISON_ROWS) expect(() => measureByKey(row.key)).not.toThrow();
  });
});

describe('Δ = Post minus Pre', () => {
  it('subtracts', () => {
    expect(delta(68, 70.5)).toBe(2.5);
    expect(delta(4.6, 4.42)).toBe(-0.18);
  });

  it('is null when either end is missing, never a zero', () => {
    expect(delta(null, 70)).toBeNull();
    expect(delta(68, null)).toBeNull();
  });

  it('prints with its sign', () => {
    expect(formatDelta(2.5)).toBe('+2.5');
    expect(formatDelta(-0.18)).toBe('-0.18');
    expect(formatDelta(0)).toBe('0');
    expect(formatDelta(null)).toBe('—');
  });
});

describe('derived measures', () => {
  it('averages the sprint attempts and resting heart rates', () => {
    const out = withDerived({ sprint1: 4.5, sprint2: 4.6, sprint3: 4.4, hr1: 60, hr2: 62, hr3: null });
    expect(out.sprintAvg).toBe(4.5);
    expect(out.hrAvg).toBe(61);
  });

  it('takes the best vertical jump', () => {
    expect(withDerived({ jump1: 41, jump2: 45, jump3: 43 }).jumpBest).toBe(45);
  });

  it('derives nothing from nothing', () => {
    expect(derive('mean', [null, null])).toBeNull();
    expect(withDerived({}).sprintAvg).toBeNull();
  });
});

describe('parseEntry', () => {
  const weight = measureByKey('weight');
  const energy = measureByKey('energyAm');

  it('reads empty as not measured', () => {
    expect(parseEntry('  ', weight)).toEqual({ ok: true, value: null });
  });

  it('takes a decimal comma', () => {
    expect(parseEntry('68,5', weight)).toEqual({ ok: true, value: 68.5 });
  });

  it('refuses text and values outside the scale', () => {
    expect(parseEntry('abc', weight).ok).toBe(false);
    expect(parseEntry('11', energy)).toEqual({ ok: false, error: 'Between 1 and 10 1 to 10.' });
    expect(parseEntry('0', energy).ok).toBe(false);
  });
});

describe('phaseAccess', () => {
  const open = (day: number) => ({ status: 'open' as const, startsOn: '2026-11-01', day, of: 28 });

  it('always opens Week 0', () => {
    expect(phaseAccess('pre', null, false)).toEqual({ open: true });
  });

  it('opens Week 4 on the first day of week four', () => {
    expect(phaseAccess('post', open(WEEK_4_OPENS_ON_DAY - 1), false)).toEqual({
      open: false,
      reason: 'Week 4 opens in 1 day.',
    });
    expect(phaseAccess('post', open(WEEK_4_OPENS_ON_DAY), false)).toEqual({ open: true });
  });

  it('keeps Week 4 shut before the programme or without a date', () => {
    expect(phaseAccess('post', { status: 'before', startsOn: '2026-12-01', daysUntil: 5 }, false).open).toBe(false);
    expect(phaseAccess('post', { status: 'no-date' }, false).open).toBe(false);
  });

  it('opens both from the start while testing', () => {
    expect(phaseAccess('post', open(1), true)).toEqual({ open: true });
    expect(phaseAccess('post', { status: 'no-date' }, true)).toEqual({ open: true });
  });
});

describe('rows', () => {
  const row = (over = {}) => ({
    participant_id: 'p1',
    domain: 'ANTHROPOMETRY',
    measure: 'Body Weight (pre-training)',
    pre_value: 68,
    post_value: null,
    ...over,
  });

  it('turns rows into pairs, by participant', () => {
    expect(toPairs([row(), row({ participant_id: 'p2', pre_value: 71, post_value: 72 })])).toEqual({
      p1: { weight: { pre: 68, post: null } },
      p2: { weight: { pre: 71, post: 72 } },
    });
  });

  it('leaves out measures the catalogue does not know', () => {
    expect(toPairs([row({ measure: 'Something else' })])).toEqual({});
  });

  it('saves only the phase’s column, and only touched measures', () => {
    const rows = rowsToSave('p1', 'post', { weight: 70, sprint1: 4.5, sprint2: 4.3 }, {});
    expect(rows).toEqual([
      { participant_id: 'p1', domain: 'ANTHROPOMETRY', measure: 'Body Weight (pre-training)', unit: 'kg', post_value: 70 },
      { participant_id: 'p1', domain: 'SPEED', measure: '30m Sprint - Attempt 1', unit: 's', post_value: 4.5 },
      { participant_id: 'p1', domain: 'SPEED', measure: '30m Sprint - Attempt 2', unit: 's', post_value: 4.3 },
      { participant_id: 'p1', domain: 'SPEED', measure: '30m Sprint - Average', unit: 's', post_value: 4.4 },
    ]);
    expect(rows.every((r) => !('pre_value' in r))).toBe(true);
  });

  it('writes a null to clear a value that was saved before', () => {
    const rows = rowsToSave('p1', 'pre', { weight: null }, { weight: { pre: 68, post: 70 } });
    expect(rows).toEqual([
      { participant_id: 'p1', domain: 'ANTHROPOMETRY', measure: 'Body Weight (pre-training)', unit: 'kg', pre_value: null },
    ]);
  });

  it('merges a saved phase without touching the other', () => {
    const merged = mergePhase({ weight: { pre: 68, post: null } }, 'post', { weight: 70 });
    expect(merged.weight).toEqual({ pre: 68, post: 70 });
    expect(phaseValues(merged, 'pre').weight).toBe(68);
  });

  it('upserts on the table’s unique key', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });
    const pairs = await saveAssessment('p1', 'pre', { weight: 68 }, {});
    expect(mockFrom).toHaveBeenCalledWith('assessments');
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'participant_id,domain,measure' });
    expect(pairs.weight).toEqual({ pre: 68, post: null });
  });

  it('fetches the participants asked for', async () => {
    const inFn = jest.fn().mockResolvedValue({ data: [row()], error: null });
    mockFrom.mockReturnValue({ select: () => ({ in: inFn }) });
    expect(await fetchAssessments(['p1'])).toEqual({ p1: { weight: { pre: 68, post: null } } });
    expect(inFn).toHaveBeenCalledWith('participant_id', ['p1']);
  });
});

describe('averages from the recall', () => {
  const day = (dayNumber: number, over: Partial<RecallDayFigures> = {}): RecallDayFigures => ({
    dayNumber, breakfast: null, breakfastPicked: false, fluid_ml: null, energy: null, recovery: null,
    urine_colour: null, kcal: null, carbs_g: null, protein_g: null, fat_g: null, ...over,
  });

  it('averages the baseline days for Week 0 and the follow-up days for Week 4', () => {
    const days = [
      day(1, { kcal: 1500, protein_g: 100, urine_colour: 6 }),
      day(2, { kcal: 1700, protein_g: 120, urine_colour: 5 }),
      day(4, { kcal: 2400 }),
    ];
    const fill = recallFill(days);
    expect(fill.pre.kcal).toEqual({ value: 1600, days: 2 });
    expect(fill.pre.protein).toEqual({ value: 110, days: 2 });
    expect(fill.pre.urine).toEqual({ value: 5.5, days: 2 });
    expect(fill.post.kcal).toEqual({ value: 2400, days: 1 });
  });

  it('counts a breakfast written as "None" or "skipped" as no breakfast', () => {
    const fill = recallFill([
      day(1, { breakfast: 'None' }),
      day(2, { breakfast: 'skipped' }),
      day(3, { breakfast: 'Greek yogurt with chia seeds' }),
    ]);
    expect(fill.pre.breakfast).toEqual({ value: 1, days: 3 });
  });

  it('counts a breakfast food picked from the database', () => {
    expect(hadBreakfast(day(1, { breakfast: null, breakfastPicked: true }))).toBe(true);
  });

  it('reads the recall’s energy rating as morning energy, and averages recovery and fluid', () => {
    const fill = recallFill([day(1, { energy: 6, recovery: 7, fluid_ml: 1500 }), day(2, { energy: 8, recovery: 5, fluid_ml: 2500 })]);
    expect(fill.pre.energyAm.value).toBe(7);
    expect(fill.pre.recovery.value).toBe(6);
    expect(fill.pre.fluid.value).toBe(2000);
  });

  it('fills nothing for a week with no recall days', () => {
    expect(recallFill([day(1, { kcal: 1500 })]).post).toEqual({});
  });

  it('fills only empty fields; a saved value wins', () => {
    const pairs = { kcal: { pre: 1800, post: null } };
    const filled = withRecallFill(pairs, {
      pre: { kcal: { value: 1600, days: 3 }, protein: { value: 110, days: 3 } },
      post: { kcal: { value: 2400, days: 3 } },
    });
    expect(filled.kcal).toEqual({ pre: 1800, post: 2400 });
    expect(filled.protein).toEqual({ pre: 110, post: null });
  });

  it('reads only figures the food database worked out', async () => {
    const rows = [
      {
        participant_id: 'p1', day_number: 1, breakfast: 'None', fluid_ml: 1500, energy: 6, recovery: 7, urine_colour: 4,
        recall_nutrition: { method: 'food_database', kcal: 1650, carbs_g: 200, protein_g: 90, fat_g: 50 },
        recall_items: [{ meal: 'breakfast' }],
      },
      {
        participant_id: 'p1', day_number: 2, breakfast: null, fluid_ml: null, energy: null, recovery: null, urine_colour: null,
        recall_nutrition: [{ method: 'not_computed', kcal: null, carbs_g: null, protein_g: null, fat_g: null }],
        recall_items: [],
      },
    ];
    const returns = jest.fn().mockResolvedValue({ data: rows, error: null });
    mockFrom.mockReturnValue({ select: () => ({ in: () => ({ returns }) }) });
    const figures = await fetchRecallFigures(['p1']);
    expect(figures.p1[0]).toMatchObject({ kcal: 1650, breakfastPicked: true, fluid_ml: 1500 });
    expect(figures.p1[1]).toMatchObject({ kcal: null, breakfastPicked: false });
  });
});
