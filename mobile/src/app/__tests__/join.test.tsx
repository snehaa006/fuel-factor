import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Join from '@/app/join/[code]';
import { signIn } from '@/lib/auth';
import { joinTeam, teamByCode } from '@/lib/join';

jest.mock('@/lib/auth');
jest.mock('@/lib/join', () => ({
  ...jest.requireActual('@/lib/join'),
  joinTeam: jest.fn(),
  teamByCode: jest.fn(),
}));

const mockReplace = jest.fn();
let mockParams: { code?: string } = { code: 'ABC234' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockTeamByCode = teamByCode as jest.MockedFunction<typeof teamByCode>;
const mockJoinTeam = joinTeam as jest.MockedFunction<typeof joinTeam>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { code: 'ABC234' };
  mockSignIn.mockResolvedValue('user-1');
  mockTeamByCode.mockResolvedValue({ name: 'Jakarta U16', programmeStartsOn: null });
  mockJoinTeam.mockResolvedValue('participant-uuid');
});

/** Accept consent and reach the questionnaire. */
async function reachQuestionnaire() {
  await waitFor(() => expect(screen.getByTestId('join-consent')).toBeTruthy());
  fireEvent.press(screen.getByTestId('join-consent'));
  await waitFor(() =>
    expect(screen.getByTestId('join-continue').props.accessibilityState.disabled).toBe(false)
  );
  fireEvent.press(screen.getByTestId('join-continue'));
  await waitFor(() => expect(screen.getByTestId('join-name')).toBeTruthy());
}

describe('the invite link lands here', () => {
  it('names the squad before asking a child for anything', async () => {
    await render(<Join />);
    await waitFor(() =>
      expect(screen.getByTestId('join-team-name')).toHaveTextContent(/Jakarta U16/)
    );
  });

  it('normalises a scruffy code out of the route', async () => {
    mockParams = { code: 'abc234' };
    await render(<Join />);
    await waitFor(() => expect(mockTeamByCode).toHaveBeenCalledWith('ABC234'));
  });

  it('says so plainly when the code matches no team', async () => {
    mockTeamByCode.mockResolvedValue(null);
    await render(<Join />);
    await waitFor(() => expect(screen.getByTestId('join-error')).toHaveTextContent(/No team/));
  });

  it('will not walk on without a session to read the code with', async () => {
    // Anonymous sign-ins are still switched off on this project, and
    // `team_by_code` is granted to `authenticated` and nothing else.
    mockSignIn.mockResolvedValue(null);
    await render(<Join />);
    await waitFor(() => expect(screen.getByTestId('join-sign-in-blocked')).toBeTruthy());
  });
});

describe('consent comes first, on this route too', () => {
  it('will not continue until it is given', async () => {
    // Decision 8 makes the gate blocking on every route in, and `join_team`
    // refuses without it.
    await render(<Join />);
    await waitFor(() => expect(screen.getByTestId('join-continue')).toBeTruthy());
    expect(screen.getByTestId('join-continue').props.accessibilityState.disabled).toBe(true);
  });

  it('shows the same words the roster gate shows', async () => {
    await render(<Join />);
    await waitFor(() =>
      expect(screen.getByText(/never sets a weight goal, never tells you to eat less/)).toBeTruthy()
    );
  });
});

describe('the questionnaire', () => {
  it('asks the PARTICIPANTS sheet’s questions', async () => {
    await render(<Join />);
    await reachQuestionnaire();
    for (const field of [
      'join-name',
      'join-sport',
      'join-height_cm',
      'join-weight_kg',
      'join-waist_cm',
      'join-muac_cm',
      'join-calf_cm',
      'join-parent-contact',
      'join-notes',
      'join-consent-form',
    ]) {
      expect(screen.getByTestId(field)).toBeTruthy();
    }
  });

  it('never asks anybody to type a participant code', async () => {
    // Typing 'T-01' would be typing Theo's real row.
    await render(<Join />);
    await reachQuestionnaire();
    expect(screen.queryByTestId('join-participant-code')).toBeNull();
    expect(screen.queryByTestId('join-id')).toBeNull();
  });

  it('needs only a name', async () => {
    await render(<Join />);
    await reachQuestionnaire();
    expect(screen.getByTestId('join-submit').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('join-name'), 'Budi');
    await waitFor(() =>
      expect(screen.getByTestId('join-submit').props.accessibilityState.disabled).toBe(false)
    );
  });

  it('says the measurements are optional', async () => {
    // A 14 year old guessing at their calf circumference is worse data than a
    // blank, and the research team measures these properly.
    await render(<Join />);
    await reachQuestionnaire();
    expect(screen.getByText(/MEASUREMENTS — ALL OPTIONAL/)).toBeTruthy();
  });

  it('sends what was filled and leaves the rest null', async () => {
    await render(<Join />);
    await reachQuestionnaire();

    fireEvent.changeText(screen.getByTestId('join-name'), 'Budi');
    await waitFor(() => expect(screen.getByTestId('join-name').props.value).toBe('Budi'));
    fireEvent.changeText(screen.getByTestId('join-height_cm'), '171');
    await waitFor(() => expect(screen.getByTestId('join-height_cm').props.value).toBe('171'));

    fireEvent.press(screen.getByTestId('join-submit'));
    await waitFor(() =>
      expect(mockJoinTeam).toHaveBeenCalledWith(
        'ABC234',
        expect.objectContaining({
          name: 'Budi',
          measurements: expect.objectContaining({ height_cm: 171 }),
        }),
        true
      )
    );
  });

  it('asks about the paper consent form as a separate question', async () => {
    // `consent_signed` means a form was signed on paper; the tick in the gate
    // is an app event. The two are different records on purpose.
    await render(<Join />);
    await reachQuestionnaire();
    expect(screen.getByText(/signed the programme’s consent form on paper/)).toBeTruthy();
  });

  it('scores nothing and compares nobody', async () => {
    // No BMI, no category, no band, no colour. The programme has defined none
    // of them, and a weight beside a verdict is the one thing this app must
    // never be.
    await render(<Join />);
    await reachQuestionnaire();
    expect(screen.getByText(/Nothing here is scored or compared with anybody else/)).toBeTruthy();
    for (const word of [/BMI/i, /healthy range/i, /underweight/i, /overweight/i, /ideal/i]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });

  it('reports a units mistake rather than storing a clamped figure', async () => {
    await render(<Join />);
    await reachQuestionnaire();

    fireEvent.changeText(screen.getByTestId('join-name'), 'Budi');
    await waitFor(() => expect(screen.getByTestId('join-name').props.value).toBe('Budi'));
    fireEvent.changeText(screen.getByTestId('join-height_cm'), '1710');
    await waitFor(() => expect(screen.getByTestId('join-height_cm').props.value).toBe('1710'));

    fireEvent.press(screen.getByTestId('join-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('join-error')).toHaveTextContent(/Height should be in cm/)
    );
    expect(mockJoinTeam).not.toHaveBeenCalled();
  });

  it('shows a refusal in the database’s own sentence', async () => {
    mockJoinTeam.mockRejectedValue({ message: 'this device has already joined as an athlete' });
    await render(<Join />);
    await reachQuestionnaire();

    fireEvent.changeText(screen.getByTestId('join-name'), 'Budi');
    await waitFor(() =>
      expect(screen.getByTestId('join-submit').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('join-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('join-error')).toHaveTextContent(/already joined as an athlete/)
    );
    // supabase-js rejects with a plain object, so String(e) would be
    // [object Object] without messageOf.
    expect(screen.getByTestId('join-error')).not.toHaveTextContent(/\[object/);
  });
});
