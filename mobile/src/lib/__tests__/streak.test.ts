import { bestStreak, loggedToday, recentDays, streakLength } from '@/lib/streak';

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    expect(streakLength(['2026-10-31', '2026-10-30', '2026-10-29'], '2026-10-31')).toBe(3);
  });

  it('is zero with nothing logged', () => {
    expect(streakLength([], '2026-10-31')).toBe(0);
  });

  it('survives the night before today is logged', () => {
    // A streak must not be lost at midnight for a day still being lived.
    expect(streakLength(['2026-10-30', '2026-10-29'], '2026-10-31')).toBe(2);
  });

  it('breaks once a whole day has passed with nothing logged', () => {
    expect(streakLength(['2026-10-29', '2026-10-28'], '2026-10-31')).toBe(0);
  });

  it('stops at the first gap rather than counting every active day', () => {
    expect(streakLength(['2026-10-31', '2026-10-30', '2026-10-27', '2026-10-26'], '2026-10-31')).toBe(2);
  });

  it('counts a duplicated date once', () => {
    expect(streakLength(['2026-10-31', '2026-10-31', '2026-10-30'], '2026-10-31')).toBe(2);
  });

  it('ignores dates in the future', () => {
    expect(streakLength(['2026-11-05', '2026-10-31', '2026-10-30'], '2026-10-31')).toBe(2);
  });

  it('crosses a month boundary', () => {
    expect(streakLength(['2026-11-01', '2026-10-31', '2026-10-30'], '2026-11-01')).toBe(3);
  });

  it('crosses a year boundary', () => {
    expect(streakLength(['2027-01-01', '2026-12-31'], '2027-01-01')).toBe(2);
  });

  it('is unmoved by a British Summer Time boundary', () => {
    // Parsed as UTC midnight, so a clock change cannot add or drop a day.
    expect(streakLength(['2026-03-30', '2026-03-29', '2026-03-28'], '2026-03-30')).toBe(3);
  });

  it('survives a malformed date rather than throwing', () => {
    expect(streakLength(['not-a-date', '2026-10-31'], '2026-10-31')).toBe(1);
  });
});

describe('logged today', () => {
  it('is true only when today itself is on the board', () => {
    expect(loggedToday(['2026-10-31'], '2026-10-31')).toBe(true);
    expect(loggedToday(['2026-10-30'], '2026-10-31')).toBe(false);
  });
});

describe('the week strip', () => {
  it('ends on today and runs seven days', () => {
    const days = recentDays(['2026-10-31'], '2026-10-31');
    expect(days).toHaveLength(7);
    expect(days[6].date).toBe('2026-10-31');
    expect(days[0].date).toBe('2026-10-25');
  });

  it('marks exactly one cell as today', () => {
    const days = recentDays([], '2026-10-31');
    expect(days.filter((d) => d.isToday).map((d) => d.date)).toEqual(['2026-10-31']);
  });

  it('lights only the days that were logged', () => {
    const days = recentDays(['2026-10-31', '2026-10-29'], '2026-10-31');
    expect(days.filter((d) => d.active).map((d) => d.date)).toEqual(['2026-10-29', '2026-10-31']);
  });

  it('leaves today unlit until it is logged, without breaking the run', () => {
    // An open day is not a lost day. The cell is dark and the streak still counts.
    const days = recentDays(['2026-10-30'], '2026-10-31');
    expect(days[6].active).toBe(false);
    expect(streakLength(['2026-10-30'], '2026-10-31')).toBe(1);
  });

  it('carries the weekday initial for each cell', () => {
    // 31 Oct 2026 is a Saturday.
    expect(recentDays([], '2026-10-31').map((d) => d.initial)).toEqual([
      'S', 'M', 'T', 'W', 'T', 'F', 'S',
    ]);
  });

  it('ignores a date in the future', () => {
    expect(recentDays(['2026-11-05'], '2026-10-31').some((d) => d.active)).toBe(false);
  });

  it('is empty for an unparseable date', () => {
    expect(recentDays(['2026-10-31'], 'not-a-date')).toEqual([]);
  });

  it('honours a different window', () => {
    expect(recentDays([], '2026-10-31', 3).map((d) => d.date)).toEqual([
      '2026-10-29', '2026-10-30', '2026-10-31',
    ]);
  });
});

describe('the best streak', () => {
  it('is zero with nothing logged', () => {
    expect(bestStreak([], '2026-10-31')).toBe(0);
  });

  it('finds the longest run, not the latest one', () => {
    const dates = [
      '2026-10-31', '2026-10-30',
      '2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24',
    ];
    expect(streakLength(dates, '2026-10-31')).toBe(2);
    expect(bestStreak(dates, '2026-10-31')).toBe(4);
  });

  it('equals the current streak when the current run is the best one', () => {
    const dates = ['2026-10-31', '2026-10-30', '2026-10-29'];
    expect(bestStreak(dates, '2026-10-31')).toBe(3);
  });

  it('counts a single day as one', () => {
    expect(bestStreak(['2026-10-20'], '2026-10-31')).toBe(1);
  });

  it('counts a duplicated date once', () => {
    expect(bestStreak(['2026-10-30', '2026-10-30', '2026-10-31'], '2026-10-31')).toBe(2);
  });

  it('ignores dates in the future', () => {
    // A run that only exists because of tomorrow is not a run.
    expect(bestStreak(['2026-11-01', '2026-10-31'], '2026-10-31')).toBe(1);
  });
});
