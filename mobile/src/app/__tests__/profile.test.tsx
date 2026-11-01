import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Profile from '@/app/profile';
import { DEMO_PROFILE } from '@/lib/__fixtures__/today';
import { useProfile } from '@/lib/use-profile';
import type { AthleteProfile, CoachProfile } from '@/lib/profile';

jest.mock('@/lib/use-profile');
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  Redirect: ({ href }: { href: string }) => {
    // require, not an import: a mock factory is hoisted above the imports, so
    // anything it reaches for has to be loaded inside it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockLeave = jest.fn();

function athlete(over: Partial<AthleteProfile> = {}) {
  mockUseProfile.mockReturnValue({
    status: 'ready',
    profile: { ...DEMO_PROFILE, ...over },
    reload: jest.fn(),
    leave: mockLeave,
    leaving: false,
  });
}

function coach(over: Partial<CoachProfile> = {}) {
  mockUseProfile.mockReturnValue({
    status: 'ready',
    profile: {
      kind: 'coach',
      email: 'coach@example.test',
      team: null,
      ...over,
    },
    reload: jest.fn(),
    leave: mockLeave,
    leaving: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLeave.mockResolvedValue(undefined);
  athlete();
});

describe('an athlete’s profile', () => {
  it('names them and their participant code', async () => {
    await render(<Profile />);
    expect(screen.getByTestId('profile-code')).toHaveTextContent(/T-01/);
    expect(screen.getByTestId('profile-code')).toHaveTextContent(/Jakarta U16/);
  });

  it('shows the measurements the tracker holds', async () => {
    await render(<Profile />);
    expect(screen.getByTestId('profile-measurements')).toHaveTextContent(/174 cm/);
    expect(screen.getByTestId('profile-measurements')).toHaveTextContent(/68 kg/);
  });

  it('says a figure was never measured rather than showing a zero', async () => {
    // Theo's waist and MUAC are blank in the tracker. A zero would assert a
    // measurement nobody took.
    await render(<Profile />);
    expect(screen.getByTestId('profile-measurements')).toHaveTextContent(/Not measured/);
  });

  it('offers no way to edit a measurement', async () => {
    // The carbohydrate band on Today is computed from the weight, so an
    // editable field here would quietly make the band answer to a self-report.
    // Somebody joining by link enters their figures once, in the
    // questionnaire, where there is nothing to overwrite.
    await render(<Profile />);
    expect(screen.queryByTestId('profile-weight-input')).toBeNull();
    expect(screen.queryByTestId('profile-edit')).toBeNull();
    expect(screen.getByTestId('profile-measurements-note')).toHaveTextContent(
      /Your coach or the programme's dietitian measures these/
    );
  });

  it('passes no judgement on any figure', async () => {
    // No BMI, no category, no range. The programme has defined none of them.
    await render(<Profile />);
    for (const word of [/BMI/i, /healthy range/i, /underweight/i, /overweight/i, /target weight/i]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });

  it('keeps the paper form and the app’s tick as separate lines', async () => {
    // One is a parental consent form signed on paper; the other is this app's
    // own screen. Recording one as the other would put an app event into the
    // study's record as a collected fact.
    await render(<Profile />);
    expect(screen.getByTestId('profile-consent-signed')).toHaveTextContent(
      /Not recorded as signed/
    );
    expect(screen.getByTestId('profile-consent-ack')).toBeTruthy();
  });

  it('says when the coach has not set the programme date', async () => {
    await render(<Profile />);
    expect(screen.getByTestId('profile-programme')).toHaveTextContent(/has not set it/);
  });

  it('shows the programme date once there is one', async () => {
    athlete({ programmeStartsOn: '2026-11-10' });
    await render(<Profile />);
    expect(screen.getByTestId('profile-programme')).toHaveTextContent('2026-11-10');
  });
});

describe('signing out', () => {
  it('warns an athlete that there is no way back in', async () => {
    // An anonymous session is the only identity an athlete has. There is no
    // password to sign back in with.
    await render(<Profile />);
    fireEvent.press(screen.getByTestId('profile-leave'));
    await waitFor(() =>
      expect(screen.getByTestId('profile-leave-warning')).toHaveTextContent(
        /no password to get back in with/
      )
    );
  });

  it('tells a coach the opposite, because it is true for them', async () => {
    coach();
    await render(<Profile />);
    fireEvent.press(screen.getByTestId('profile-leave'));
    await waitFor(() =>
      expect(screen.getByTestId('profile-leave-warning')).toHaveTextContent(
        /sign back in with your email/
      )
    );
  });

  it('does nothing until it is confirmed', async () => {
    await render(<Profile />);
    fireEvent.press(screen.getByTestId('profile-leave'));
    await waitFor(() => expect(screen.getByTestId('profile-leave-confirm')).toBeTruthy());
    expect(mockLeave).not.toHaveBeenCalled();
  });

  it('can be backed out of', async () => {
    await render(<Profile />);
    fireEvent.press(screen.getByTestId('profile-leave'));
    await waitFor(() => expect(screen.getByTestId('profile-leave-cancel')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-leave-cancel'));
    await waitFor(() => expect(screen.getByTestId('profile-leave')).toBeTruthy());
    expect(mockLeave).not.toHaveBeenCalled();
  });
});

describe('a coach’s profile', () => {
  it('shows the account rather than a participant code', async () => {
    coach();
    await render(<Profile />);
    expect(screen.getByTestId('profile-email')).toHaveTextContent('coach@example.test');
    expect(screen.queryByTestId('profile-code')).toBeNull();
  });

  it('offers to create a team when there is none', async () => {
    coach();
    await render(<Profile />);
    expect(screen.getByTestId('profile-team')).toHaveTextContent(/No team yet/);
    expect(screen.getByTestId('profile-open-team')).toBeTruthy();
  });

  it('names the team and its join code once there is one', async () => {
    coach({
      team: {
        id: 't-1',
        name: 'Jakarta U16',
        joinCode: 'ABC234',
        coachCode: 'KLMN2345',
        programmeStartsOn: null,
        athletes: 3,
      },
    });
    await render(<Profile />);
    expect(screen.getByTestId('profile-team')).toHaveTextContent('Jakarta U16');
    expect(screen.getByText(/ABC234/)).toBeTruthy();
  });

  it('never shows the coach code here', async () => {
    // It belongs on the team screen, set apart and labelled as the one that is
    // not shared. A profile screen is the wrong place to put it beside a code
    // that is meant to be handed out.
    coach({
      team: {
        id: 't-1',
        name: 'Jakarta U16',
        joinCode: 'ABC234',
        coachCode: 'KLMN2345',
        programmeStartsOn: null,
        athletes: 3,
      },
    });
    await render(<Profile />);
    expect(screen.queryByText(/KLMN2345/)).toBeNull();
  });
});

describe('no session at all', () => {
  it('goes to the gate', async () => {
    mockUseProfile.mockReturnValue({
      status: 'signed-out',
      reload: jest.fn(),
      leave: mockLeave,
      leaving: false,
    });
    await render(<Profile />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/welcome');
  });
});
