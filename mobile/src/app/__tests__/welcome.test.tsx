import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Welcome from '@/app/welcome';
import { signOut } from '@/lib/account';
import { claimParticipant, teamRoster } from '@/lib/auth';
import { teamByCode } from '@/lib/join';
import { useAccount } from '@/lib/use-account';
import type { Account } from '@/lib/account';

jest.mock('@/lib/auth');
jest.mock('@/lib/join');
jest.mock('@/lib/account');
jest.mock('@/lib/use-account');

// A mock factory can only reach variables named mock*, so these are.
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRedirect = jest.fn();
let mockParams: { code?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  // The gate is also where an invite link lands when its holder is already on
  // the squad's roster, so it reads a code off the route.
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockRoster = teamRoster as jest.MockedFunction<typeof teamRoster>;
const mockClaim = claimParticipant as jest.MockedFunction<typeof claimParticipant>;
const mockTeamByCode = teamByCode as jest.MockedFunction<typeof teamByCode>;
const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

const signedInAs = (account: Account) =>
  mockUseAccount.mockReturnValue({ status: 'ready', account, reload: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  // The gate is only ever reached by an account with no athlete behind it.
  signedInAs({ role: 'unlinked', email: 'athlete@example.com' });
  mockSignOut.mockResolvedValue(undefined);
  mockTeamByCode.mockResolvedValue({ name: 'Jakarta U16', programmeStartsOn: null });
  mockRoster.mockResolvedValue([
    { participant_code: 'JA-01', name: 'Jacob', claimed: true },
    { participant_code: 'T-01', name: 'Theo', claimed: false },
  ]);
  mockClaim.mockResolvedValue('participant-uuid');
});

/** Tick the consent box and press Continue. */
async function acceptConsent() {
  fireEvent.press(screen.getByTestId('consent-checkbox'));
  // The Continue button only enables on the re-render, so let it land before
  // pressing it — otherwise the press lands on the disabled one.
  await waitFor(() =>
    expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(false)
  );
  fireEvent.press(screen.getByTestId('consent-continue'));
}

/** Accept consent and move on to the team code. */
async function advanceToTeam() {
  await acceptConsent();
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

  it('says what the app does in the words the pitch uses', async () => {
    // The app is what points out a squad's fuel gaps, so no dietitian has to
    // read each athlete's log. The old line promised that one would.
    await render(<Welcome />);
    expect(
      screen.getByText(
        /^Fuel Factor records what you eat and shows you and your coach where your fuel gaps are\./
      )
    ).toBeTruthy();
    expect(screen.queryByText(/dietitian can see/i)).toBeNull();
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
  it('capitalises a code typed in lower case, and looks up the capitalised one', async () => {
    await render(<Welcome />);
    await advanceToTeam();
    fireEvent.changeText(screen.getByTestId('team-code'), 'k7xrmp');
    await waitFor(() => expect(screen.getByTestId('team-code').props.value).toBe('K7XRMP'));
    fireEvent.press(screen.getByTestId('find-team'));
    await waitFor(() => expect(mockRoster).toHaveBeenCalledWith('K7XRMP'));
  });

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
    // The consent tick two steps back travels with them, so the
    // questionnaire does not ask the same question again.
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/join/[code]',
        params: { code: 'NEWONE', consented: '1' },
      })
    );
    expect(screen.queryByTestId('gate-error')).toBeNull();
  });

  it('keeps an invite link’s code filled in when its lookup fails', async () => {
    // Nobody retypes a code they were sent, even when it needs a second try.
    mockParams = { code: 'fuel01' };
    mockRoster.mockRejectedValue({ message: 'Network request failed' });
    await render(<Welcome />);
    await acceptConsent();
    await waitFor(() =>
      expect(screen.getByTestId('gate-error')).toHaveTextContent(/Network request failed/)
    );
    expect(screen.getByTestId('team-code').props.value).toBe('FUEL01');
  });

  it('looks the invite link’s team up as soon as consent is given', async () => {
    // The link already says which team. Ticking the one consent box is the
    // only thing standing between the athlete and their roster.
    mockParams = { code: 'fuel01' };
    await render(<Welcome />);
    await acceptConsent();
    await waitFor(() => expect(mockRoster).toHaveBeenCalledWith('FUEL01'));
    await waitFor(() => expect(screen.getByTestId('athlete-T-01')).toBeTruthy());
  });

  it('sends an invite to a new team on to the questionnaire with consent given', async () => {
    mockParams = { code: 'newone' };
    mockRoster.mockResolvedValue([]);
    await render(<Welcome />);
    await acceptConsent();
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/join/[code]',
        params: { code: 'NEWONE', consented: '1' },
      })
    );
  });

  it('waits for a typed code when nobody brought one', async () => {
    await render(<Welcome />);
    await advanceToTeam();
    expect(mockRoster).not.toHaveBeenCalled();
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
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/today'));
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

describe('the account behind the claim', () => {
  it('names the account an athlete is about to be tied to', async () => {
    // The claim is the one thing here a phone cannot undo, so which account
    // is making it is shown rather than assumed.
    await render(<Welcome />);
    expect(screen.getByTestId('signed-in-as')).toHaveTextContent(/athlete@example\.com/);
  });

  it('offers a way out to somebody signed in as the wrong person', async () => {
    await render(<Welcome />);
    fireEvent.press(screen.getByTestId('welcome-sign-out'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sign-in'));
  });

  it('hands an athlete who already claimed a name back to the router', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.com' });
    await render(<Welcome />);
    expect(mockRedirect).toHaveBeenCalledWith('/');
    expect(screen.queryByTestId('consent-checkbox')).toBeNull();
  });

  it('hands a visitor with no account back to the router', async () => {
    signedInAs({ role: 'signed-out' });
    await render(<Welcome />);
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});
