import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { monthGrid, shortDate } from '@/components/calendar';
import { TimeMachine } from '@/components/time-machine';
import { setSimulatedDate, shiftDate, simulatedDate } from '@/lib/clock';
import { todayIso } from '@/lib/today';

afterEach(async () => {
  await act(async () => setSimulatedDate(null));
});

describe('the time machine pill', () => {
  it('shows the real date until a date is chosen', async () => {
    await render(<TimeMachine />);
    expect(screen.getByText('REAL DATE')).toBeTruthy();
    expect(screen.getByTestId('time-machine-date')).toHaveTextContent(shortDate(todayIso(new Date())));
  });

  it('steps a day at a time, which is how a month gets logged in one sitting', async () => {
    // Anchored well away from the real today, in both directions. Stepping
    // *onto* the real date clears the simulation by design, so a test with a
    // hardcoded anchor passes until the calendar reaches it and then fails
    // for a day -- which is exactly what happened on 11 November 2026.
    const anchor = shiftDate(todayIso(new Date()), -30);
    // Nothing is mounted yet, so nothing re-renders and no act is needed.
    setSimulatedDate(anchor);
    await render(<TimeMachine />);
    expect(screen.getByText('TIME MACHINE')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('time-machine-forward'));
    expect(simulatedDate()).toBe(shiftDate(anchor, 1));
    await fireEvent.press(screen.getByTestId('time-machine-back'));
    await fireEvent.press(screen.getByTestId('time-machine-back'));
    expect(simulatedDate()).toBe(shiftDate(anchor, -1));
  });

  it('jumps to a day picked from the calendar, and back to the real today', async () => {
    // Nothing is mounted yet, so nothing re-renders and no act is needed.
    setSimulatedDate('2026-11-10');
    await render(<TimeMachine />);

    await fireEvent.press(screen.getByTestId('time-machine-open'));
    expect(screen.getByTestId('time-machine-month')).toHaveTextContent('November 2026');
    // The 23rd, unless the real today is the 23rd, in which case picking it
    // would clear the simulation rather than jump to it.
    const pick = todayIso(new Date()) === '2026-11-23' ? '2026-11-24' : '2026-11-23';
    await fireEvent.press(screen.getByTestId(`time-machine-day-${pick}`));
    expect(simulatedDate()).toBe(pick);

    await fireEvent.press(screen.getByTestId('time-machine-open'));
    await fireEvent.press(screen.getByTestId('time-machine-footer'));
    expect(simulatedDate()).toBeNull();
  });
});

describe('monthGrid', () => {
  it('puts the 1st under its weekday, Monday first', () => {
    // 1 November 2026 is a Sunday: six blanks, then the 1st.
    const cells = monthGrid(2026, 10);
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(cells[cells.length - 1]).toBe('2026-11-30');
  });
});
