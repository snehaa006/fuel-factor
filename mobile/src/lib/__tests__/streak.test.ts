import { loggedToday, streakLength } from '@/lib/streak';

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
