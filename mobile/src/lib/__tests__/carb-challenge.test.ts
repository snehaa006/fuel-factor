import {
  challengeWeek,
  checkMeals,
  countsAsCarb,
  fetchChallengeLogs,
  programmeWeek,
  weekDates,
  type ChallengeItem,
  type ChallengeLog,
} from '@/lib/carb-challenge';
import { demoChallengeLogs } from '@/lib/__fixtures__/today';
import { statusLine } from '@/components/carb-challenge-card';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const mockFrom = supabase.from as unknown as jest.Mock;

const START = '2026-11-09'; // a Monday

const carb = (slot: ChallengeItem['slot'], carbs_g: number | null = 57): ChallengeItem => ({
  slot,
  carbs_g,
  deckCarbSource: true,
});
const none = (slot: ChallengeItem['slot']): ChallengeItem => ({
  slot,
  carbs_g: 0,
  deckCarbSource: false,
});
const fullDay = (date: string): ChallengeLog => ({
  date,
  items: [carb('breakfast'), carb('lunch'), carb('dinner')],
});

describe('what counts as a carb', () => {
  it('a portion with a carbohydrate figure above zero', () => {
    expect(countsAsCarb(carb('lunch', 27))).toBe(true);
    expect(countsAsCarb(none('lunch'))).toBe(false);
  });

  it('a deck food with no figure yet, because the deck lists it as a carb source', () => {
    expect(countsAsCarb({ slot: 'lunch', carbs_g: null, deckCarbSource: true })).toBe(true);
  });

  it('never a free-text item the app cannot see into', () => {
    expect(countsAsCarb({ slot: 'lunch', carbs_g: null, deckCarbSource: false })).toBe(false);
  });

  it('a zero figure wins over the table it came from', () => {
    expect(countsAsCarb({ slot: 'lunch', carbs_g: 0, deckCarbSource: true })).toBe(false);
  });
});

describe('checkMeals', () => {
  it('checks breakfast, lunch and dinner and nothing else', () => {
    const meals = checkMeals([carb('breakfast'), carb('pre_training'), none('dinner')]);
    expect(meals).toEqual([
      { slot: 'breakfast', logged: true, carb: true },
      { slot: 'lunch', logged: false, carb: false },
      { slot: 'dinner', logged: true, carb: false },
    ]);
  });

  it('one carb item is enough to carry a meal', () => {
    expect(checkMeals([none('lunch'), carb('lunch')])[1].carb).toBe(true);
  });
});

describe('the programme calendar', () => {
  it('week 1 is the seven days from day one', () => {
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

describe('challengeWeek', () => {
  it('before day one, every day is still to come', () => {
    const week = challengeWeek([], START, '2026-11-05');
    expect(week.phase).toBe('before');
    expect(week.days.every((d) => d.status === 'upcoming')).toBe(true);
    expect(statusLine(week)).toBe('Starts on 2026-11-09.');
  });

  it('today without all three meals is still in play, not missed', () => {
    const week = challengeWeek(
      [fullDay('2026-11-09'), { date: '2026-11-10', items: [carb('breakfast')] }],
      START,
      '2026-11-10'
    );
    expect(week.days[1]).toMatchObject({ status: 'today', carbMeals: 1, isToday: true });
    expect(week.streak).toBe(1);
    expect(week.broken).toBe(false);
    expect(statusLine(week)).toBe('1 of 7 days so far. 1-day streak. Today: 1 of 3 meals so far.');
  });

  it('a past day without all three is missed and breaks the run', () => {
    const week = challengeWeek(
      [
        fullDay('2026-11-09'),
        { date: '2026-11-10', items: [carb('breakfast'), carb('lunch'), none('dinner')] },
        fullDay('2026-11-11'),
      ],
      START,
      '2026-11-11'
    );
    expect(week.days.map((d) => d.status).slice(0, 3)).toEqual(['done', 'missed', 'done']);
    expect(week.streak).toBe(1);
    expect(week.broken).toBe(true);
    expect(week.complete).toBe(false);
  });

  it('a day with nothing logged at all is missed once it is over', () => {
    const week = challengeWeek([fullDay('2026-11-10')], START, '2026-11-10');
    expect(week.days[0].status).toBe('missed');
  });

  it('seven of seven completes the challenge', () => {
    const logs = weekDates(START, 1).map(fullDay);
    const week = challengeWeek(logs, START, '2026-11-15');
    expect(week.complete).toBe(true);
    expect(week.streak).toBe(7);
    expect(statusLine(week)).toBe('All 7 days. Challenge complete!');
  });

  it('ignores logs dated after today, so travelling back shows the week as it stood', () => {
    const logs = weekDates(START, 1).map(fullDay);
    const week = challengeWeek(logs, START, '2026-11-11');
    expect(week.doneDays).toBe(3);
    expect(week.days[3].status).toBe('upcoming');
    expect(week.days[3].carbMeals).toBe(0);
  });

  it('once the week is over it reads the tally', () => {
    const week = challengeWeek(demoChallengeLogs(START), START, '2026-11-20');
    expect(week.phase).toBe('over');
    expect(week.doneDays).toBe(5);
    expect(week.streak).toBe(1);
    expect(statusLine(week)).toBe('Week over: 5 of 7 days.');
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

  it('reads week 1 up to today and turns portions into carb figures', async () => {
    const calls = stub([
      {
        log_date: '2026-11-09',
        log_items: [
          { slot: 'breakfast', quantity: '2', food_portions: { carbs_g: '27', food_items: { source: 'week-1-deck' } } },
          { slot: 'lunch', quantity: 1, food_portions: null },
          { slot: 'dinner', quantity: 1, food_portions: { carbs_g: null, food_items: { source: 'week-1-deck' } } },
        ],
      },
    ]);
    const logs = await fetchChallengeLogs(START, '2026-11-11');
    expect(calls.gte).toEqual(['log_date', '2026-11-09']);
    expect(calls.lte).toEqual(['log_date', '2026-11-11']);
    expect(logs[0].items).toEqual([
      { slot: 'breakfast', carbs_g: 54, deckCarbSource: true },
      { slot: 'lunch', carbs_g: null, deckCarbSource: false },
      { slot: 'dinner', carbs_g: null, deckCarbSource: true },
    ]);
  });

  it('stops at the end of the week, and reads nothing before it starts', async () => {
    const calls = stub([]);
    await fetchChallengeLogs(START, '2026-12-01');
    expect(calls.lte).toEqual(['log_date', '2026-11-15']);

    mockFrom.mockClear();
    expect(await fetchChallengeLogs(START, '2026-11-01')).toEqual([]);
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
    await expect(fetchChallengeLogs(START, '2026-11-10')).rejects.toThrow('permission denied');
  });
});
