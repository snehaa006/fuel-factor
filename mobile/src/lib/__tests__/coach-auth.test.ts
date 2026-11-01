import {
  createTeam,
  isAnonymousSession,
  myTeam,
  setProgrammeStart,
  signInCoach,
  signUpCoach,
} from '@/lib/coach-auth';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockRpc = supabase.rpc as unknown as jest.Mock;
const mockGetSession = supabase.auth.getSession as unknown as jest.Mock;
const mockSignUp = supabase.auth.signUp as unknown as jest.Mock;
const mockSignIn = supabase.auth.signInWithPassword as unknown as jest.Mock;
const mockSignOut = supabase.auth.signOut as unknown as jest.Mock;

const teamRow = {
  id: 't-1',
  name: 'Jakarta U16',
  join_code: 'ABC234',
  coach_code: 'KLMN2345',
  programme_starts_on: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockSignOut.mockResolvedValue({ error: null });
});

describe('signing a coach in', () => {
  it('clears an anonymous session first', async () => {
    // A device may already hold an anonymous athlete session. Signing up on
    // top of one risks converting that user into the coach's account, which
    // would hand the coach an athlete claim and leave the database with two
    // right answers to "which athlete is this".
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'anon-1' } } } });
    mockSignIn.mockResolvedValue({ error: null });

    await signInCoach('coach@example.test', 'secret');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('does not sign out when there is nothing to sign out of', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    await signInCoach('coach@example.test', 'secret');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('trims the email, because a keyboard adds a space', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    await signInCoach(' coach@example.test ', 'secret');
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'coach@example.test',
      password: 'secret',
    });
  });

  it('reports a refusal in the words the server used', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    await expect(signInCoach('coach@example.test', 'wrong')).rejects.toThrow(
      'Invalid login credentials'
    );
  });
});

describe('signing a coach up', () => {
  it('says when the project wants an email confirmation first', async () => {
    // No session back means confirmation is on, which is a setting rather than
    // a failure, so the screen can say so instead of looking broken.
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    await expect(signUpCoach('coach@example.test', 'secret')).resolves.toEqual({
      confirmed: false,
    });
  });

  it('reports a session straight away when confirmation is off', async () => {
    mockSignUp.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    await expect(signUpCoach('coach@example.test', 'secret')).resolves.toEqual({
      confirmed: true,
    });
  });
});

describe('isAnonymousSession', () => {
  it('reads the claim the database checks, not a second opinion', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u-1', is_anonymous: true } } },
    });
    await expect(isAnonymousSession()).resolves.toBe(true);
  });

  it('is false for a real account', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u-1', email: 'coach@example.test' } } },
    });
    await expect(isAnonymousSession()).resolves.toBe(false);
  });

  it('is false when there is no session at all', async () => {
    await expect(isAnonymousSession()).resolves.toBe(false);
  });
});

describe('createTeam', () => {
  it('lets the database generate both codes', async () => {
    // A coach picking a join code would pick a guessable one, and a guessable
    // join code is a stranger reading a roster of named minors.
    mockRpc.mockResolvedValue({ data: [teamRow], error: null });

    const team = await createTeam('Jakarta U16', null);
    expect(mockRpc).toHaveBeenCalledWith('create_team', {
      p_name: 'Jakarta U16',
      p_starts_on: null,
    });
    expect(Object.keys(mockRpc.mock.calls[0][1])).not.toContain('p_join_code');
    expect(Object.keys(mockRpc.mock.calls[0][1])).not.toContain('p_coach_code');
    expect(team).toEqual({
      id: 't-1',
      name: 'Jakarta U16',
      joinCode: 'ABC234',
      coachCode: 'KLMN2345',
      programmeStartsOn: null,
      athletes: 0,
    });
  });

  it('passes the programme date straight through', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...teamRow, programme_starts_on: '2026-11-10' }],
      error: null,
    });
    const team = await createTeam('Jakarta U16', '2026-11-10');
    expect(team.programmeStartsOn).toBe('2026-11-10');
  });

  it('shows the database’s own sentence when an anonymous session tries', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'creating a team needs an account with an email, not an anonymous session' },
    });
    await expect(createTeam('Jakarta U16')).rejects.toThrow(/needs an account with an email/);
  });
});

describe('myTeam', () => {
  it('is the only way the coach code reaches a client', async () => {
    // The column is revoked from `authenticated`, so a select on `teams`
    // never returns it: an athlete who is a team member could otherwise read
    // it and use it on a second device.
    mockRpc.mockResolvedValue({ data: [{ ...teamRow, athletes: 3 }], error: null });
    const team = await myTeam();
    expect(mockRpc).toHaveBeenCalledWith('my_team');
    expect(team?.coachCode).toBe('KLMN2345');
    expect(team?.athletes).toBe(3);
  });

  it('is null for a coach who has not made a team', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(myTeam()).resolves.toBeNull();
  });
});

describe('setProgrammeStart', () => {
  it('names no team, so it cannot be pointed at somebody else’s squad', async () => {
    mockRpc.mockResolvedValue({ data: '2026-11-10', error: null });
    await setProgrammeStart('2026-11-10');
    expect(mockRpc).toHaveBeenCalledWith('set_programme_start', { p_starts_on: '2026-11-10' });
    expect(Object.keys(mockRpc.mock.calls[0][1])).not.toContain('p_team_id');
  });

  it('can clear the date', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await setProgrammeStart(null);
    expect(mockRpc).toHaveBeenCalledWith('set_programme_start', { p_starts_on: null });
  });
});
