import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isIsoDate,
  restoreSimulatedDate,
  setSimulatedDate,
  shiftDate,
  simulatedDate,
  TIME_MACHINE_ENABLED,
} from '@/lib/clock';
import { programmeState } from '@/lib/programme';
import { recallWindow } from '@/lib/recall-window';
import { todayIso } from '@/lib/today';

afterEach(() => setSimulatedDate(null));

describe('the time machine', () => {
  it('is on in development, which is what jest runs as', () => {
    expect(TIME_MACHINE_ENABLED).toBe(true);
  });

  it('makes todayIso answer with the chosen date', () => {
    setSimulatedDate('2026-11-10');
    expect(todayIso()).toBe('2026-11-10');
    expect(simulatedDate()).toBe('2026-11-10');
  });

  it('never changes the answer about a specific instant', () => {
    // Tests and the pill's "real today" both pass an instant, and must get
    // that instant's date whatever the machine is set to.
    setSimulatedDate('2030-01-01');
    expect(todayIso(new Date(2026, 10, 3, 12))).toBe('2026-11-03');
  });

  it('comes back to the real today on null', () => {
    setSimulatedDate('2026-11-10');
    setSimulatedDate(null);
    expect(simulatedDate()).toBeNull();
    expect(todayIso()).toBe(todayIso(new Date()));
  });

  it('refuses something that is not a calendar date', () => {
    expect(() => setSimulatedDate('2026-02-31')).toThrow('Not a date');
    expect(() => setSimulatedDate('10/11/2026')).toThrow('Not a date');
    expect(simulatedDate()).toBeNull();
  });

  it('remembers the date across a reload', async () => {
    setSimulatedDate('2026-11-17');
    await Promise.resolve();
    expect(await AsyncStorage.getItem('fuel-factor.simulated-date')).toBe('2026-11-17');

    setSimulatedDate(null);
    await AsyncStorage.setItem('fuel-factor.simulated-date', '2026-11-20');
    await restoreSimulatedDate();
    expect(todayIso()).toBe('2026-11-20');
  });

  it('ignores a remembered value that is not a date', async () => {
    await AsyncStorage.setItem('fuel-factor.simulated-date', 'garbage');
    await restoreSimulatedDate();
    expect(simulatedDate()).toBeNull();
  });
});

describe('shiftDate and isIsoDate', () => {
  it('steps across a month end', () => {
    expect(shiftDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDate('2026-12-01', -1)).toBe('2026-11-30');
  });

  it('knows a real date from an impossible one', () => {
    expect(isIsoDate('2026-11-03')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });
});

/**
 * What the time machine is for: the app on a given day behaves as it would
 * really behave on that day. The rules below are pure and already tested on
 * their own; these walk one athlete through the programme's calendar by
 * moving the machine, the way a tester would.
 */
describe('travelling through the programme', () => {
  const startsOn = '2026-11-09';

  it('before day one, the baseline recall is the whole app', () => {
    setSimulatedDate('2026-11-05');
    expect(programmeState(startsOn, todayIso()).status).toBe('before');
    expect(recallWindow([], startsOn, todayIso())).toMatchObject({
      status: 'due',
      round: 'baseline',
      dayNumber: 1,
    });
  });

  it('in week 1 with the baseline in, logging is open and the follow-up waits', () => {
    setSimulatedDate('2026-11-11');
    expect(programmeState(startsOn, todayIso())).toMatchObject({ status: 'open', day: 3 });
    expect(recallWindow([1, 2, 3], startsOn, todayIso())).toEqual({
      status: 'waiting',
      opensOn: '2026-12-07',
      daysUntil: 26,
    });
  });

  it('four weeks on, the follow-up recall is asked for', () => {
    setSimulatedDate('2026-12-07');
    expect(recallWindow([1, 2, 3], startsOn, todayIso())).toMatchObject({
      status: 'due',
      round: 'follow-up',
      dayNumber: 4,
      position: 1,
    });
  });
});
