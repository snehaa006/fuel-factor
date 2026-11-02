import { resolveAccount, signInAthlete, signOut, signUpAthlete } from '@/lib/account';
import { claimedParticipantId } from '@/lib/auth';
import { isCoach } from '@/lib/coach';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
jest.mock('@/lib/coach', () => ({ isCoach: jest.fn() }));
jest.mock('@/lib/auth', () => ({ claimedParticipantId: jest.fn() }));

const mockGetSession = supabase.auth.getSession as unknown as jest.Mock;
const mockSignUp = supabase.auth.signUp as unknown as jest.Mock;
const mockPasswordSignIn = supabase.auth.signInWithPassword as unknown as jest.Mock;
const mockSignOut = supabase.auth.signOut as unknown as jest.Mock;
const mockIsCoach = isCoach as jest.MockedFunction<typeof isCoach>;
const mockClaimed = claimedParticipantId as jest.MockedFunction<typeof claimedParticipantId>;

const session = (over: Record<string, unknown> = {}) => ({
  data: { session: { user: { id: 'u-1', email: 'athlete@example.test', ...over } } },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockSignOut.mockResolvedValue({ error: null });
  mockSignUp.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } }, error: null });
  mockPasswordSignIn.mockResolvedValue({ error: null });
  mockIsCoach.mockResolvedValue(false);
  mockClaimed.mockResolvedValue(null);
});

describe('an athlete account', () => {
  it('signs out whatever is here before signing up', async () => {
    // Signing up on top of an anonymous session converts that user into the
    // new account rather than making one, which would hand the new account
    // whatever the old device had already claimed.
    mockGetSession.mockResolvedValue(session());
    await signUpAthlete('New@Example.test', 'secret');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('does not sign out when there is nothing to sign out of', async () => {
    await signInAthlete('a@example.test', 'secret');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('normalises the email the same way on sign-up and sign-in', async () => {
    // A phone that capitalises the first letter of an address must not make
    // a second account, or fail to find the first.
    await signUpAthlete('  Athlete@Example.TEST ', 'secret');
    await signInAthlete('ATHLETE@example.test', 'secret');
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'athlete@example.test' })
    );
    expect(mockPasswordSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'athlete@example.test' })
    );
  });

  it('reports an unconfirmed account rather than treating it as a failure', async () => {
    // No session back means the project asks for an email confirmation,
    // which is a setting, so the screen can say so plainly.
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await signUpAthlete('a@example.test', 'secret')).toEqual({ confirmed: false });
  });

  it('shows a refused sign-in in the words the server used', async () => {
    mockPasswordSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    await expect(signInAthlete('a@example.test', 'nope')).rejects.toThrow(
      'Invalid login credentials'
    );
  });

  it('raises a failed sign-out rather than pretending it worked', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'network' } });
    await expect(signOut()).rejects.toThrow('network');
  });
});

describe('who is signed in', () => {
  it('is signed out when there is no session', async () => {
    expect(await resolveAccount()).toEqual({ role: 'signed-out' });
  });

  it('asks nothing else once there is no session', async () => {
    await resolveAccount();
    expect(mockIsCoach).not.toHaveBeenCalled();
    expect(mockClaimed).not.toHaveBeenCalled();
  });

  it('is a coach when the session holds a coach membership', async () => {
    mockGetSession.mockResolvedValue(session({ email: 'coach@example.test' }));
    mockIsCoach.mockResolvedValue(true);
    expect(await resolveAccount()).toEqual({ role: 'coach', email: 'coach@example.test' });
  });

  it('asks a coach which athlete they are, never', async () => {
    // This is the whole bug the resolver exists for. A coach *can* read their
    // squad's participant rows -- `can_see_participant` is true for every
    // athlete they coach -- so asking "can I see a participant" first handed
    // the coach one of their own athletes and rendered that athlete's day.
    mockGetSession.mockResolvedValue(session({ email: 'coach@example.test' }));
    mockIsCoach.mockResolvedValue(true);
    mockClaimed.mockResolvedValue('p-theo');

    expect(await resolveAccount()).toMatchObject({ role: 'coach' });
    expect(mockClaimed).not.toHaveBeenCalled();
  });

  it('is an athlete when the session has claimed one', async () => {
    mockGetSession.mockResolvedValue(session());
    mockClaimed.mockResolvedValue('p-theo');
    expect(await resolveAccount()).toEqual({
      role: 'athlete',
      participantId: 'p-theo',
      email: 'athlete@example.test',
    });
  });

  it('is unlinked when the account has no athlete behind it yet', async () => {
    mockGetSession.mockResolvedValue(session());
    expect(await resolveAccount()).toEqual({ role: 'unlinked', email: 'athlete@example.test' });
  });

  it('carries a null email rather than inventing one', async () => {
    // An anonymous session from before accounts existed still has to resolve.
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    expect(await resolveAccount()).toEqual({ role: 'unlinked', email: null });
  });
});
