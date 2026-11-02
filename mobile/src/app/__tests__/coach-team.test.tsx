import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CoachTeamScreen from '@/app/coach/team';
import { useCoachTeam } from '@/lib/use-coach-team';
import type { CoachTeam } from '@/lib/coach-auth';

jest.mock('@/lib/use-coach-team');
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const mockUseCoachTeam = useCoachTeam as jest.MockedFunction<typeof useCoachTeam>;
const mockCreate = jest.fn();
const mockSetStart = jest.fn();

const TEAM: CoachTeam = {
  id: 't-1',
  name: 'Jakarta U16',
  joinCode: 'FUEL01',
  coachCode: 'COACH01',
  programmeStartsOn: '2026-11-10',
  athletes: 3,
};

function state(over: Record<string, unknown>) {
  mockUseCoachTeam.mockReturnValue({
    reload: jest.fn(),
    create: mockCreate,
    setStart: mockSetStart,
    busy: false,
    actionError: null,
    ...over,
  } as unknown as ReturnType<typeof useCoachTeam>);
}

afterEach(cleanup);

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue(undefined);
  mockSetStart.mockResolvedValue(undefined);
});

/**
 * The programme's first day is asked for once, and it is not optional.
 *
 * Everything the squad sees is counted from it: the follow-up recall four
 * weeks later, and the day logging opens at all.
 */
describe('creating a team', () => {
  it('will not create one without a first day', async () => {
    state({ status: 'no-team', email: 'coach@example.test' });
    await render(<CoachTeamScreen />);
    fireEvent.changeText(screen.getByTestId('team-name'), 'Jakarta U16');
    await waitFor(() => expect(screen.getByTestId('team-name').props.value).toBe('Jakarta U16'));
    expect(screen.getByTestId('team-create').props.accessibilityState.disabled).toBe(true);
  });

  it('will not take something that is not a date', async () => {
    state({ status: 'no-team', email: 'coach@example.test' });
    await render(<CoachTeamScreen />);
    fireEvent.changeText(screen.getByTestId('team-name'), 'Jakarta U16');
    await waitFor(() => expect(screen.getByTestId('team-name').props.value).toBe('Jakarta U16'));
    // '2026-02-31' parses to the 3rd of March, which would silently move the
    // follow-up recall by two days.
    fireEvent.changeText(screen.getByTestId('team-start'), '2026-02-31');
    await waitFor(() => expect(screen.getByTestId('team-start-error')).toBeTruthy());
    expect(screen.getByTestId('team-create').props.accessibilityState.disabled).toBe(true);
  });

  it('creates the team with the date once both are given', async () => {
    state({ status: 'no-team', email: 'coach@example.test' });
    await render(<CoachTeamScreen />);
    fireEvent.changeText(screen.getByTestId('team-name'), 'Jakarta U16');
    await waitFor(() => expect(screen.getByTestId('team-name').props.value).toBe('Jakarta U16'));
    fireEvent.changeText(screen.getByTestId('team-start'), '2026-11-10');
    await waitFor(() =>
      expect(screen.getByTestId('team-create').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('team-create'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('Jakarta U16', '2026-11-10'));
  });

  it('says what the date decides, so it is not typed blind', async () => {
    state({ status: 'no-team', email: 'coach@example.test' });
    await render(<CoachTeamScreen />);
    expect(screen.getByText(/baseline recall days and nothing else/)).toBeTruthy();
  });
});

describe('moving the date afterwards', () => {
  it('cannot clear it', async () => {
    // A squad mid-programme whose start date vanished would be locked
    // straight back out of logging, with no screen able to put it back.
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    fireEvent.changeText(screen.getByTestId('team-programme-input'), '');
    await waitFor(() =>
      expect(screen.getByTestId('team-programme-save').props.accessibilityState.disabled).toBe(true)
    );
    expect(mockSetStart).not.toHaveBeenCalled();
  });

  it('moves it to another date', async () => {
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    fireEvent.changeText(screen.getByTestId('team-programme-input'), '2026-11-17');
    await waitFor(() =>
      expect(screen.getByTestId('team-programme-save').props.accessibilityState.disabled).toBe(
        false
      )
    );
    fireEvent.press(screen.getByTestId('team-programme-save'));
    await waitFor(() => expect(mockSetStart).toHaveBeenCalledWith('2026-11-17'));
  });

  it('tells a coach with no date what their squad can and cannot do', async () => {
    // Teams created before the date was required. The app will not invent one.
    state({
      status: 'ready',
      email: 'coach@example.test',
      team: { ...TEAM, programmeStartsOn: null },
    });
    await render(<CoachTeamScreen />);
    expect(screen.getByTestId('team-programme')).toHaveTextContent(/only fill their three baseline/);
  });
});
