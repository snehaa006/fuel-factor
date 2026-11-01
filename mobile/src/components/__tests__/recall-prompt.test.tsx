import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecallPrompt } from '@/components/recall-prompt';
import type { RecallWindow } from '@/lib/recall-window';

const onPress = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const show = (window: RecallWindow) =>
  render(<RecallPrompt window={window} onPress={onPress} testID="prompt" />);

describe('when a recall is due', () => {
  const due: RecallWindow = {
    status: 'due',
    round: 'baseline',
    dayNumber: 2,
    position: 2,
    done: 1,
    of: 3,
  };

  it('says which day and how many are in', async () => {
    await show(due);
    expect(screen.getByTestId('prompt-body')).toHaveTextContent(/Day 2 of 3/);
    expect(screen.getByTestId('prompt-body')).toHaveTextContent(/1 day is in/);
  });

  it('agrees with itself about plurals', async () => {
    await show({ ...due, dayNumber: 3, position: 3, done: 2 });
    expect(screen.getByTestId('prompt-body')).toHaveTextContent(/2 days are in/);
  });

  it('names the round', async () => {
    await show(due);
    expect(screen.getByText(/BEFORE YOU START/)).toBeTruthy();
  });

  it('opens the form', async () => {
    await show(due);
    fireEvent.press(screen.getByTestId('prompt'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('when the follow-up has not opened yet', () => {
  const waiting: RecallWindow = {
    status: 'waiting',
    opensOn: '2026-11-22',
    daysUntil: 21,
  };

  it('says when it opens instead of offering a form', async () => {
    await show(waiting);
    expect(screen.getByTestId('prompt-body')).toHaveTextContent(/Opens in 21 days, on 2026-11-22/);
  });

  it('cannot be pressed', async () => {
    await show(waiting);
    fireEvent.press(screen.getByTestId('prompt'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('agrees with itself about one day', async () => {
    await show({ status: 'waiting', opensOn: waiting.opensOn, daysUntil: 1 });
    expect(screen.getByTestId('prompt-body')).toHaveTextContent(/Opens in 1 day,/);
  });
});

describe('when there is nothing to ask for', () => {
  it('draws nothing at all once both rounds are in', async () => {
    await show({ status: 'none', reason: 'complete' });
    expect(screen.queryByTestId('prompt')).toBeNull();
  });

  it('draws nothing when the coach has set no programme date', async () => {
    // Not a warning and not the athlete's problem: the recall screen says so
    // in its own words instead.
    await show({ status: 'none', reason: 'no-programme-date' });
    expect(screen.queryByTestId('prompt')).toBeNull();
  });
});

describe('the follow-up counts inside its own round', () => {
  it('calls day_number 4 the first of three, not "Day 4 of 3"', async () => {
    // The tracker numbers recall days continuously, so the follow-up's rows
    // are 4 to 6. An athlete doing three days is on day 1.
    await show({ status: 'due', round: 'follow-up', dayNumber: 4, position: 1, done: 0, of: 3 });
    expect(screen.getByTestId('prompt-body')).toHaveTextContent(/Day 1 of 3/);
    expect(screen.getByTestId('prompt-body')).not.toHaveTextContent(/Day 4/);
  });
});

describe('what the card never says', () => {
  it('says nothing about food, weight or nutrition', async () => {
    // This card is the app asking for data. The programme's sentences live in
    // NudgeCard, which carries a rule code and a source so a dietitian can
    // review them; this carries neither and needs to.
    await show({ status: 'due', round: 'follow-up', dayNumber: 4, position: 1, done: 0, of: 3 });
    for (const word of [/carb/i, /protein/i, /calorie/i, /weight/i, /healthy/i, /eat more/i]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });
});
