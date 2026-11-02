import { render, screen } from '@testing-library/react-native';

import Entry from '@/app/index';
import { useAccount } from '@/lib/use-account';
import { useProgramme } from '@/lib/use-programme';
import type { Account } from '@/lib/account';

jest.mock('@/lib/use-account');
jest.mock('@/lib/use-programme');

// A mock factory can only reach variables named mock*, so this one is.
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseProgramme = useProgramme as jest.MockedFunction<typeof useProgramme>;

const signedInAs = (account: Account) =>
  mockUseAccount.mockReturnValue({ status: 'ready', account, reload: jest.fn() });

/** An athlete's squad, five days into the four weeks. */
const programmeOpen = () =>
  mockUseProgramme.mockReturnValue({
    status: 'ready',
    programme: { status: 'open', startsOn: '2026-11-01', day: 5, of: 28 },
    name: 'Theo',
    teamName: 'Jakarta U16',
    reload: jest.fn(),
  });

beforeEach(() => {
  jest.clearAllMocks();
  programmeOpen();
});

/**
 * The root route used to *be* the athlete's day, which is what made the two
 * halves of this app one undivided thing. Four destinations, no overlap.
 */
describe('where the app opens', () => {
  it('sends a visitor with no account to the sign-in', async () => {
    signedInAs({ role: 'signed-out' });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
  });

  it('sends a coach to the coach home, never to an athlete’s day', async () => {
    signedInAs({ role: 'coach', email: 'coach@example.test' });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/coach');
  });

  it('sends an account with no athlete behind it to the gate', async () => {
    signedInAs({ role: 'unlinked', email: 'new@example.test' });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/welcome');
  });

  it('sends an athlete whose programme is running to their day', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.test' });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/today');
  });

  it('sends an athlete whose programme has not started to their baseline recall', async () => {
    // The three recall days are the thing that has to happen before day one,
    // and the rest of the app is a day of the intervention. An athlete who
    // joins a week early gets the recall and nothing else.
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.test' });
    mockUseProgramme.mockReturnValue({
      status: 'ready',
      programme: { status: 'before', startsOn: '2026-12-01', daysUntil: 9 },
      name: 'Theo',
      teamName: 'Jakarta U16',
      reload: jest.fn(),
    });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/before-you-start');
    expect(mockRedirect).not.toHaveBeenCalledWith('/today');
  });

  it('holds a team with no first day to the recall rather than guessing one', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.test' });
    mockUseProgramme.mockReturnValue({
      status: 'ready',
      programme: { status: 'no-date' },
      name: 'Theo',
      teamName: 'Jakarta U16',
      reload: jest.fn(),
    });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/before-you-start');
  });

  it('decides nothing while it is still asking', async () => {
    mockUseAccount.mockReturnValue({ status: 'loading', reload: jest.fn() });
    await render(<Entry />);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('shows a refusal in words rather than guessing a destination', async () => {
    mockUseAccount.mockReturnValue({
      status: 'error',
      message: 'network request failed',
      reload: jest.fn(),
    });
    await render(<Entry />);
    expect(screen.getByTestId('entry-error')).toHaveTextContent(/network request failed/);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
