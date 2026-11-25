import { render, screen } from '@testing-library/react-native';

import CoachAthleteGaps from '@/app/coach/athlete/[id]';
import { analyse, type GapDay } from '@/lib/gaps';
import { useAccount } from '@/lib/use-account';
import { useGaps } from '@/lib/use-gaps';
import type { Account } from '@/lib/account';

jest.mock('@/lib/use-account');
jest.mock('@/lib/use-gaps', () => ({
  ...jest.requireActual('@/lib/use-gaps'),
  useGaps: jest.fn(),
}));

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'p-arya' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseGaps = useGaps as jest.MockedFunction<typeof useGaps>;

const signedInAs = (account: Account) =>
  mockUseAccount.mockReturnValue({ status: 'ready', account, reload: jest.fn() });

const day = (over: Partial<GapDay> = {}): GapDay => ({
  date: '2026-11-10',
  dayType: 'training',
  carbs: 200,
  protein: 90,
  carbsUnknown: 0,
  proteinUnknown: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  signedInAs({ role: 'coach', email: 'coach@example.test' });
  mockUseGaps.mockReturnValue({
    status: 'ready',
    analysis: {
      ...analyse([day(), day({ date: '2026-11-11', carbs: 400 })], 64, '2026-10-29', '2026-11-11'),
      athleteName: 'Arya',
    },
  });
});

describe('a coach looking at one athlete’s fuel gaps', () => {
  it('asks for the athlete in the route, not the signed-in one', async () => {
    await render(<CoachAthleteGaps />);
    expect(mockUseGaps).toHaveBeenCalledWith('p-arya');
  });

  it('names the athlete and draws both charts against the programme’s bands', async () => {
    await render(<CoachAthleteGaps />);
    expect(screen.getByTestId('coach-gaps-name')).toHaveTextContent('Arya');
    expect(screen.getByTestId('gap-carb')).toBeTruthy();
    expect(screen.getByTestId('gap-protein')).toBeTruthy();
    expect(screen.getByTestId('coach-gaps-window')).toHaveTextContent(/2 days logged/);
  });

  it('tells the coach, not the athlete, to add a missing weight', async () => {
    mockUseGaps.mockReturnValue({
      status: 'ready',
      analysis: { ...analyse([day()], null, '2026-10-29', '2026-11-11'), athleteName: 'Arya' },
    });
    await render(<CoachAthleteGaps />);
    expect(screen.getByTestId('coach-gaps-no-weight')).toHaveTextContent(/Add it to their profile/);
  });

  it('says so when the athlete is not theirs to see', async () => {
    mockUseGaps.mockReturnValue({ status: 'needs-onboarding' });
    await render(<CoachAthleteGaps />);
    expect(screen.getByTestId('coach-gaps-error')).toHaveTextContent(/not on your squad/);
  });
});

describe('who may open it', () => {
  it('hands an athlete back to their own day', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-me', email: 'athlete@example.test' });
    await render(<CoachAthleteGaps />);
    expect(mockRedirect).toHaveBeenCalledWith('/');
    expect(mockUseGaps).not.toHaveBeenCalled();
  });

  it('sends a visitor with no account to the coach sign-in', async () => {
    signedInAs({ role: 'signed-out' });
    await render(<CoachAthleteGaps />);
    expect(mockRedirect).toHaveBeenCalledWith('/coach/account');
    expect(mockUseGaps).not.toHaveBeenCalled();
  });
});
