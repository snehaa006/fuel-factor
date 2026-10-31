import { DEMO_LEADERBOARD } from '@/lib/__fixtures__/today';
import {
  fetchLeaderboard,
  myRow,
  mvp,
  rank,
  WINDOW_DAYS,
  type LeaderboardRow,
} from '@/lib/team';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const mockFrom = supabase.from as unknown as jest.Mock;
const mockRpc = supabase.rpc as unknown as jest.Mock;

function athlete(name: string, daysLogged: number, extra: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    participantCode: name.slice(0, 2).toUpperCase(),
    name,
    daysLogged,
    loggedToday: false,
    isMe: false,
    ...extra,
  };
}

describe('rank', () => {
  it('orders by days logged, most first', () => {
    const ranked = rank([athlete('Jacob', 4), athlete('Jeongho', 7), athlete('Theo', 6)]);
    expect(ranked.map((r) => r.name)).toEqual(['Jeongho', 'Theo', 'Jacob']);
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('gives a shared position to equal day counts', () => {
    // Two athletes on five days are both second. Neither is put above the
    // other, because the only figures available to break the tie with are the
    // ones this whole feature exists to keep out of a ranking.
    const ranked = rank([
      athlete('Theo', 7),
      athlete('Jacob', 5),
      athlete('Jeongho', 5),
      athlete('Budi', 2),
    ]);
    expect(ranked.map((r) => [r.name, r.position])).toEqual([
      ['Theo', 1],
      ['Jacob', 2],
      ['Jeongho', 2],
      ['Budi', 4],
    ]);
  });

  it('skips the position a tie consumed', () => {
    const ranked = rank([athlete('A', 3), athlete('B', 3), athlete('C', 1)]);
    expect(ranked.map((r) => r.position)).toEqual([1, 1, 3]);
  });

  it('breaks the display order on the name, not on anything hidden', () => {
    const ranked = rank([athlete('Zaki', 3), athlete('Adi', 3)]);
    expect(ranked.map((r) => r.name)).toEqual(['Adi', 'Zaki']);
    expect(ranked.map((r) => r.position)).toEqual([1, 1]);
  });

  it('ranks a squad nobody has logged in without crashing', () => {
    const ranked = rank([athlete('Theo', 0), athlete('Jacob', 0)]);
    expect(ranked.map((r) => r.position)).toEqual([1, 1]);
  });

  it('leaves the caller’s rows alone', () => {
    const rows = [athlete('Theo', 1)];
    rank(rows);
    expect(rows[0]).not.toHaveProperty('position');
  });

  it('ranks an empty squad as an empty board', () => {
    expect(rank([])).toEqual([]);
  });
});

describe('mvp', () => {
  it('names the athlete on the top count', () => {
    expect(mvp([athlete('Jacob', 4), athlete('Jeongho', 7), athlete('Theo', 6)])).toEqual([
      'Jeongho',
    ]);
  });

  it('names everyone when the lead is shared', () => {
    expect(mvp([athlete('Theo', 5), athlete('Jacob', 5), athlete('Budi', 1)])).toEqual([
      'Jacob',
      'Theo',
    ]);
  });

  it('awards nobody when the whole squad is on zero', () => {
    // Nobody is MVP for logging nothing. Awarding it to whoever sorts first
    // would make the badge meaningless on exactly the week it is first seen.
    expect(mvp([athlete('Theo', 0), athlete('Jacob', 0)])).toEqual([]);
  });

  it('awards nobody on an empty board', () => {
    expect(mvp([])).toEqual([]);
  });
});

describe('myRow', () => {
  it('finds the athlete this device holds', () => {
    const ranked = rank([athlete('Jeongho', 7), athlete('Theo', 6, { isMe: true })]);
    expect(myRow(ranked)?.name).toBe('Theo');
    expect(myRow(ranked)?.position).toBe(2);
  });

  it('is null before an athlete has been claimed', () => {
    expect(myRow(rank([athlete('Jeongho', 7)]))).toBeNull();
  });
});

describe('fetchLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { name: 'Jakarta U16' }, error: null }) }) }),
    });
    mockRpc.mockReturnValue({
      returns: async () => ({
        data: [
          { participant_code: 'J-01', name: 'Jeongho', days_logged: 7, logged_today: true, is_me: false },
          { participant_code: 'T-01', name: 'Theo', days_logged: 6, logged_today: true, is_me: true },
        ],
        error: null,
      }),
    });
  });

  it('passes the caller’s date and window to the function', async () => {
    // The date is the athlete's Jakarta wall clock, not the server's UTC one.
    // At one in the morning in Jakarta those are different days, and the
    // athlete who just logged would otherwise not be lit.
    await fetchLeaderboard('2026-10-31');
    expect(mockRpc).toHaveBeenCalledWith('team_leaderboard', {
      p_today: '2026-10-31',
      p_days: WINDOW_DAYS,
    });
  });

  it('maps the rows and ranks them', async () => {
    const board = await fetchLeaderboard('2026-10-31');
    expect(board.teamName).toBe('Jakarta U16');
    expect(board.rows.map((r) => [r.name, r.position])).toEqual([
      ['Jeongho', 1],
      ['Theo', 2],
    ]);
    expect(board.mvp).toEqual(['Jeongho']);
    expect(board.windowDays).toBe(WINDOW_DAYS);
  });

  it('returns an empty board when the device has claimed nobody', async () => {
    // The function is scoped to the caller's own team, so a device with no
    // athlete gets no rows rather than a view of somebody else's squad.
    mockRpc.mockReturnValue({ returns: async () => ({ data: [], error: null }) });
    const board = await fetchLeaderboard('2026-10-31');
    expect(board.rows).toEqual([]);
    expect(board.mvp).toEqual([]);
  });

  it('survives a team row it is not allowed to read', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    });
    expect((await fetchLeaderboard('2026-10-31')).teamName).toBeNull();
  });

  it('reports a refused call the way supabase-js refuses', async () => {
    // supabase-js rejects with a plain object, not an Error. A test that
    // rejects with a real Error hides the bug this project already shipped
    // once, so the shape here is the real one.
    mockRpc.mockReturnValue({
      returns: async () => ({ data: null, error: { message: 'permission denied' } }),
    });
    await expect(fetchLeaderboard('2026-10-31')).rejects.toThrow('permission denied');
  });
});

describe('the demo board stays in step with the ranking', () => {
  it('carries the positions rank would give it', () => {
    // The fixture writes its positions out rather than calling rank at
    // module-init time across a module that reaches supabase.ts, which is the
    // shape that once bundled cleanly and crashed on boot. This is what keeps
    // the two honest instead.
    const bare = DEMO_LEADERBOARD.rows.map(({ position, ...row }) => row);
    expect(DEMO_LEADERBOARD.rows).toEqual(rank(bare));
    expect(DEMO_LEADERBOARD.mvp).toEqual(mvp(bare));
    expect(DEMO_LEADERBOARD.windowDays).toBe(WINDOW_DAYS);
  });

  it('agrees with the streak strip about how many days Theo logged', () => {
    // Six of demoActiveDates' seven days fall inside a seven-day window. If
    // these two ever disagree the demo contradicts itself on one screen.
    const theo = DEMO_LEADERBOARD.rows.find((r) => r.isMe);
    expect(theo?.daysLogged).toBe(6);
  });

  it('does not make the demo athlete the MVP', () => {
    // A board where the demo athlete always wins shows nothing about how it
    // reads when somebody is ahead of you, which is the half of the mechanic
    // that makes an athlete log tomorrow.
    expect(DEMO_LEADERBOARD.mvp).not.toContain('Theo');
  });
});
