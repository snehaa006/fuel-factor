import { supabase } from './supabase';
import type { IsoDate } from './streak';

/**
 * Day one of the signed-in account's team: an athlete's own, or the team a
 * coach coaches. Row level security decides which team row comes back.
 *
 * Null when there is none or it cannot be read -- callers then treat today as
 * today, which is what they did before the programme had an end.
 */
export async function fetchProgrammeStart(): Promise<IsoDate | null> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('programme_starts_on')
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data?.programme_starts_on ?? null;
  } catch {
    return null;
  }
}
