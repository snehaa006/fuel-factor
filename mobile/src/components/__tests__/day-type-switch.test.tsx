import { fireEvent, render, screen } from '@testing-library/react-native';

import { DayTypeSwitch } from '@/components/day-type-switch';

describe('DayTypeSwitch', () => {
  it('offers training, match and rest, as the tracker’s Day Type column does', async () => {
    await render(<DayTypeSwitch value="training" testID="switch" />);
    expect(screen.getByTestId('switch-training')).toBeTruthy();
    expect(screen.getByTestId('switch-match')).toBeTruthy();
    expect(screen.getByTestId('switch-rest')).toBeTruthy();
  });

  it('reports a match day', async () => {
    const onChange = jest.fn();
    await render(<DayTypeSwitch value="training" onChange={onChange} testID="switch" />);
    fireEvent.press(screen.getByTestId('switch-match'));
    expect(onChange).toHaveBeenCalledWith('match');
  });

  it('marks the selected day type for a screen reader', async () => {
    await render(<DayTypeSwitch value="rest" testID="switch" />);
    expect(screen.getByTestId('switch-rest').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('switch-training').props.accessibilityState.selected).toBe(false);
  });

  it('reports a change', async () => {
    const onChange = jest.fn();
    await render(<DayTypeSwitch value="training" onChange={onChange} testID="switch" />);
    fireEvent.press(screen.getByTestId('switch-rest'));
    expect(onChange).toHaveBeenCalledWith('rest');
  });

  it('does not report a press on the value already selected', async () => {
    const onChange = jest.fn();
    await render(<DayTypeSwitch value="training" onChange={onChange} testID="switch" />);
    fireEvent.press(screen.getByTestId('switch-training'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selects neither when the day type is unset', async () => {
    await render(<DayTypeSwitch value={null} testID="switch" />);
    expect(screen.getByTestId('switch-training').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('switch-rest').props.accessibilityState.selected).toBe(false);
  });
});
