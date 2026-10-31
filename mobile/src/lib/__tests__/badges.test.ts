import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEMO_BADGES, DEMO_STATS } from '@/lib/__fixtures__/today';
import {
  award,
  earnedCount,
  fetchStats,
  NO_STATS,
  valueFor,
  type AthleteStats,
  type Badge,
} from '@/lib/badges';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const mockFrom = supabase.from as unknown as jest.Mock;

function badge(over: Partial<Badge> = {}): Badge {
  return {
    id: 'b',
    code: 'ten_days',
    name: 'Ten Days',
    description: 'Log on ten different days.',
    criterion: 'days_logged',
    threshold: 10,
    position: 1,
    ...over,
  };
}

const stats = (over: Partial<AthleteStats> = {}): AthleteStats => ({ ...NO_STATS, ...over });

describe('award', () => {
  it('earns a badge once the threshold is reached', () => {
    const [earned] = award([badge()], stats({ daysLogged: 10 }));
    expect(earned.earned).toBe(true);
    expect(earned.progress).toBe(10);
  });

  it('does not earn it one short', () => {
    expect(award([badge()], stats({ daysLogged: 9 }))[0].earned).toBe(false);
  });

  it('keeps earning it past the threshold', () => {
    expect(award([badge()], stats({ daysLogged: 40 }))[0].earned).toBe(true);
  });

  it('earns nothing on an athlete who has done nothing', () => {
    const awarded = award([badge(), badge({ code: 'streak', criterion: 'streak', threshold: 7 })], NO_STATS);
    expect(awarded.every((b) => !b.earned)).toBe(true);
  });

  it('keeps the ladder in its seeded order, not earned first', () => {
    // The set is a progression. Seeing the next rung directly under the last
    // one cleared is the reason locked badges are on screen at all.
    const awarded = award(
      [
        badge({ code: 'thirty', threshold: 30, position: 3 }),
        badge({ code: 'first', threshold: 1, position: 1 }),
        badge({ code: 'ten', threshold: 10, position: 2 }),
      ],
      stats({ daysLogged: 1 })
    );
    expect(awarded.map((b) => b.code)).toEqual(['first', 'ten', 'thirty']);
    expect(awarded.map((b) => b.earned)).toEqual([true, false, false]);
  });

  it('leaves the caller’s rows alone', () => {
    const rows = [badge()];
    award(rows, stats({ daysLogged: 10 }));
    expect(rows[0]).not.toHaveProperty('earned');
  });
});

describe('valueFor', () => {
  it('reads each criterion off its own figure', () => {
    const s = stats({ daysLogged: 3, bestStreak: 5, challengesDone: 2 });
    expect(valueFor(s, 'days_logged')).toBe(3);
    expect(valueFor(s, 'streak')).toBe(5);
    expect(valueFor(s, 'challenges_done')).toBe(2);
  });
});

describe('earnedCount', () => {
  it('counts the lit ones', () => {
    const awarded = award(
      [badge({ threshold: 1, position: 1 }), badge({ code: 'b2', threshold: 99, position: 2 })],
      stats({ daysLogged: 5 })
    );
    expect(earnedCount(awarded)).toBe(1);
  });
});

describe('fetchStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table: string) => ({
      select: async () =>
        table === 'daily_logs'
          ? {
              data: [
                { log_date: '2026-10-31' },
                { log_date: '2026-10-30' },
                { log_date: '2026-10-29' },
                // A duplicate row for a day already counted.
                { log_date: '2026-10-29' },
                { log_date: '2026-10-20' },
              ],
              error: null,
            }
          : { data: [{ challenge_id: 'c1' }, { challenge_id: 'c1' }, { challenge_id: 'c2' }], error: null },
    }));
  });

  it('counts a day once however many rows it has', () => {
    // Not a real shape for daily_logs, which is unique on (participant, date),
    // but the count must not depend on that holding.
    return fetchStats('2026-10-31').then((s) => expect(s.daysLogged).toBe(4));
  });

  it('takes the longest run on record as the streak', async () => {
    expect((await fetchStats('2026-10-31')).bestStreak).toBe(3);
  });

  it('counts a challenge once however many days it was done on', async () => {
    // Finishing week 1's challenge on three separate days is one challenge
    // done, not three.
    expect((await fetchStats('2026-10-31')).challengesDone).toBe(2);
  });

  it('reports a refusal the way supabase-js refuses', async () => {
    mockFrom.mockImplementation(() => ({
      select: async () => ({ data: null, error: { message: 'permission denied' } }),
    }));
    await expect(fetchStats('2026-10-31')).rejects.toThrow('permission denied');
  });
});

describe('the badge set is behavioural only', () => {
  const root = resolve(__dirname, '../../../..');
  const seed = readFileSync(resolve(root, 'supabase/seed/0007_badges.sql'), 'utf8');
  const migration = readFileSync(
    resolve(root, 'supabase/migrations/20261031000010_badges.sql'),
    'utf8'
  );

  it('offers only criteria that count what the athlete did, never what they ate', () => {
    // A badge for eating well would need a definition of eating well, and the
    // programme has not written one. Adding a nutrition criterion here is
    // where that would start.
    const values = /create type public\.badge_criterion as enum \(([\s\S]*?)\);/.exec(migration)?.[1] ?? '';
    const criteria = [...values.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(criteria).toEqual(['days_logged', 'streak', 'challenges_done']);
  });

  it('seeds no badge against a nutrition figure', () => {
    for (const word of ['carb', 'dq_score', 'protein', 'weight', 'fluid', 'urine']) {
      expect(`${word}: absent`).toBe(
        seed.toLowerCase().includes(word) ? `${word}: PRESENT` : `${word}: absent`
      );
    }
  });

  it('describes every badge, so a locked one is a target rather than a mystery', () => {
    const rows = [...seed.matchAll(/\('([a-z_]+)',\s*'[^']*',\s*'([^']*)'/g)];
    expect(rows.length).toBeGreaterThan(0);
    for (const [, code, description] of rows) {
      expect(`${code}: ${description.length > 0}`).toBe(`${code}: true`);
    }
  });

  it('writes no awards table, because a badge is derived', () => {
    // Derived on read like the streak, so there is no stored award to drift
    // out of step with the logs and no job that has to run at midnight.
    expect(migration).not.toMatch(/create table public\.badge_awards/);
    expect(migration).not.toMatch(/awarded_at/);
  });
});

describe('the demo badges stay in step with the ladder', () => {
  it('carries what award would give Theo’s figures', () => {
    const definitions: Badge[] = DEMO_BADGES.map(({ earned, progress, ...badge }) => badge);
    expect(DEMO_BADGES).toEqual(award(definitions, DEMO_STATS));
  });

  it('agrees with the Learn fixture that no challenge is done', () => {
    // The badge count and the Learn screen are two taps apart. If these
    // disagree the demo contradicts itself in front of whoever is watching.
    expect(DEMO_STATS.challengesDone).toBe(0);
    expect(DEMO_BADGES.find((b) => b.code === 'first_challenge')?.earned).toBe(false);
  });

  it('matches the seeded set, code for code and in order', () => {
    const root = resolve(__dirname, '../../../..');
    const seed = readFileSync(resolve(root, 'supabase/seed/0007_badges.sql'), 'utf8');
    const codes = [...seed.matchAll(/\('([a-z_]+)',\s*'/g)].map((m) => m[1]);
    expect(DEMO_BADGES.map((b) => b.code)).toEqual(codes);
  });
});
