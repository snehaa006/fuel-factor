import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { monthGrid, shortDate, TimeMachine } from '@/components/time-machine';
import { setSimulatedDate, simulatedDate } from '@/lib/clock';
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
    // Nothing is mounted yet, so nothing re-renders and no act is needed.
    setSimulatedDate('2026-11-10');
    await render(<TimeMachine />);
    expect(screen.getByText('TIME MACHINE')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('time-machine-forward'));
    expect(simulatedDate()).toBe('2026-11-11');
    await fireEvent.press(screen.getByTestId('time-machine-back'));
    await fireEvent.press(screen.getByTestId('time-machine-back'));
    expect(simulatedDate()).toBe('2026-11-09');
  });

  it('jumps to a day picked from the calendar, and back to the real today', async () => {
    // Nothing is mounted yet, so nothing re-renders and no act is needed.
    setSimulatedDate('2026-11-10');
    await render(<TimeMachine />);

    await fireEvent.press(screen.getByTestId('time-machine-open'));
    expect(screen.getByTestId('time-machine-month')).toHaveTextContent('November 2026');
    await fireEvent.press(screen.getByTestId('time-machine-day-2026-11-23'));
    expect(simulatedDate()).toBe('2026-11-23');

    await fireEvent.press(screen.getByTestId('time-machine-open'));
    await fireEvent.press(screen.getByTestId('time-machine-reset'));
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
