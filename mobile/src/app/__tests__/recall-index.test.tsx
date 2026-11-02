import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import RecallIndex from '@/app/recall/index';
import type { RecallWindow } from '@/lib/recall-window';
import { useRecallStatus } from '@/lib/use-recall';

jest.mock('@/lib/use-recall');

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
  useFocusEffect: jest.fn(),
  Redirect: () => null,
}));

const mockUseRecall = useRecallStatus as jest.MockedFunction<typeof useRecallStatus>;

afterEach(cleanup);

function ready(window: RecallWindow, days: number[] = [], programmeStartsOn: string | null = '2026-12-01') {
  mockUseRecall.mockReturnValue({
    status: 'ready',
    participantId: 'p-theo',
    days: days.map((dayNumber) => ({ id: `r${dayNumber}`, dayNumber, recallDate: null, hasMeals: true })),
    window,
    programmeStartsOn,
    reload: jest.fn(),
  });
}

const baselineDue = (done = 0): RecallWindow => ({
  status: 'due',
  round: 'baseline',
  dayNumber: done + 1,
  position: done + 1,
  done,
  of: 3,
});

beforeEach(() => {
  jest.clearAllMocks();
  ready(baselineDue());
});

/**
 * Two rounds of three days, and only one of them open at a time.
 */
describe('the follow-up round', () => {
  it('is shut while the baseline is still outstanding', async () => {
    // It used to be shut only on `waiting`, which is reached once the
    // baseline is complete -- so an athlete who had not filled their baseline
    // was offered all six days and could answer the post-intervention round
    // before the intervention.
    await render(<RecallIndex />);
    expect(screen.getByTestId('round-follow-up-locked')).toBeTruthy();
    expect(screen.queryByTestId('recall-day-4')).toBeNull();
  });

  it('says why, rather than greying out silently', async () => {
    await render(<RecallIndex />);
    expect(screen.getByTestId('round-follow-up-locked')).toHaveTextContent(
      /Your three baseline days come first/
    );
  });

  it('names the date once the baseline is in and the four weeks are running', async () => {
    ready({ status: 'waiting', opensOn: '2026-12-29', daysUntil: 12 }, [1, 2, 3]);
    await render(<RecallIndex />);
    expect(screen.getByTestId('round-follow-up-locked')).toHaveTextContent(/2026-12-29/);
  });

  it('opens when it is the round being asked for', async () => {
    ready(
      { status: 'due', round: 'follow-up', dayNumber: 4, position: 1, done: 0, of: 3 },
      [1, 2, 3]
    );
    await render(<RecallIndex />);
    expect(screen.queryByTestId('round-follow-up-locked')).toBeNull();
    expect(screen.getByTestId('recall-day-4')).toBeTruthy();
  });

  it('stays open for correcting once its days are in', async () => {
    ready({ status: 'none', reason: 'complete' }, [1, 2, 3, 4, 5, 6]);
    await render(<RecallIndex />);
    expect(screen.queryByTestId('round-follow-up-locked')).toBeNull();
    expect(screen.getByTestId('recall-day-5')).toBeTruthy();
  });
});

describe('filling them', () => {
  it('offers all three in one sitting while more than one is outstanding', async () => {
    await render(<RecallIndex />);
    fireEvent.press(screen.getByTestId('recall-all'));
    expect(mockPush).toHaveBeenCalledWith('/recall/all');
  });

  it('drops that offer when one day is left, since it is the same button', async () => {
    ready(baselineDue(2), [1, 2]);
    await render(<RecallIndex />);
    expect(screen.queryByTestId('recall-all')).toBeNull();
    expect(screen.getByTestId('recall-next')).toHaveTextContent(/Fill in day 3/);
  });

  it('says when a team has no first day to count four weeks from', async () => {
    // The baseline is in, so the window has run out of things to ask for:
    // the follow-up is four weeks after a date nobody has set.
    ready({ status: 'none', reason: 'no-programme-date' }, [1, 2, 3], null);
    await render(<RecallIndex />);
    expect(screen.getByTestId('recall-no-date')).toHaveTextContent(/has not set the programme/);
    expect(screen.getByTestId('round-follow-up-locked')).toBeTruthy();
  });
});

describe('testing mode', () => {
  it('opens the follow-up days now, and says it is testing', async () => {
    mockUseRecall.mockReturnValue({
      status: 'ready',
      participantId: 'p-theo',
      days: [],
      window: baselineDue(),
      programmeStartsOn: '2026-12-01',
      followUpOpenEarly: true,
      reload: jest.fn(),
    });
    await render(<RecallIndex />);
    expect(screen.queryByTestId('round-follow-up-locked')).toBeNull();
    expect(screen.getByTestId('recall-day-4')).toBeTruthy();
    expect(screen.getByTestId('recall-testing')).toBeTruthy();
  });
});
