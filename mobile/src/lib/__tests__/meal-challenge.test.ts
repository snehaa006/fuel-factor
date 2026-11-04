import {
  challengeWeek,
  CHALLENGES,
  checkMeals,
  counts,
  fetchChallengeLogs,
  programmeWeek,
  weekDates,
  type ChallengeItem,
  type ChallengeLog,
} from '@/lib/meal-challenge';
import { demoChallengeLogs } from '@/lib/__fixtures__/today';
import { statusLine } from '@/components/meal-challenge-card';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const mockFrom = supabase.from as unknown as jest.Mock;

const START = '2026-11-09'; // a Monday
const WEEK1 = CHALLENGES[1];
const WEEK2 = CHALLENGES[2];

type Slot = ChallengeItem['slot'];
const carb = (slot: Slot, carbs_g: number | null = 57): ChallengeItem => ({
  slot, carbs_g, protein_g: null, carbSource: true,
});
const none = (slot: Slot): ChallengeItem => ({ slot, carbs_g: 0, protein_g: 0 });
const protein = (slot: Slot, protein_g: number | null = 19): ChallengeItem => ({
  slot, carbs_g: null, protein_g, proteinSource: true,
});
const fullDay = (date: string): ChallengeLog => ({
  date,
  items: [carb('breakfast'), carb('lunch'), carb('dinner')],
});

describe('the challenges are the decks’ own', () => {
  it('week 1 is a carb at breakfast, lunch and dinner, all three', () => {
    expect(WEEK1).toMatchObject({
      nutrient: 'carb',
      meals: ['breakfast', 'lunch', 'dinner'],
      mealsNeeded: 3,
      rule: 'One addition per meal, three meals a day, every day this week.',
    });
  });

  it('week 2 is protein at 3+ of the four meals its slide lists', () => {
    // "did I hit protein at 3 or more meals today?" over Breakfast, Lunch,
    // Post-training snack and Dinner.
    expect(WEEK2).toMatchObject({
      nutrient: 'protein',
      meals: ['breakfast', 'lunch', 'post_training', 'dinner'],
      mealsNeeded: 3,
      rule: 'One protein add per meal, every day, three meals minimum.',
    });
  });

  it('weeks 3 and 4 have no challenge until their decks arrive', () => {
    expect(CHALLENGES[3]).toBeUndefined();
    expect(CHALLENGES[4]).toBeUndefined();
  });
});

describe('what counts', () => {
  it('a deck source counts for its own nutrient and not the other', () => {
    expect(counts(carb('lunch'), 'carb')).toBe(true);
    expect(counts(protein('lunch'), 'protein')).toBe(true);
    expect(counts(carb('lunch'), 'protein')).toBe(false);
    expect(counts(protein('lunch'), 'carb')).toBe(false);
  });

  it('a figure alone does not make a source', () => {
    // Nasi carries 3 g protein per 100 g in the composition table; a plate of
    // rice is not the protein source the week 2 challenge asks for.
    expect(counts({ carbSource: true }, 'protein')).toBe(false);
    expect(counts(none('lunch'), 'carb')).toBe(false);
  });

  it('never a free-text item the app cannot see into', () => {
    expect(counts({}, 'carb')).toBe(false);
    expect(counts({}, 'protein')).toBe(false);
  });
});

describe('checkMeals', () => {
  it('checks the week’s meals and nothing else', () => {
    const meals = checkMeals([carb('breakfast'), carb('pre_training'), none('dinner')], WEEK1);
    expect(meals).toEqual([
      { slot: 'breakfast', logged: true, hit: true },
      { slot: 'lunch', logged: false, hit: false },
      { slot: 'dinner', logged: true, hit: false },
    ]);
  });

  it('counts post-training in week 2', () => {
    const meals = checkMeals([protein('post_training')], WEEK2);
    expect(meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'post_training', 'dinner']);
    expect(meals[2].hit).toBe(true);
  });

  it('one item is enough to carry a meal', () => {
    expect(checkMeals([none('lunch'), carb('lunch')], WEEK1)[1].hit).toBe(true);
  });
});

describe('the programme calendar', () => {
  it('week 1 is the seven days from day one, week 2 the next seven', () => {
    expect(weekDates(START, 1)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12',
      '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
    expect(weekDates(START, 2)[0]).toBe('2026-11-16');
  });

  it('counts the week today falls in', () => {
    expect(programmeWeek(START, '2026-11-09')).toBe(1);
    expect(programmeWeek(START, '2026-11-15')).toBe(1);
    expect(programmeWeek(START, '2026-11-16')).toBe(2);
    expect(programmeWeek(START, '2026-11-08')).toBe(0);
  });
});

describe('challengeWeek, week 1', () => {
  it('before day one, every day is still to come', () => {
    const week = challengeWeek([], START, '2026-11-05', WEEK1);
    expect(week.phase).toBe('before');
    expect(week.days.every((d) => d.status === 'upcoming')).toBe(true);
    expect(statusLine(week)).toBe('Starts 2026-11-09');
  });

  it('today without all three meals is still in play, not missed', () => {
    const week = challengeWeek(
      [fullDay('2026-11-09'), { date: '2026-11-10', items: [carb('breakfast')] }],
      START,
      '2026-11-10',
      WEEK1
    );
    expect(week.days[1]).toMatchObject({ status: 'today', hits: 1, isToday: true });
    expect(week.streak).toBe(1);
    expect(week.broken).toBe(false);
    expect(statusLine(week)).toBe('1 of 7 days · 1-day streak · today 1/3');
  });

  it('a past day without all three is missed and breaks the run', () => {
    const week = challengeWeek(
      [
        fullDay('2026-11-09'),
        { date: '2026-11-10', items: [carb('breakfast'), carb('lunch'), none('dinner')] },
        fullDay('2026-11-11'),
      ],
      START,
      '2026-11-11',
      WEEK1
    );
    expect(week.days.map((d) => d.status).slice(0, 3)).toEqual(['done', 'missed', 'done']);
    expect(week.streak).toBe(1);
    expect(week.broken).toBe(true);
    expect(week.complete).toBe(false);
  });

  it('a day with nothing logged at all is missed once it is over', () => {
    const week = challengeWeek([fullDay('2026-11-10')], START, '2026-11-10', WEEK1);
    expect(week.days[0].status).toBe('missed');
  });

  it('seven of seven completes the challenge', () => {
    const week = challengeWeek(weekDates(START, 1).map(fullDay), START, '2026-11-15', WEEK1);
    expect(week.complete).toBe(true);
    expect(week.streak).toBe(7);
    expect(statusLine(week)).toBe('7 of 7 days. Challenge complete!');
  });

  it('ignores logs dated after today, so travelling back shows the week as it stood', () => {
    const week = challengeWeek(weekDates(START, 1).map(fullDay), START, '2026-11-11', WEEK1);
    expect(week.doneDays).toBe(3);
    expect(week.days[3]).toMatchObject({ status: 'upcoming', hits: 0 });
  });

  it('once the week is over it reads the tally', () => {
    const week = challengeWeek(demoChallengeLogs(START, 1), START, '2026-11-20', WEEK1);
    expect(week.phase).toBe('over');
    expect(week.doneDays).toBe(5);
    expect(week.streak).toBe(1);
    expect(statusLine(week)).toBe('Week over · 5 of 7 days');
  });
});

describe('challengeWeek, week 2', () => {
  it('runs over the second seven days', () => {
    const week = challengeWeek([], START, '2026-11-18', WEEK2);
    expect(week).toMatchObject({ startsOn: '2026-11-16', endsOn: '2026-11-22', phase: 'running' });
  });

  it('three of the four meals wins a day, so breakfast can be the one missed', () => {
    const day = {
      date: '2026-11-16',
      items: [carb('breakfast'), protein('lunch'), protein('post_training'), protein('dinner')],
    };
    expect(challengeWeek([day], START, '2026-11-17', WEEK2).days[0].status).toBe('done');
  });

  it('two is not enough', () => {
    const day = { date: '2026-11-16', items: [protein('lunch'), protein('dinner')] };
    expect(challengeWeek([day], START, '2026-11-17', WEEK2).days[0]).toMatchObject({
      status: 'missed',
      hits: 2,
    });
  });

  it('says 3+ for today, because four are on offer', () => {
    const day = { date: '2026-11-16', items: [protein('lunch')] };
    expect(statusLine(challengeWeek([day], START, '2026-11-16', WEEK2))).toBe(
      '0 of 7 days · today 1/3+'
    );
  });

  it('the demo week has five days won', () => {
    expect(challengeWeek(demoChallengeLogs(START, 2), START, '2026-11-25', WEEK2).doneDays).toBe(5);
  });
});

describe('fetchChallengeLogs', () => {
  beforeEach(() => jest.clearAllMocks());

  function stub(rows: unknown[]) {
    const calls: Record<string, unknown[]> = {};
    const chain = {
      select: (cols: string) => ((calls.select = [cols]), chain),
      gte: (...a: unknown[]) => ((calls.gte = a), chain),
      lte: (...a: unknown[]) => ((calls.lte = a), chain),
      returns: async () => ({ data: rows, error: null }),
    };
    mockFrom.mockReturnValue(chain);
    return calls;
  }

  const portion = (over: Record<string, unknown>, food: Record<string, unknown> | null) => ({
    carbs_g: null, protein_g: null, ...over,
    food_items: food,
  });

  it('reads the week up to today and knows each deck’s sources', async () => {
    const calls = stub([
      {
        log_date: '2026-11-09',
        log_items: [
          { slot: 'breakfast', quantity: '2', free_text: null,
            food_portions: portion({ carbs_g: '27' }, { name_id: 'Pisang', category: 'fruit', source: 'week-1-deck' }) },
          { slot: 'lunch', quantity: 1, free_text: 'something', food_portions: null },
          { slot: 'dinner', quantity: 1, free_text: null,
            food_portions: portion({ protein_g: '19' }, { name_id: 'Tempe', category: 'protein', source: 'week-2-deck' }) },
          { slot: 'post_training', quantity: 1, free_text: null,
            food_portions: portion({}, { name_id: 'Tahu', category: 'protein', source: 'week-2-deck' }) },
        ],
      },
    ]);
    const logs = await fetchChallengeLogs(START, '2026-11-11', 1);
    expect(calls.gte).toEqual(['log_date', '2026-11-09']);
    expect(calls.lte).toEqual(['log_date', '2026-11-11']);
    expect(logs[0].items).toEqual([
      expect.objectContaining({ slot: 'breakfast', carbs_g: 54, carbSource: true, proteinSource: false }),
      expect.objectContaining({ slot: 'lunch', carbs_g: null, protein_g: null, carbSource: false, proteinSource: false }),
      expect.objectContaining({ slot: 'dinner', protein_g: 19, proteinSource: true }),
      expect.objectContaining({ slot: 'post_training', protein_g: null, proteinSource: true }),
    ]);
  });

  it('stops at the end of the week, and reads nothing before it starts', async () => {
    const calls = stub([]);
    await fetchChallengeLogs(START, '2026-12-01', 2);
    expect(calls.gte).toEqual(['log_date', '2026-11-16']);
    expect(calls.lte).toEqual(['log_date', '2026-11-22']);

    mockFrom.mockClear();
    expect(await fetchChallengeLogs(START, '2026-11-12', 2)).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('reports a refusal the way supabase-js refuses', async () => {
    const chain = {
      select: () => chain,
      gte: () => chain,
      lte: () => chain,
      returns: async () => ({ data: null, error: { message: 'permission denied' } }),
    };
    mockFrom.mockReturnValue(chain);
    await expect(fetchChallengeLogs(START, '2026-11-10', 1)).rejects.toThrow('permission denied');
  });
});
