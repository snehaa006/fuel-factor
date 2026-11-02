import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RecallAll from '@/app/recall/all';
import { EMPTY_RECALL, type RecallEntry } from '@/lib/recall';
import { useRecallRound, useRecallStatus } from '@/lib/use-recall';

jest.mock('@/lib/use-recall');

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockStatus = useRecallStatus as jest.MockedFunction<typeof useRecallStatus>;
const mockRound = useRecallRound as jest.MockedFunction<typeof useRecallRound>;
const mockSave = jest.fn();

afterEach(cleanup);

/** The window as it is for a squad that has filled nothing yet. */
function baselineDue(done = 0) {
  mockStatus.mockReturnValue({
    status: 'ready',
    participantId: 'p-theo',
    days: [],
    window: { status: 'due', round: 'baseline', dayNumber: done + 1, position: done + 1, done, of: 3 },
    programmeStartsOn: '2026-12-01',
    reload: jest.fn(),
  });
}

function round(entries: Record<number, RecallEntry> = {}, over: Record<string, unknown> = {}) {
  mockRound.mockReturnValue({
    status: 'ready',
    entries,
    savedDays: Object.keys(entries).map(Number),
    save: mockSave,
    savingDay: null,
    saveError: null,
    ...over,
  } as ReturnType<typeof useRecallRound>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
  baselineDue();
  round();
});

/**
 * Three days in one sitting.
 *
 * The day-at-a-time screen is still the one the prompts point at. This is the
 * other way round the same instrument, for an athlete who sits down on a
 * Sunday with three days to remember.
 */
describe('the round', () => {
  it('offers the three days of the round that is actually due', async () => {
    await render(<RecallAll />);
    for (const day of [1, 2, 3]) {
      expect(screen.getByTestId(`all-tab-${day}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('all-tab-4')).toBeNull();
  });

  it('counts the days inside the round, never the sheet’s own numbering', async () => {
    // The tracker numbers the follow-up 4 to 6 because the two rounds share
    // one key. "Day 4 of 3" is nonsense to the 14 year old holding the phone.
    mockStatus.mockReturnValue({
      status: 'ready',
      participantId: 'p-theo',
      days: [],
      window: { status: 'due', round: 'follow-up', dayNumber: 4, position: 1, done: 0, of: 3 },
      programmeStartsOn: '2026-10-01',
      reload: jest.fn(),
    });
    await render(<RecallAll />);
    expect(screen.getByTestId('all-tab-4')).toHaveTextContent(/DAY 1/);
    expect(screen.getByTestId('all-tab-6')).toHaveTextContent(/DAY 3/);
  });

  it('opens on the first day with nothing on it', async () => {
    round({ 1: { ...EMPTY_RECALL, breakfast: 'oats' } });
    await render(<RecallAll />);
    // Day 2 is the one being typed, so its save button names day 3 next.
    expect(screen.getByTestId('all-save')).toHaveTextContent(/Save and go to day 3/);
  });

  it('says how many are still to go', async () => {
    round({ 1: { ...EMPTY_RECALL, breakfast: 'oats' } });
    await render(<RecallAll />);
    expect(screen.getByTestId('all-remaining')).toHaveTextContent(/2 of 3 days still to go/);
  });

  it('marks a day that is already in', async () => {
    round({ 1: { ...EMPTY_RECALL, breakfast: 'oats' } });
    await render(<RecallAll />);
    expect(screen.getByTestId('all-tab-1-state')).toHaveTextContent(/Saved/);
    expect(screen.getByTestId('all-tab-3-state')).toHaveTextContent(/Not yet/);
  });
});

describe('saving', () => {
  it('writes one day at a time, so a refused write costs one day', async () => {
    // Three upserts have no transaction across them, and holding all three
    // until the end means a blip after twenty minutes' typing loses all of it.
    await render(<RecallAll />);
    fireEvent.changeText(screen.getByTestId('recall-breakfast'), 'nasi goreng');
    await waitFor(() =>
      expect(screen.getByTestId('all-save').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('all-save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0]).toBe(1);
    expect(mockSave.mock.calls[0][1]).toMatchObject({ breakfast: 'nasi goreng' });
  });

  it('refuses to save a day nobody answered', async () => {
    // A row of nulls in a research table would count as one of the
    // programme's three days for doing nothing.
    await render(<RecallAll />);
    expect(screen.getByTestId('all-save').props.accessibilityState.disabled).toBe(true);
  });

  it('parses the typed numbers once, on the way out', async () => {
    await render(<RecallAll />);
    fireEvent.changeText(screen.getByTestId('recall-sleep'), '7.5');
    // Two events in one synchronous block leave an update in flight past the
    // end of the test, and the NEXT test renders an empty tree.
    await waitFor(() => expect(screen.getByTestId('recall-sleep').props.value).toBe('7.5'));
    fireEvent.changeText(screen.getByTestId('recall-fluid'), '2000');
    await waitFor(() =>
      expect(screen.getByTestId('all-save').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('all-save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][1]).toMatchObject({ sleep_hours: 7.5, fluid_ml: 2000 });
  });

  it('keeps each day’s answers apart when you switch between them', async () => {
    await render(<RecallAll />);
    fireEvent.changeText(screen.getByTestId('recall-breakfast'), 'day one breakfast');
    await waitFor(() =>
      expect(screen.getByTestId('recall-breakfast').props.value).toBe('day one breakfast')
    );
    fireEvent.press(screen.getByTestId('all-tab-2'));
    await waitFor(() => expect(screen.getByTestId('recall-breakfast').props.value).toBe(''));
    fireEvent.press(screen.getByTestId('all-tab-1'));
    await waitFor(() =>
      expect(screen.getByTestId('recall-breakfast').props.value).toBe('day one breakfast')
    );
  });

  it('says what a day without meals costs, and saves it anyway', async () => {
    await render(<RecallAll />);
    fireEvent.press(screen.getByTestId('recall-urine-6'));
    await waitFor(() =>
      expect(screen.getByTestId('all-no-meals')).toHaveTextContent(/cannot go through the food/)
    );
    expect(screen.getByTestId('all-save').props.accessibilityState.disabled).toBe(false);
  });

  it('shows the write’s own refusal rather than swallowing it', async () => {
    round({}, { saveError: 'new row violates row-level security policy' });
    await render(<RecallAll />);
    expect(screen.getByTestId('all-save-error')).toHaveTextContent(/row-level security/);
  });

  it('closes out when all three are in, and still lets them be changed', async () => {
    round({
      1: { ...EMPTY_RECALL, breakfast: 'a' },
      2: { ...EMPTY_RECALL, breakfast: 'b' },
      3: { ...EMPTY_RECALL, breakfast: 'c' },
    });
    await render(<RecallAll />);
    expect(screen.getByTestId('all-done')).toBeTruthy();
    fireEvent.press(screen.getByTestId('all-finish'));
    expect(mockReplace).toHaveBeenCalledWith('/recall');
  });
});

describe('the workbook’s scales', () => {
  it('are one tap from the controls that need them', async () => {
    await render(<RecallAll />);
    fireEvent.press(screen.getByTestId('recall-urine-guide'));
    await waitFor(() =>
      expect(screen.getByTestId('scale-guide-title')).toHaveTextContent(/The hydration scale/)
    );
  });
});
