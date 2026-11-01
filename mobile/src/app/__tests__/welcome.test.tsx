import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Welcome from '@/app/welcome';
import { claimParticipant, signIn, teamRoster } from '@/lib/auth';
import { teamByCode } from '@/lib/join';

jest.mock('@/lib/auth');
jest.mock('@/lib/join');

// A mock factory can only reach variables named mock*, so these are.
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { code?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  // The gate is also where an invite link lands when its holder is already on
  // the squad's roster, so it reads a code off the route.
  useLocalSearchParams: () => mockParams,
}));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockRoster = teamRoster as jest.MockedFunction<typeof teamRoster>;
const mockClaim = claimParticipant as jest.MockedFunction<typeof claimParticipant>;
const mockTeamByCode = teamByCode as jest.MockedFunction<typeof teamByCode>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSignIn.mockResolvedValue('user-1');
  mockTeamByCode.mockResolvedValue({ name: 'Jakarta U16', programmeStartsOn: null });
  mockRoster.mockResolvedValue([
    { participant_code: 'JA-01', name: 'Jacob', claimed: true },
    { participant_code: 'T-01', name: 'Theo', claimed: false },
  ]);
  mockClaim.mockResolvedValue('participant-uuid');
});

/** Accept consent and move on to the team code. */
async function advanceToTeam() {
  fireEvent.press(screen.getByTestId('consent-checkbox'));
  // The Continue button only enables on the re-render, so let it land before
  // pressing it — otherwise the press lands on the disabled one.
  await waitFor(() =>
    expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(false)
  );
  fireEvent.press(screen.getByTestId('consent-continue'));
  await waitFor(() => expect(screen.getByTestId('team-code')).toBeTruthy());
}

/** Type a team code and look it up, letting the button enable first. */
async function lookUp(code: string) {
  fireEvent.changeText(screen.getByTestId('team-code'), code);
  await waitFor(() =>
    expect(screen.getByTestId('find-team').props.accessibilityState.disabled).toBe(false)
  );
  fireEvent.press(screen.getByTestId('find-team'));
}

describe('the consent gate', () => {
  it('opens on consent, not on the team code', async () => {
    await render(<Welcome />);
    expect(screen.getByTestId('consent-checkbox')).toBeTruthy();
    expect(screen.queryByTestId('team-code')).toBeNull();
  });

  it('will not continue until consent is given', async () => {
    await render(<Welcome />);
    fireEvent.press(screen.getByTestId('consent-continue'));
    expect(screen.queryByTestId('team-code')).toBeNull();
  });

  it('continues once consent is given', async () => {
    await render(<Welcome />);
    await advanceToTeam();
    expect(screen.getByTestId('team-code')).toBeTruthy();
  });

  it('promises what the programme promised, and no weight goal', async () => {
    await render(<Welcome />);
    expect(screen.getByText(/never sets a weight goal/i)).toBeTruthy();
    expect(screen.getByText(/never calls a food bad/i)).toBeTruthy();
  });

  it('asks for parental agreement, not just the athlete’s', async () => {
    await render(<Welcome />);
    expect(screen.getByLabelText(/parent or guardian has agreed/i)).toBeTruthy();
  });
});

describe('the team code step', () => {
  it('shows the roster for a code', async () => {
    await render(<Welcome />);
    await advanceToTeam();
    await lookUp('FUEL01');
    await waitFor(() => expect(screen.getByTestId('athlete-T-01')).toBeTruthy());
  });

  it('shows a lookup failure as a sentence, not as [object Object]', async () => {
    mockRoster.mockRejectedValue({ message: 'JWT expired', code: 'PGRST301' });
    await render(<Welcome />);
    await advanceToTeam();
    await lookUp('FUEL01');
    await waitFor(() => expect(screen.getByTestId('gate-error')).toHaveTextContent('JWT expired'));
    expect(screen.getByTestId('gate-error')).not.toHaveTextContent(/\[object/);
  });

  it('says so plainly when no team has that code', async () => {
    // An empty roster alone no longer proves the code is wrong, so the screen
    // asks whether the team exists before saying so.
    mockRoster.mockResolvedValue([]);
    mockTeamByCode.mockResolvedValue(null);
    await render(<Welcome />);
    await advanceToTeam();
    await lookUp('NOPE');
    await waitFor(() => expect(screen.getByTestId('gate-error')).toHaveTextContent(/no team with that code/i));
  });

  it('offers the questionnaire for a team that exists and has nobody on it', async () => {
    // A team a coach has only just created has no roster at all. Telling its
    // first athlete their code is wrong would make a new team unjoinable.
    mockRoster.mockResolvedValue([]);
    await render(<Welcome />);
    await advanceToTeam();
    await lookUp('NEWONE');
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/join/NEWONE'));
    expect(screen.queryByTestId('gate-error')).toBeNull();
  });

  it('carries a code from the invite link so nobody retypes it', async () => {
    mockParams = { code: 'fuel01' };
    await render(<Welcome />);
    await advanceToTeam();
    expect(screen.getByTestId('team-code').props.value).toBe('FUEL01');
  });
});

describe('claiming an athlete', () => {
  async function reachRoster() {
    await render(<Welcome />);
    await advanceToTeam();
    await lookUp('FUEL01');
    await waitFor(() => expect(screen.getByTestId('athlete-T-01')).toBeTruthy());
  }

  it('claims the athlete, carrying the consent that was given', async () => {
    await reachRoster();
    fireEvent.press(screen.getByTestId('athlete-T-01'));
    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith('FUEL01', 'T-01', true));
  });

  it('goes to Today once claimed', async () => {
    await reachRoster();
    fireEvent.press(screen.getByTestId('athlete-T-01'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('will not let an athlete already on another device be taken', async () => {
    await reachRoster();
    fireEvent.press(screen.getByTestId('athlete-JA-01'));
    expect(mockClaim).not.toHaveBeenCalled();
    expect(screen.getByTestId('athlete-JA-01')).toHaveTextContent(/already on another device/i);
  });

  it('stays put and shows why when the claim is refused', async () => {
    // Rejected the way supabase-js actually does: a plain object, not an Error.
    // Rejecting with an Error here is what let "[object Object]" reach the screen.
    mockClaim.mockRejectedValue({
      message: 'that athlete is already claimed on another device',
      code: '23505',
    });
    await reachRoster();
    fireEvent.press(screen.getByTestId('athlete-T-01'));
    await waitFor(() =>
      expect(screen.getByTestId('gate-error')).toHaveTextContent(/already claimed on another device/i)
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('when anonymous sign-ins are switched off', () => {
  it('says which setting it is rather than failing silently', async () => {
    mockSignIn.mockResolvedValue(null);
    await render(<Welcome />);
    await waitFor(() => expect(screen.getByTestId('sign-in-blocked')).toBeTruthy());
    expect(screen.getByTestId('sign-in-blocked')).toHaveTextContent(/Authentication → Sign In \/ Providers/);
  });

  it('does not let the athlete walk on into a lookup that cannot succeed', async () => {
    mockSignIn.mockResolvedValue(null);
    await render(<Welcome />);
    await waitFor(() => expect(screen.getByTestId('sign-in-blocked')).toBeTruthy());
    fireEvent.press(screen.getByTestId('consent-checkbox'));
    await waitFor(() =>
      expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(true)
    );
  });
});
