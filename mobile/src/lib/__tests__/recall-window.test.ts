import {
  BASELINE_DAYS,
  FOLLOW_UP_DAYS,
  PROGRAMME_DAYS,
  PROGRAMME_WEEKS,
  RECALL_DAYS,
  ROUND_LABEL,
  daysBetween,
  followUpOpensOn,
  isIsoDate,
  positionInRound,
  recallWindow,
  roundOf,
} from '@/lib/recall-window';

/**
 * The recall rounds are the programme's design, not the app's.
 *
 * Three days at baseline and three more four weeks on, both from the 30
 * October call. These tests are written against the numbers in the transcript
 * so that changing one of them has to be a deliberate act with a reason.
 */
describe('the programme’s shape', () => {
  it('is a three-day recall', () => {
    // "we took a three-day recall already ... so we've done our baseline"
    expect(RECALL_DAYS).toBe(3);
    expect(BASELINE_DAYS).toHaveLength(3);
    expect(FOLLOW_UP_DAYS).toHaveLength(3);
  });

  it('runs for four weeks', () => {
    // "post one month, the app can prompt the participant to try to fulfill
    // the data again or food recalls"
    expect(PROGRAMME_WEEKS).toBe(4);
    expect(PROGRAMME_DAYS).toBe(28);
  });

  it('continues the sheet’s own day numbering rather than restarting it', () => {
    // The baseline occupies day_number 1-3 in the tracker, so the follow-up
    // has to be 4-6: a second day 1 would collide on (participant, day).
    expect([...BASELINE_DAYS]).toEqual([1, 2, 3]);
    expect([...FOLLOW_UP_DAYS]).toEqual([4, 5, 6]);
  });

  it('names the rounds without naming a theme nobody has written', () => {
    expect(ROUND_LABEL.baseline).toBe('Before you start');
    expect(ROUND_LABEL['follow-up']).toBe('Four weeks on');
  });
});

describe('recallWindow', () => {
  const today = '2026-11-01';

  it('asks for day 1 when nothing has been recorded', () => {
    expect(recallWindow([], null, today)).toEqual({
      status: 'due',
      round: 'baseline',
      dayNumber: 1,
      position: 1,
      done: 0,
      of: 3,
    });
  });

  it('asks for the baseline before a programme date exists', () => {
    // A squad that has just joined has no start date, and the three days are
    // exactly what has to happen before the coach sets one.
    const window = recallWindow([1], null, today);
    expect(window).toMatchObject({ status: 'due', round: 'baseline', dayNumber: 2, done: 1 });
  });

  it('fills the first gap rather than the next number', () => {
    // A day 2 saved before day 1 must not leave day 1 unasked for.
    expect(recallWindow([2, 3], null, today)).toMatchObject({ dayNumber: 1, done: 2 });
  });

  it('waits once the baseline is in and the four weeks are running', () => {
    expect(recallWindow([1, 2, 3], '2026-10-25', today)).toEqual({
      status: 'waiting',
      opensOn: '2026-11-22',
      daysUntil: 21,
    });
  });

  it('says nothing at all when the baseline is in and no date is set', () => {
    // Guessing a start date would put the follow-up on a day the coach never
    // chose, so the app asks for nothing and says why elsewhere.
    expect(recallWindow([1, 2, 3], null, today)).toEqual({
      status: 'none',
      reason: 'no-programme-date',
    });
  });

  it('opens the follow-up exactly four weeks after day one', () => {
    const start = '2026-10-04';
    expect(followUpOpensOn(start)).toBe('2026-11-01');
    expect(recallWindow([1, 2, 3], start, today)).toMatchObject({
      status: 'due',
      round: 'follow-up',
      dayNumber: 4,
      done: 0,
    });
  });

  it('is still shut the day before the four weeks are up', () => {
    expect(recallWindow([1, 2, 3], '2026-10-05', today)).toMatchObject({
      status: 'waiting',
      daysUntil: 1,
    });
  });

  it('counts the follow-up’s own days', () => {
    expect(recallWindow([1, 2, 3, 4], '2026-10-04', today)).toMatchObject({
      round: 'follow-up',
      dayNumber: 5,
      done: 1,
    });
  });

  it('stops asking once both rounds are complete', () => {
    expect(recallWindow([1, 2, 3, 4, 5, 6], '2026-10-04', today)).toEqual({
      status: 'none',
      reason: 'complete',
    });
  });

  it('asks for the baseline even after the four weeks, if it was never filled', () => {
    // A baseline collected late is a poor baseline and is still the only one
    // there will be. Skipping to the follow-up would lose it entirely.
    expect(recallWindow([4, 5], '2026-10-04', today)).toMatchObject({
      round: 'baseline',
      dayNumber: 1,
    });
  });

  it('ignores a day number from neither round', () => {
    // Nothing writes a day 9, but a stray row must not be counted as progress
    // through a round it is not in.
    expect(recallWindow([9], null, today)).toMatchObject({ round: 'baseline', dayNumber: 1 });
  });
});

describe('roundOf', () => {
  it('places each day in its round', () => {
    expect([1, 2, 3].map(roundOf)).toEqual(['baseline', 'baseline', 'baseline']);
    expect([4, 5, 6].map(roundOf)).toEqual(['follow-up', 'follow-up', 'follow-up']);
  });
});

describe('positionInRound', () => {
  it('counts the baseline straight through', () => {
    expect([1, 2, 3].map(positionInRound)).toEqual([1, 2, 3]);
  });

  it('restarts the follow-up at one', () => {
    // The tracker numbers recall days continuously because they share one
    // unique key per participant, so the follow-up's rows are 4 to 6. An
    // athlete is only ever doing three days, and a screen reading "Day 4 of 3"
    // is nonsense to the 14 year old holding it.
    expect([4, 5, 6].map(positionInRound)).toEqual([1, 2, 3]);
  });

  it('is reported on the window, so screens never do the arithmetic', () => {
    const window = recallWindow([1, 2, 3], '2026-10-04', '2026-11-01');
    expect(window).toMatchObject({ dayNumber: 4, position: 1, of: 3 });
  });
});

describe('daysBetween', () => {
  it('counts forwards and backwards', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
    expect(daysBetween('2026-11-01', '2026-11-01')).toBe(0);
  });

  it('is not thrown off by a month or a year boundary', () => {
    expect(daysBetween('2026-10-25', '2026-11-01')).toBe(7);
    expect(daysBetween('2026-12-28', '2027-01-04')).toBe(7);
  });
});

describe('isIsoDate', () => {
  it('accepts a real date', () => {
    expect(isIsoDate('2026-11-01')).toBe(true);
  });

  it('rejects a date that is not one', () => {
    // There is no date picker in this project, so the coach types it. '2026-02-31'
    // parses to the 3rd of March, which would move the follow-up by two days.
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });

  it('rejects anything that is not the format', () => {
    for (const text of ['', '01-11-2026', '2026-11-1', 'tomorrow', '2026/11/01']) {
      expect(`${text}: ${isIsoDate(text)}`).toBe(`${text}: false`);
    }
  });
});
