import { render, screen } from '@testing-library/react-native';

import Team, { ordinal } from '@/app/team';
import { DEMO_BADGES } from '@/lib/__fixtures__/today';
import { rank, type Leaderboard } from '@/lib/team';
import { useTeam, type TeamView } from '@/lib/use-team';

jest.mock('@/lib/use-team');
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const mockUseTeam = useTeam as jest.MockedFunction<typeof useTeam>;

function board(over: Partial<Leaderboard> = {}): Leaderboard {
  const rows = rank([
    { participantCode: 'J-01', name: 'Jeongho', daysLogged: 7, loggedToday: true, isMe: false },
    { participantCode: 'T-01', name: 'Theo', daysLogged: 6, loggedToday: true, isMe: true },
    { participantCode: 'JA-01', name: 'Jacob', daysLogged: 4, loggedToday: false, isMe: false },
  ]);
  return { teamName: 'Jakarta U16', rows, mvp: ['Jeongho'], windowDays: 7, ...over };
}

/** The whole screen's data, with the week's board overridable on its own. */
function view(week: Partial<Leaderboard> = {}, over: Partial<TeamView> = {}): TeamView {
  return { week: board(week), monthMvp: ['Jeongho'], badges: DEMO_BADGES, ...over };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTeam.mockReturnValue({ status: 'ready', view: view() });
});

describe('the Team screen', () => {
  it('draws a row per athlete, ranked', async () => {
    await render(<Team />);
    expect(screen.getByTestId('row-J-01-position')).toHaveTextContent('1');
    expect(screen.getByTestId('row-T-01-position')).toHaveTextContent('2');
    expect(screen.getByTestId('row-JA-01-position')).toHaveTextContent('3');
  });

  it('names the team', async () => {
    await render(<Team />);
    expect(screen.getByText('Jakarta U16')).toBeTruthy();
  });

  it('falls back without inventing a team name', async () => {
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({ teamName: null }) });
    await render(<Team />);
    expect(screen.getByText('Your team')).toBeTruthy();
  });

  it('says what the ranking is, in days', async () => {
    await render(<Team />);
    expect(screen.getByTestId('team-window')).toHaveTextContent(/last 7 days/);
  });

  it('awards the MVP', async () => {
    await render(<Team />);
    expect(screen.getByTestId('mvp-name')).toHaveTextContent('Jeongho');
  });

  it('names both when the week is shared', async () => {
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({ mvp: ['Jacob', 'Theo'] }) });
    await render(<Team />);
    expect(screen.getByTestId('mvp-name')).toHaveTextContent('Jacob & Theo');
    expect(screen.getByText(/SHARED/)).toBeTruthy();
  });

  it('awards no MVP on a week nobody logged', async () => {
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({ mvp: [] }) });
    await render(<Team />);
    expect(screen.queryByTestId('mvp')).toBeNull();
  });

  it('tells the athlete where they stand', async () => {
    await render(<Team />);
    expect(screen.getByTestId('my-standing')).toHaveTextContent('You are 2nd on 6 of 7 days.');
  });

  it('invites an athlete on nothing onto the board rather than ranking them', async () => {
    const rows = rank([
      { participantCode: 'J-01', name: 'Jeongho', daysLogged: 3, loggedToday: true, isMe: false },
      { participantCode: 'T-01', name: 'Theo', daysLogged: 0, loggedToday: false, isMe: true },
    ]);
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({ rows }) });
    await render(<Team />);
    expect(screen.getByTestId('my-standing')).toHaveTextContent(
      'Log a meal today and you are on the board.'
    );
  });

  it('says nothing about standing before an athlete is claimed', async () => {
    const rows = rank([
      { participantCode: 'J-01', name: 'Jeongho', daysLogged: 3, loggedToday: true, isMe: false },
    ]);
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({ rows }) });
    await render(<Team />);
    expect(screen.queryByTestId('my-standing')).toBeNull();
  });

  it('explains an empty board instead of showing a blank screen', async () => {
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({ rows: [], mvp: [] }) });
    await render(<Team />);
    expect(screen.getByTestId('team-empty')).toBeTruthy();
  });

  it('says out loud what the board does not rank on', async () => {
    // An athlete comparing themselves to a teammate deserves to know what is
    // and is not being compared. This sentence is the feature, not decoration.
    await render(<Team />);
    expect(screen.getByTestId('team-basis')).toHaveTextContent(
      /Nobody is ranked on their weight or their size/
    );
  });

  it('shows a spinner while it loads', async () => {
    mockUseTeam.mockReturnValue({ status: 'loading' });
    await render(<Team />);
    expect(screen.queryByTestId('mvp')).toBeNull();
  });

  it('shows a refusal in words', async () => {
    mockUseTeam.mockReturnValue({ status: 'error', message: 'permission denied' });
    await render(<Team />);
    expect(screen.getByText('permission denied')).toBeTruthy();
  });
});

describe('player of the month', () => {
  it('names who leads the longer window', async () => {
    await render(<Team />);
    expect(screen.getByTestId('month-mvp-name')).toHaveTextContent('Jeongho');
  });

  it('says how long that window is, rather than naming a month', async () => {
    // Thirty days back from today, not a calendar month: a calendar month
    // would award it on the 1st to whoever logged once.
    await render(<Team />);
    expect(screen.getByTestId('month-mvp')).toHaveTextContent(/LAST 30 DAYS/);
  });

  it('names everyone when the month is shared', async () => {
    mockUseTeam.mockReturnValue({
      status: 'ready',
      view: view({}, { monthMvp: ['Jacob', 'Theo'] }),
    });
    await render(<Team />);
    expect(screen.getByTestId('month-mvp-name')).toHaveTextContent('Jacob & Theo');
    expect(screen.getByTestId('month-mvp')).toHaveTextContent(/SHARED/);
  });

  it('awards nobody over a month nobody logged', async () => {
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({}, { monthMvp: [] }) });
    await render(<Team />);
    expect(screen.queryByTestId('month-mvp')).toBeNull();
  });
});

describe('badges on the team screen', () => {
  it('shows the set with the earned count', async () => {
    await render(<Team />);
    // Theo's demo figures earn First Touch and nothing else yet.
    expect(screen.getByTestId('badge-count')).toHaveTextContent('1 of 7');
  });

  it('keeps the locked ones on screen as targets', async () => {
    await render(<Team />);
    expect(screen.getByTestId('badges-ten_days')).toBeTruthy();
    expect(screen.getByTestId('badges-ten_days-state')).toHaveTextContent(/7 of 10/);
  });

  it('says nothing about badges before any are loaded', async () => {
    mockUseTeam.mockReturnValue({ status: 'ready', view: view({}, { badges: [] }) });
    await render(<Team />);
    expect(screen.queryByTestId('badge-count')).toBeNull();
  });
});

describe('ordinal', () => {
  it('reads the positions a squad can reach', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd',
    ]);
  });
});
