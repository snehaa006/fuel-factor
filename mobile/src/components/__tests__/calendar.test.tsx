import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DateField, longDate, monthGrid, shortDate } from '@/components/calendar';

/**
 * The calendar replaced three typed `YYYY-MM-DD` boxes, so what matters is
 * that the class of error it removed cannot come back: there is no text to
 * type, and nothing outside a real calendar month is pressable.
 */

function Harness({
  value: initial = null,
  onChange,
  ...props
}: Partial<React.ComponentProps<typeof DateField>> = {}) {
  // The harness owns the value: `value` is the starting one, and a passed
  // `onChange` is additive so a test can both drive and observe.
  const [value, setValue] = useState<string | null>(initial);
  return (
    <DateField
      openAt="2026-11-11"
      today="2026-11-11"
      accessibilityLabel="A date"
      testID="field"
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('the date field', () => {
  it('shows the placeholder until a date is chosen', async () => {
    await render(<Harness placeholder="Pick the day" />);
    expect(screen.getByTestId('field-value')).toHaveTextContent('Pick the day');
  });

  it('reads a chosen date back as a date, not as an ISO string', async () => {
    await render(<Harness value="2026-11-01" />);
    expect(screen.getByTestId('field-value')).toHaveTextContent('Sunday 1 November 2026');
  });

  it('has no text to type into', async () => {
    // The whole point: `isIsoDate` existed because '2026-02-31' parses to the
    // 3rd of March. A field with no keyboard cannot express it.
    await render(<Harness />);
    expect(screen.getByTestId('field').props.onChangeText).toBeUndefined();
  });

  it('stores the ISO date the database wants', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('field'));
    await fireEvent.press(screen.getByTestId('field-day-2026-11-20'));
    expect(onChange).toHaveBeenCalledWith('2026-11-20');
  });

  it('closes once a day is picked', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId('field'));
    expect(screen.getByTestId('field-sheet')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('field-day-2026-11-20'));
    expect(screen.queryByTestId('field-sheet')).toBeNull();
  });

  it('walks between months', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId('field'));
    expect(screen.getByTestId('field-month')).toHaveTextContent('November 2026');
    await fireEvent.press(screen.getByTestId('field-next-month'));
    expect(screen.getByTestId('field-month')).toHaveTextContent('December 2026');
    await fireEvent.press(screen.getByTestId('field-prev-month'));
    await fireEvent.press(screen.getByTestId('field-prev-month'));
    expect(screen.getByTestId('field-month')).toHaveTextContent('October 2026');
  });

  it('offers today, which is the answer most of the time', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('field'));
    await fireEvent.press(screen.getByTestId('field-footer'));
    expect(onChange).toHaveBeenCalledWith('2026-11-11');
  });

  it('refuses a day past the maximum, for a recall about a day already lived', async () => {
    await render(<Harness max="2026-11-11" />);
    await fireEvent.press(screen.getByTestId('field'));
    expect(screen.getByTestId('field-day-2026-11-12').props.accessibilityState.disabled).toBe(true);
    // Still drawn, so the grid keeps its shape.
    expect(screen.getByTestId('field-day-2026-11-12')).toBeTruthy();
  });

  it('offers no way to clear a required date', async () => {
    await render(<Harness value="2026-11-01" />);
    expect(screen.queryByTestId('field-clear')).toBeNull();
  });

  it('clears where clearing is allowed', async () => {
    await render(<Harness value="2026-11-01" clearable />);
    await fireEvent.press(screen.getByTestId('field-clear'));
    expect(screen.getByTestId('field-value')).toHaveTextContent('Pick a date');
  });
});

describe('monthGrid', () => {
  it('puts the 1st under its weekday, Monday first', () => {
    // 1 November 2026 is a Sunday: six blanks, then the 1st.
    const cells = monthGrid(2026, 10);
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(cells[cells.length - 1]).toBe('2026-11-30');
  });

  it('gets February right in a leap year and out of one', () => {
    expect(monthGrid(2028, 1).at(-1)).toBe('2028-02-29');
    expect(monthGrid(2026, 1).at(-1)).toBe('2026-02-28');
  });
});

describe('how a date reads', () => {
  it('is short on a pill and long in a field', () => {
    expect(shortDate('2026-11-10')).toBe('Tue 10 Nov');
    expect(longDate('2026-11-10')).toBe('Tuesday 10 November 2026');
  });
});
