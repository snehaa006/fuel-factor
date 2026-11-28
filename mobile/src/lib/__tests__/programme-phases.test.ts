import { factPlace } from '../daily-facts';
import { lastProgrammeDay, loggingAsOf, programmeOver, programmeState } from '../programme';

// The demo squad's programme: day one Wednesday 28 October, day 28 Tuesday 24 November.
const START = '2026-10-28';
const on = (date: string) => programmeState(START, date);

describe('the programme’s three phases', () => {
  it('ends on day 28', () => {
    expect(lastProgrammeDay(START)).toBe('2026-11-24');
  });

  it('is running from day one to day 28, and over from day 29', () => {
    expect(programmeOver(on('2026-10-27'))).toBe(false); // before day one
    expect(programmeOver(on('2026-10-28'))).toBe(false); // day 1
    expect(programmeOver(on('2026-11-24'))).toBe(false); // day 28, the last
    expect(programmeOver(on('2026-11-25'))).toBe(true); // day 29
    expect(programmeOver(on('2026-12-12'))).toBe(true); // the pitch
    expect(programmeOver(programmeState(null, '2026-12-12'))).toBe(false); // no date: nobody knows
    expect(programmeOver(null)).toBe(false);
  });
});

describe('a "last N days" window', () => {
  it('ends today while the four weeks run', () => {
    expect(loggingAsOf('2026-11-10', START)).toBe('2026-11-10');
    expect(loggingAsOf('2026-11-24', START)).toBe('2026-11-24');
  });

  it('ends on the last programme day once logging has closed', () => {
    expect(loggingAsOf('2026-11-25', START)).toBe('2026-11-24');
    expect(loggingAsOf('2026-12-12', START)).toBe('2026-11-24');
  });

  it('is today when there is no programme date', () => {
    expect(loggingAsOf('2026-12-12', null)).toBe('2026-12-12');
  });
});

describe('the fact of the day', () => {
  it('walks the week a day at a time', () => {
    expect(factPlace(on('2026-10-28'))).toEqual({ week: 1, day: 1 });
    expect(factPlace(on('2026-11-03'))).toEqual({ week: 1, day: 7 });
    expect(factPlace(on('2026-11-04'))).toEqual({ week: 2, day: 1 });
    expect(factPlace(on('2026-11-24'))).toEqual({ week: 4, day: 7 });
  });

  it('is not shown before day one or after day 28', () => {
    expect(factPlace(on('2026-10-27'))).toBeNull();
    expect(factPlace(on('2026-11-25'))).toBeNull();
    expect(factPlace(null)).toBeNull();
  });
});
