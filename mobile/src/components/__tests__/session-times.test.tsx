import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SessionTimes } from '@/components/session-times';
import { NO_SESSION, type TrainingSession } from '@/lib/session';

const AFTERNOON: TrainingSession = { startsAt: 16 * 60 + 30, endsAt: 18 * 60 };
const NOW = 14 * 60 + 7;

function setup(value: TrainingSession) {
  const onChange = jest.fn();
  return { onChange, ui: <SessionTimes value={value} onChange={onChange} now={NOW} testID="s" /> };
}

describe('SessionTimes', () => {
  it('shows the times that are set', async () => {
    const { ui } = setup(AFTERNOON);
    await render(ui);
    expect(screen.getByTestId('s-startsAt')).toHaveTextContent(/^16:30$/);
    expect(screen.getByTestId('s-endsAt')).toHaveTextContent(/^18:00$/);
  });

  it('shows a blank for a session nobody has set', async () => {
    const { ui } = setup(NO_SESSION);
    await render(ui);
    expect(screen.getByTestId('s-startsAt')).toHaveTextContent(/^--:--$/);
  });

  it('opens an unset time at the current quarter hour, not at an invented default', async () => {
    const { onChange, ui } = setup(NO_SESSION);
    await render(ui);
    fireEvent.press(screen.getByTestId('s-startsAt-later'));
    // 14:07 rounds to 14:00, which is somewhere the athlete recognises.
    expect(onChange).toHaveBeenCalledWith({ startsAt: 14 * 60, endsAt: null });
  });

  it('steps a set time by a quarter hour', async () => {
    const { onChange, ui } = setup(AFTERNOON);
    await render(ui);
    fireEvent.press(screen.getByTestId('s-startsAt-later'));
    expect(onChange).toHaveBeenCalledWith({ startsAt: 16 * 60 + 45, endsAt: 18 * 60 });
  });

  it('steps backwards too', async () => {
    const { onChange, ui } = setup(AFTERNOON);
    await render(ui);
    fireEvent.press(screen.getByTestId('s-endsAt-earlier'));
    expect(onChange).toHaveBeenCalledWith({ startsAt: 16 * 60 + 30, endsAt: 17 * 60 + 45 });
  });

  it('will not step an end back past its start', async () => {
    const tight: TrainingSession = { startsAt: 16 * 60, endsAt: 16 * 60 + 15 };
    const { onChange, ui } = setup(tight);
    await render(ui);
    fireEvent.press(screen.getByTestId('s-endsAt-earlier'));
    expect(onChange).toHaveBeenCalledWith(tight);
  });

  it('clears the whole session', async () => {
    const { onChange, ui } = setup(AFTERNOON);
    await render(ui);
    fireEvent.press(screen.getByTestId('s-clear'));
    expect(onChange).toHaveBeenCalledWith(NO_SESSION);
  });

  it('offers no Clear when there is nothing to clear', async () => {
    const { ui } = setup(NO_SESSION);
    await render(ui);
    expect(screen.queryByTestId('s-clear')).toBeNull();
  });

  it('says what setting a session buys, while none is set', async () => {
    const { ui } = setup(NO_SESSION);
    await render(ui);
    expect(screen.getByText(/remind you when to eat before and after/)).toBeTruthy();
  });

  it('drops that line once a session is set', async () => {
    const { ui } = setup(AFTERNOON);
    await render(ui);
    expect(screen.queryByText(/remind you when to eat before and after/)).toBeNull();
  });

  it('reads a set time out for a screen reader', async () => {
    const { ui } = setup(AFTERNOON);
    await render(ui);
    expect(screen.getByLabelText('Starts: 16:30')).toBeTruthy();
  });

  it('says a time is not set rather than reading out a blank', async () => {
    const { ui } = setup(NO_SESSION);
    await render(ui);
    expect(screen.getByLabelText('Ends: not set')).toBeTruthy();
  });

  it('survives two taps in a row', async () => {
    // Each event has to land before the next; firing both in one synchronous
    // block leaves an update in flight and breaks the test after this one.
    const { onChange, ui } = setup(AFTERNOON);
    await render(ui);
    fireEvent.press(screen.getByTestId('s-startsAt-later'));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByTestId('s-startsAt-earlier'));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
  });
});
