import { addLogItem, ensureDailyLog, removeLogItem } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const from = supabase.from as unknown as jest.Mock;

/** A chainable postgrest stub whose terminal call resolves to `result`. */
function table(result: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'not', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single = jest.fn().mockResolvedValue(result);
  // `update(...).eq(...)` and `delete().eq(...)` are awaited directly rather
  // than ending in .single(), so the chain itself has to be thenable.
  const thenable = chain as unknown as { then: PromiseLike<unknown>['then'] };
  thenable.then = (onfulfilled) => Promise.resolve(result).then(onfulfilled);
  return chain;
}

// mockReset, not clearAllMocks: clearing only wipes call history, so an
// unconsumed mockReturnValueOnce from a test that threw early would be handed
// to the next test's first query.
beforeEach(() => from.mockReset());

describe('ensureDailyLog', () => {
  it('reuses today’s row when there is one', async () => {
    const logs = table({ data: { id: 'log-1' }, error: null });
    from.mockReturnValue(logs);
    expect(await ensureDailyLog('p1', '2026-10-31')).toBe('log-1');
    expect(logs.insert).not.toHaveBeenCalled();
  });

  it('creates one on the first thing logged today', async () => {
    const existing = table({ data: null, error: null });
    const created = table({ data: { id: 'log-2' }, error: null });
    from.mockReturnValueOnce(existing).mockReturnValueOnce(created);

    expect(await ensureDailyLog('p1', '2026-10-31')).toBe('log-2');
    expect(created.insert).toHaveBeenCalledWith({ participant_id: 'p1', log_date: '2026-10-31' });
  });

  it('throws something readable when the read fails', async () => {
    from.mockReturnValue(table({ data: null, error: { message: 'JWT expired' } }));
    await expect(ensureDailyLog('p1', '2026-10-31')).rejects.toThrow('JWT expired');
  });
});

describe('addLogItem', () => {
  it('writes the item and ticks the slot, because the export reads the tick', async () => {
    const items = table({ error: null });
    const logs = table({ error: null });
    from.mockReturnValueOnce(items).mockReturnValueOnce(logs);

    await addLogItem('log-1', 'breakfast', 'portion-1', 2);

    expect(items.insert).toHaveBeenCalledWith({
      daily_log_id: 'log-1',
      slot: 'breakfast',
      food_portion_id: 'portion-1',
      quantity: 2,
    });
    expect(logs.update).toHaveBeenCalledWith({ breakfast: true });
  });

  it('ticks the slot it was given, not a fixed one', async () => {
    const logs = table({ error: null });
    from.mockReturnValueOnce(table({ error: null })).mockReturnValueOnce(logs);
    await addLogItem('log-1', 'evening_snack', 'portion-1', 1);
    expect(logs.update).toHaveBeenCalledWith({ evening_snack: true });
  });

  it('does not tick when the item could not be written', async () => {
    const items = table({ error: { message: 'new row violates row-level security policy' } });
    const logs = table({ error: null });
    from.mockReturnValueOnce(items).mockReturnValueOnce(logs);

    await expect(addLogItem('log-1', 'lunch', 'portion-1', 1)).rejects.toThrow(/row-level security/);
    expect(logs.update).not.toHaveBeenCalled();
  });
});

describe('removeLogItem', () => {
  it('unticks the slot once its last item is gone', async () => {
    const del = table({ error: null });
    const count = table({ count: 0, error: null });
    const logs = table({ error: null });
    from.mockReturnValueOnce(del).mockReturnValueOnce(count).mockReturnValueOnce(logs);

    await removeLogItem('item-1', 'log-1', 'dinner');
    expect(logs.update).toHaveBeenCalledWith({ dinner: false });
  });

  it('leaves the tick alone while other items remain in the slot', async () => {
    const del = table({ error: null });
    const count = table({ count: 2, error: null });
    const logs = table({ error: null });
    from.mockReturnValueOnce(del).mockReturnValueOnce(count).mockReturnValueOnce(logs);

    await removeLogItem('item-1', 'log-1', 'dinner');
    expect(logs.update).not.toHaveBeenCalled();
  });
});
