import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CoachTeamScreen from '@/app/coach/team';
import { copyText } from '@/lib/clipboard';
import { useCoachTeam } from '@/lib/use-coach-team';
import type { CoachTeam } from '@/lib/coach-auth';

jest.mock('@/lib/use-coach-team');
jest.mock('@/lib/clipboard');
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const mockUseCoachTeam = useCoachTeam as jest.MockedFunction<typeof useCoachTeam>;
const mockCreate = jest.fn();
const mockSetStart = jest.fn();
const mockCopy = copyText as jest.MockedFunction<typeof copyText>;

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

/**
 * Set a date the way a coach does: open the field's calendar, walk to the
 * month, press the day. Both date fields on this screen are the same control,
 * so both are driven the same way.
 */
async function pickDate(testID: string, iso: string) {
  await fireEvent.press(screen.getByTestId(testID));
  const target = `${testID}-day-${iso}`;
  // The grid opens on the chosen date's month, or today's. Walk either way.
  for (let i = 0; i < 24 && screen.queryByTestId(target) === null; i += 1) {
    const shown = screen.getByTestId(`${testID}-month`);
    const forward = shown.props.children.join('') < monthLabel(iso);
    await fireEvent.press(
      screen.getByTestId(forward ? `${testID}-next-month` : `${testID}-prev-month`)
    );
  }
  await fireEvent.press(screen.getByTestId(target));
}

function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${
    [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ][d.getUTCMonth()]
  } ${d.getUTCFullYear()}`;
}

afterEach(cleanup);

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue(undefined);
  mockSetStart.mockResolvedValue(undefined);
  mockCopy.mockResolvedValue(true);
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

  it('cannot be given something that is not a date', async () => {
    // '2026-02-31' parses to the 3rd of March, and typing it used to move the
    // follow-up recall by two days until `isIsoDate` caught it. The field is a
    // calendar now, so the class of error is gone rather than validated: there
    // is no text to type, and every cell in the grid is a real day.
    state({ status: 'no-team', email: 'coach@example.test' });
    await render(<CoachTeamScreen />);
    expect(screen.getByTestId('team-start').props.onChangeText).toBeUndefined();
    await fireEvent.press(screen.getByTestId('team-start'));
    expect(screen.queryByTestId('team-start-day-2026-02-31')).toBeNull();
  });

  it('creates the team with the date once both are given', async () => {
    state({ status: 'no-team', email: 'coach@example.test' });
    await render(<CoachTeamScreen />);
    fireEvent.changeText(screen.getByTestId('team-name'), 'Jakarta U16');
    await waitFor(() => expect(screen.getByTestId('team-name').props.value).toBe('Jakarta U16'));

    await pickDate('team-start', '2026-11-10');
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
    // straight back out of logging, with no screen able to put it back. The
    // calendar offers no way to empty the field -- `clearable` is off -- and
    // saving is refused while the draft still matches what is stored.
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    expect(screen.queryByTestId('team-programme-input-clear')).toBeNull();
    expect(screen.getByTestId('team-programme-save').props.accessibilityState.disabled).toBe(true);
    expect(mockSetStart).not.toHaveBeenCalled();
  });

  it('moves it to another date', async () => {
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    await pickDate('team-programme-input', '2026-11-17');
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
    expect(screen.getByTestId('team-programme')).toHaveTextContent(/Logging opens on this date/);
  });
});

/**
 * Handing the code out.
 *
 * A coach reads it across a pitch and pastes it into WhatsApp. The share
 * sheet covers the first case and covered neither of the other two: a coach
 * already composing a message, and a coach on the web dashboard.
 */
describe('copying the code', () => {
  it('copies the code on its own', async () => {
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    fireEvent.press(screen.getByTestId('team-copy-code'));
    await waitFor(() => expect(mockCopy).toHaveBeenCalledWith('FUEL01'));
    await waitFor(() =>
      expect(screen.getByTestId('team-copy-code')).toHaveTextContent('Copied ✓')
    );
  });

  it('copies the whole invite, code and link and fallback', async () => {
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    fireEvent.press(screen.getByTestId('team-copy-message'));
    await waitFor(() => expect(mockCopy).toHaveBeenCalledTimes(1));
    const sent = mockCopy.mock.calls[0][0];
    expect(sent).toContain('Join Jakarta U16 on Fuel Factor.');
    expect(sent).toContain('fuelfactor://join/FUEL01');
    expect(sent).toContain('enter the team code FUEL01');
  });

  it('says it failed rather than claiming a copy that did not happen', async () => {
    // The clipboard is refusable -- the web API needs https and a gesture --
    // and the code is selectable text, which is the fallback worth naming.
    mockCopy.mockResolvedValue(false);
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    fireEvent.press(screen.getByTestId('team-copy-code'));
    await waitFor(() =>
      expect(screen.getByTestId('team-copy-failed')).toHaveTextContent(/Press and hold the code/)
    );
    expect(screen.getByTestId('team-copy-code')).toHaveTextContent('Copy the code');
  });

  it('leaves the code selectable, which needs no clipboard at all', async () => {
    state({ status: 'ready', email: 'coach@example.test', team: TEAM });
    await render(<CoachTeamScreen />);
    expect(screen.getByTestId('team-join-code').props.selectable).toBe(true);
  });
});
