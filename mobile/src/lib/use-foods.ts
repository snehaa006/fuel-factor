import { useEffect, useState } from 'react';

import { messageOf } from './errors';
import { searchFoodDatabase, type FoodWithPortions } from './food';
import { supabase } from './supabase';

export type FoodsState =
  | { status: 'loading' }
  | { status: 'ready'; foods: FoodWithPortions[] }
  | { status: 'error'; message: string };

/** How long typing pauses before the server is asked. */
export const SEARCH_DEBOUNCE_MS = 250;

/**
 * The food database, for the pickers.
 *
 * With nothing typed it is the programme's short list. With a query it is a
 * server-side search of the whole composition table, asked once typing
 * pauses.
 */
export function useFoods(query = ''): FoodsState {
  const [state, setState] = useState<FoodsState>({ status: 'loading' });
  const term = query.trim();

  useEffect(() => {
    let active = true;

    const timer = setTimeout(
      () => {
        searchFoodDatabase(term)
          .then((foods) => active && setState({ status: 'ready', foods }))
          .catch((e) => active && setState({ status: 'error', message: messageOf(e) }));
      },
      term === '' ? 0 : SEARCH_DEBOUNCE_MS
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term]);

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
