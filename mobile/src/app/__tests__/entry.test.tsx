import { render, screen } from '@testing-library/react-native';

import Entry from '@/app/index';
import { useAccount } from '@/lib/use-account';
import type { Account } from '@/lib/account';

jest.mock('@/lib/use-account');

// A mock factory can only reach variables named mock*, so this one is.
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;

const signedInAs = (account: Account) =>
  mockUseAccount.mockReturnValue({ status: 'ready', account, reload: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
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

  it('sends an athlete to their day', async () => {
    signedInAs({ role: 'athlete', participantId: 'p-theo', email: 'theo@example.test' });
    await render(<Entry />);
    expect(mockRedirect).toHaveBeenCalledWith('/today');
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
