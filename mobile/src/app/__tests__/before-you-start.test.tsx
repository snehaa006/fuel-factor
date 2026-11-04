import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import BeforeYouStart from '@/app/before-you-start';
import type { ProgrammeState } from '@/lib/programme';
import { useProgramme } from '@/lib/use-programme';
import { useRecallStatus } from '@/lib/use-recall';

jest.mock('@/lib/use-programme');
jest.mock('@/lib/use-recall');

const mockPush = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn() }),
  useFocusEffect: jest.fn(),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockUseProgramme = useProgramme as jest.MockedFunction<typeof useProgramme>;
const mockUseRecall = useRecallStatus as jest.MockedFunction<typeof useRecallStatus>;

afterEach(cleanup);

function programme(state: ProgrammeState) {
  mockUseProgramme.mockReturnValue({
    status: 'ready',
    programme: state,
    name: 'Theo',
    teamName: 'Jakarta U16',
    reload: jest.fn(),
  });
}

/** `days` is the day numbers already on record. */
function recall(days: number[] = []) {
  mockUseRecall.mockReturnValue({
    status: 'ready',
    participantId: 'p-theo',
    days: days.map((dayNumber) => ({
      id: `r${dayNumber}`,
      dayNumber,
      recallDate: '2026-11-28',
      hasMeals: true,
    })),
    window: {
      status: 'due',
      round: 'baseline',
      dayNumber: days.length + 1,
      position: days.length + 1,
      done: days.length,
      of: 3,
    },
    programmeStartsOn: '2026-12-01',
    reload: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  programme({ status: 'before', startsOn: '2026-12-01', daysUntil: 9 });
  recall();
});

/**
 * The athlete's whole app before day one.
 *
 * "In every research, we have a baseline, and then we have an intervention."
 * The baseline happens before the intervention, so the app before day one is
 * the three recall days and nothing else.
 */
describe('what there is to do before day one', () => {
  it('says when the programme starts', async () => {
    await render(<BeforeYouStart />);
    expect(screen.getByTestId('before-countdown')).toHaveTextContent(/starts in 9 days/);
  });

  it('offers the three baseline days and no others', async () => {
    await render(<BeforeYouStart />);
    for (const day of [1, 2, 3]) {
      expect(screen.getByTestId(`before-day-${day}`)).toBeTruthy();
    }
    // Days 4 to 6 are the post-intervention round. Offering them here would
    // let an athlete answer the follow-up before the programme has run.
    expect(screen.queryByTestId('before-day-4')).toBeNull();
  });

  it('counts what is already in', async () => {
    recall([1, 2]);
    await render(<BeforeYouStart />);
    expect(screen.getByTestId('before-count')).toHaveTextContent(/2 of 3 days in/);
    expect(screen.getByTestId('before-day-1-state')).toHaveTextContent(/2026-11-28/);
    expect(screen.getByTestId('before-day-3-state')).toHaveTextContent(/Not answered/);
  });

  it('leads with all three in one sitting, since they are days already lived', async () => {
    await render(<BeforeYouStart />);
    fireEvent.press(screen.getByTestId('before-all'));
    expect(mockPush).toHaveBeenCalledWith('/recall/all');
  });

  it('still lets a day be filled on its own', async () => {
    recall([1]);
    await render(<BeforeYouStart />);
    fireEvent.press(screen.getByTestId('before-next'));
    expect(mockPush).toHaveBeenCalledWith('/recall/2');
  });

  it('stops asking once all three are in', async () => {
    recall([1, 2, 3]);
    await render(<BeforeYouStart />);
    expect(screen.queryByTestId('before-all')).toBeNull();
    expect(screen.getByTestId('before-mascot')).toHaveTextContent(/Baseline done/);
  });

  it('offers no logging, no ring and no streak', async () => {
    // Those are days of the intervention, and the intervention has not
    // started. There is nothing on this screen to start a habit with.
    await render(<BeforeYouStart />);
    expect(screen.queryByTestId('fuel-ring')).toBeNull();
    expect(screen.queryByTestId('log-meal')).toBeNull();
    expect(screen.queryByTestId('streak')).toBeNull();
    expect(screen.queryByTestId('check-in')).toBeNull();
  });
});

describe('when the coach has set no first day', () => {
  it('says so, and still asks for the baseline', async () => {
    // Not a countdown: nobody knows when it starts. The app will not guess a
    // date the coach never chose.
    programme({ status: 'no-date' });
    await render(<BeforeYouStart />);
    expect(screen.getByTestId('before-countdown')).toHaveTextContent(/coach has not set/);
    expect(screen.getByTestId('before-day-1')).toBeTruthy();
  });
});

describe('when the programme has started underneath it', () => {
  it('hands the athlete over to their day', async () => {
    // A phone left open overnight on day zero, or a coach who moved the date.
    programme({ status: 'open', startsOn: '2026-12-01', day: 1, of: 28 });
    await render(<BeforeYouStart />);
    expect(mockRedirect).toHaveBeenCalledWith('/today');
  });
});
