import { useEffect, useState } from 'react';

import { DEMO_FOODS } from './__fixtures__/today';
import { messageOf } from './errors';
import { listFoods, type FoodWithPortions } from './food';
import { supabase } from './supabase';

const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

export type FoodsState =
  | { status: 'loading' }
  | { status: 'ready'; foods: FoodWithPortions[] }
  | { status: 'error'; message: string };

/** The food database, for the logger's picker. */
export function useFoods(): FoodsState {
  const [state, setState] = useState<FoodsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function load() {
      if (USE_FIXTURE) {
        if (active) setState({ status: 'ready', foods: DEMO_FOODS });
        return;
      }
      try {
        const foods = await listFoods();
        if (active) setState({ status: 'ready', foods });
      } catch (e) {
        if (active) setState({ status: 'error', message: messageOf(e) });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/**
 * The athlete this device holds.
 *
 * Null while it is being read, and null in fixture mode, where there is no
 * database to write to — which is what disables the logger's save button
 * rather than letting it fail against nothing.
 */
export function useParticipantId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    supabase
      .from('participants')
      .select('id')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setId(data?.id ?? null);
      });

    return () => {
      active = false;
    };
  }, []);

  return id;
}
