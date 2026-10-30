import { claimParticipant, ClaimError, claimedParticipantId, signIn, teamRoster } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), signInAnonymously: jest.fn() },
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  signInAnonymously: jest.Mock;
};
const rpc = supabase.rpc as unknown as jest.Mock;
const from = supabase.from as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: null } });
});

describe('signIn', () => {
  it('reuses a session the device already has', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    expect(await signIn()).toBe('u1');
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is none', async () => {
    auth.signInAnonymously.mockResolvedValue({ data: { session: { user: { id: 'u2' } } }, error: null });
    expect(await signIn()).toBe('u2');
  });

  it('collects no credential of any kind', async () => {
    auth.signInAnonymously.mockResolvedValue({ data: { session: { user: { id: 'u2' } } }, error: null });
    await signIn();
    expect(auth.signInAnonymously).toHaveBeenCalledWith();
  });

  it('reports the provider being switched off as a setting, not a crash', async () => {
    auth.signInAnonymously.mockResolvedValue({
      data: {},
      error: { code: 'anonymous_provider_disabled', message: 'Anonymous sign-ins are disabled' },
    });
    expect(await signIn()).toBeNull();
  });

  it('still throws on a real failure', async () => {
    auth.signInAnonymously.mockResolvedValue({
      data: {},
      error: { code: 'over_request_rate_limit', message: 'slow down' },
    });
    await expect(signIn()).rejects.toMatchObject({ message: 'slow down' });
  });
});

describe('teamRoster', () => {
  it('asks for the roster behind a code', async () => {
    rpc.mockResolvedValue({ data: [{ participant_code: 'T-01', name: 'Theo', claimed: false }], error: null });
    await expect(teamRoster('fuel01')).resolves.toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith('team_roster', { p_join_code: 'fuel01' });
  });

  it('returns an empty roster rather than null for an unknown code', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(teamRoster('NOPE')).resolves.toEqual([]);
  });
});

describe('claimParticipant', () => {
  it('sends consent with the claim, never after it', async () => {
    // The database refuses without it, so there is no ordering in which a
    // device is linked to an athlete before the screen was accepted.
    rpc.mockResolvedValue({ data: 'participant-uuid', error: null });
    await claimParticipant('FUEL01', 'T-01', true);
    expect(rpc).toHaveBeenCalledWith('claim_participant', {
      p_join_code: 'FUEL01',
      p_participant_code: 'T-01',
      p_consent_ack: true,
    });
  });

  it('passes a refusal straight through rather than claiming anyway', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'consent is required before an athlete can be claimed' } });
    await expect(claimParticipant('FUEL01', 'T-01', false)).rejects.toBeInstanceOf(ClaimError);
  });

  it('shows the database’s own sentence, which is written to be read', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'that athlete is already claimed on another device' } });
    await expect(claimParticipant('FUEL01', 'T-01', true)).rejects.toThrow(
      'that athlete is already claimed on another device'
    );
  });
});

describe('claimedParticipantId', () => {
  it('is null on a device that has claimed nobody', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    from.mockReturnValue(chain);
    expect(await claimedParticipantId()).toBeNull();
  });

  it('returns the athlete this device holds', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { participant_id: 'p1' }, error: null }),
    };
    from.mockReturnValue(chain);
    expect(await claimedParticipantId()).toBe('p1');
  });
});
