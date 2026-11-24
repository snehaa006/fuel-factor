import { fetchGaps } from '@/lib/gaps';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as unknown as jest.Mock;

/**
 * A stand-in for the three reads `fetchGaps` makes, recording how the
 * participant was picked: by the session (`limit`) or by id (`eq`).
 */
function database(participant: { id: string; name: string; weight_kg: number | null } | null) {
  const picked: { by: 'session' | 'id'; id?: string }[] = [];

  mockFrom.mockImplementation((table: string) => {
    if (table === 'participants') {
      const single = { maybeSingle: async () => ({ data: participant, error: null }) };
      return {
        select: () => ({
          limit: () => {
            picked.push({ by: 'session' });
            return single;
          },
          eq: (_column: string, id: string) => {
            picked.push({ by: 'id', id });
            return single;
          },
        }),
      };
    }
    if (table === 'daily_logs') {
      const chain = {
        eq: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        returns: async () => ({
          data: [{ id: 'log-1', log_date: '2026-11-10', day_type: 'training' }],
          error: null,
        }),
      };
      return { select: () => chain };
    }
    // log_items
    return {
      select: () => ({
        in: () => ({
          returns: async () => ({
            data: [
              { daily_log_id: 'log-1', quantity: 2, food_portions: { carbs_g: 50, protein_g: 10 } },
            ],
            error: null,
          }),
        }),
      }),
    };
  });

  return picked;
}

beforeEach(() => jest.clearAllMocks());

describe('fetchGaps', () => {
  it('reads the signed-in athlete’s own row when no athlete is named', async () => {
    const picked = database({ id: 'p-1', name: 'Budi', weight_kg: 60 });
    const analysis = await fetchGaps('2026-11-01', '2026-11-14');
    expect(picked).toEqual([{ by: 'session' }]);
    expect(analysis?.athleteName).toBe('Budi');
    expect(analysis?.days).toHaveLength(1);
    expect(analysis?.days[0].carbs).toBe(100);
    expect(analysis?.days[0].protein).toBe(20);
  });

  it('reads the named athlete for a coach, and no other row', async () => {
    const picked = database({ id: 'p-2', name: 'Arya', weight_kg: 64 });
    const analysis = await fetchGaps('2026-11-01', '2026-11-14', 'p-2');
    expect(picked).toEqual([{ by: 'id', id: 'p-2' }]);
    expect(analysis?.athleteName).toBe('Arya');
    expect(analysis?.weightKg).toBe(64);
  });

  it('is null for an athlete the database will not show this account', async () => {
    // Row level security answers "not your squad" with no row at all.
    database(null);
    expect(await fetchGaps('2026-11-01', '2026-11-14', 'someone-else')).toBeNull();
  });
});
