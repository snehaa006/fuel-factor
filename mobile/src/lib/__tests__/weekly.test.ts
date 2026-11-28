import { programmeState } from '@/lib/programme';
import {
  canRead,
  checkInStatus,
  checkInOpen,
  dayOfWeek,
  weekAccess,
  weekDates,
  weekOfProgramme,
  weekToCheck,
} from '@/lib/weekly';

const START = '2026-10-28';
const on = (today: string) => programmeState(START, today);

describe('which week the programme is in', () => {
  it('counts seven days to a week from day one', () => {
    expect(weekOfProgramme(on('2026-10-28'))).toBe(1);
    expect(weekOfProgramme(on('2026-11-03'))).toBe(1); // day 7
    expect(weekOfProgramme(on('2026-11-04'))).toBe(2); // day 8
    expect(weekOfProgramme(on('2026-11-24'))).toBe(4); // day 28, the last
    expect(weekOfProgramme(on('2026-11-25'))).toBe(5); // over
  });

  it('knows the day of the week, one to seven', () => {
    expect(dayOfWeek(on('2026-10-28'))).toBe(1);
    expect(dayOfWeek(on('2026-11-03'))).toBe(7);
    expect(dayOfWeek(on('2026-11-04'))).toBe(1);
  });

  it('has no week before the start, and none without a programme', () => {
    expect(weekOfProgramme(on('2026-10-20'))).toBe(0);
    expect(weekOfProgramme(programmeState(null, '2026-11-01'))).toBeNull();
    expect(weekOfProgramme(null)).toBeNull();
  });
});

describe('Learn follows the week', () => {
  /** Sofia: "in tandem with the week that the athlete is on". */
  it('leads with the current week and keeps the earlier ones open', () => {
    const week2 = on('2026-11-06');
    expect(weekAccess(2, week2)).toEqual({ state: 'current' });
    expect(weekAccess(1, week2)).toEqual({ state: 'past' });
    expect(canRead(weekAccess(1, week2))).toBe(true);
  });

  it('locks a later week and says the day it opens', () => {
    const week2 = on('2026-11-06');
    expect(weekAccess(3, week2)).toEqual({ state: 'future', opensOn: '2026-11-11' });
    expect(weekAccess(4, week2)).toEqual({ state: 'future', opensOn: '2026-11-18' });
    expect(canRead(weekAccess(3, week2))).toBe(false);
  });

  it('opens week 2 on its first morning, not before', () => {
    expect(canRead(weekAccess(2, on('2026-11-03')))).toBe(false);
    expect(canRead(weekAccess(2, on('2026-11-04')))).toBe(true);
  });

  it('opens everything once the programme is over', () => {
    const after = on('2026-12-02');
    for (const week of [1, 2, 3, 4]) expect(weekAccess(week, after)).toEqual({ state: 'past' });
  });

  it('opens everything when there is no programme to follow', () => {
    // A coach, or a squad with no first day.
    for (const week of [1, 2, 3, 4]) {
      expect(weekAccess(week, null)).toEqual({ state: 'open' });
      expect(weekAccess(week, programmeState(null, '2026-11-01'))).toEqual({ state: 'open' });
    }
  });
});

describe('the check-in window', () => {
  it('knows the dates of a programme week', () => {
    expect(weekDates(START, 1)).toEqual({ from: '2026-10-28', to: '2026-11-03' });
    expect(weekDates(START, 4)).toEqual({ from: '2026-11-18', to: '2026-11-24' });
  });

  it('opens a week’s check-in from its sixth day', () => {
    expect(checkInOpen(1, on('2026-11-01'))).toBe(false); // week 1, day 5
    expect(checkInOpen(1, on('2026-11-02'))).toBe(true); // week 1, day 6
  });

  it('keeps an earlier week’s open, and every week’s once the programme is over', () => {
    expect(checkInOpen(1, on('2026-11-06'))).toBe(true);
    expect(checkInOpen(3, on('2026-11-06'))).toBe(false);
    for (const week of [1, 2, 3, 4]) expect(checkInOpen(week, on('2026-12-01'))).toBe(true);
  });

  it('is shut before day one and without a programme', () => {
    expect(checkInOpen(1, on('2026-10-20'))).toBe(false);
    expect(checkInOpen(1, null)).toBe(false);
  });
});

describe('when the check is offered', () => {
  const written = [1, 2, 3, 4];
  const none = () => false;

  it('offers last week’s check at the start of the next week', () => {
    // Theo: "before they move on to the next week".
    expect(weekToCheck(on('2026-11-05'), none, written)).toBe(1); // week 2, day 2
  });

  it('offers this week’s check from its sixth day', () => {
    expect(weekToCheck(on('2026-11-02'), none, written)).toBe(1); // week 1, day 6
    expect(weekToCheck(on('2026-10-30'), none, written)).toBeNull(); // week 1, day 3
  });

  it('keeps last week’s on offer until it is done', () => {
    const doneWeek2 = (w: number) => w === 2;
    // Week 2, day 6: week 2's is done, week 1's is not.
    expect(weekToCheck(on('2026-11-09'), doneWeek2, written)).toBe(1);
  });

  it('stops once it is done', () => {
    expect(weekToCheck(on('2026-11-05'), (w) => w === 1, written)).toBeNull();
  });

  it('offers week 4’s after the programme ends', () => {
    expect(weekToCheck(on('2026-11-30'), none, written)).toBe(4);
  });

  it('never offers a week the programme has not written', () => {
    expect(weekToCheck(on('2026-11-05'), none, [2, 3, 4])).toBeNull();
  });

  it('offers nothing before day one or without a programme', () => {
    expect(weekToCheck(on('2026-10-20'), none, written)).toBeNull();
    expect(weekToCheck(null, none, written)).toBeNull();
  });
});

describe('the check-in line on Today', () => {
  const START = '2026-10-28';
  const all = [1, 2, 3, 4];
  const on = (date: string) => programmeState(START, date);
  const doneUpTo = (n: number) => (week: number) => week <= n;

  it('says when this week’s opens, early in the week', () => {
    // Week 4, day 3: week 3 is in, week 4's opens on its sixth day.
    expect(checkInStatus(on('2026-11-20'), doneUpTo(3), all)).toEqual({
      kind: 'upcoming',
      week: 4,
      opensOn: '2026-11-23',
    });
  });

  it('is due from the sixth day until it is in', () => {
    expect(checkInStatus(on('2026-11-23'), doneUpTo(3), all)).toEqual({ kind: 'due', week: 4 });
    // Last week's, still missing, is due before anything else.
    expect(checkInStatus(on('2026-11-20'), doneUpTo(2), all)).toEqual({ kind: 'due', week: 3 });
  });

  it('shows it done once it is in, so the answers can be looked at', () => {
    expect(checkInStatus(on('2026-11-24'), doneUpTo(4), all)).toEqual({ kind: 'done', week: 4 });
    expect(checkInStatus(on('2026-12-12'), doneUpTo(4), all)).toEqual({ kind: 'done', week: 4 });
  });

  it('says nothing before day one', () => {
    expect(checkInStatus(on('2026-10-20'), doneUpTo(0), all)).toBeNull();
  });
});
