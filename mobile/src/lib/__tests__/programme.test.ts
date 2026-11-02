import { isProgrammeOpen, programmeState, waitingLine } from '@/lib/programme';
import { PROGRAMME_DAYS } from '@/lib/recall-window';

/**
 * The four weeks, and whether they have started.
 *
 * "In every research, we have a baseline, and then we have an intervention,
 * and then we see the post effects." The date is what separates the first two,
 * and before this the app only used it to count the follow-up recall from.
 */
describe('programmeState', () => {
  it('is open on the morning of day one', () => {
    // Not the day after. An athlete whose programme starts today logs today.
    expect(programmeState('2026-11-10', '2026-11-10')).toEqual({
      status: 'open',
      startsOn: '2026-11-10',
      day: 1,
      of: PROGRAMME_DAYS,
    });
  });

  it('counts from one, so nobody is shown a day zero', () => {
    expect(programmeState('2026-11-10', '2026-11-23')).toMatchObject({ status: 'open', day: 14 });
  });

  it('stays open past the four weeks rather than shutting the app', () => {
    // The follow-up recall is asked for at four weeks and the squad keeps
    // logging while they fill it. Day 40 of 28 would be odd to print, which
    // is why `of` is carried beside `day` and the screens decide.
    expect(programmeState('2026-11-10', '2026-12-20')).toMatchObject({ status: 'open', day: 41 });
  });

  it('is shut the day before, with the wait in days', () => {
    expect(programmeState('2026-11-10', '2026-11-09')).toEqual({
      status: 'before',
      startsOn: '2026-11-10',
      daysUntil: 1,
    });
  });

  it('is neither open nor counting down when the coach has set no date', () => {
    // Not the same as "before": nobody knows when it starts, so there is no
    // countdown to show and only the coach can fix it.
    expect(programmeState(null, '2026-11-09')).toEqual({ status: 'no-date' });
  });
});

describe('isProgrammeOpen', () => {
  it('is the one question every gated screen asks', () => {
    expect(isProgrammeOpen(programmeState('2026-11-10', '2026-11-10'))).toBe(true);
    expect(isProgrammeOpen(programmeState('2026-11-10', '2026-11-09'))).toBe(false);
  });

  it('is false with no date, so a missing one never opens the app', () => {
    // A screen testing `status === 'before'` would let this through, which is
    // exactly why there is a function rather than a comparison.
    expect(isProgrammeOpen(programmeState(null, '2026-11-09'))).toBe(false);
  });
});

describe('waitingLine', () => {
  it('names the day and the wait', () => {
    expect(waitingLine(programmeState('2026-11-10', '2026-11-01'))).toBe(
      'The programme starts in 9 days, on 2026-11-10.'
    );
  });

  it('says tomorrow rather than in 1 days', () => {
    expect(waitingLine(programmeState('2026-11-10', '2026-11-09'))).toBe(
      'The programme starts tomorrow.'
    );
  });

  it('points at the coach when there is no date, because only they can set it', () => {
    expect(waitingLine(programmeState(null, '2026-11-09'))).toMatch(/coach has not set/);
  });

  it('counts the day once it is running', () => {
    expect(waitingLine(programmeState('2026-11-10', '2026-11-12'))).toBe('Day 3 of 28.');
  });
});
