import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { asError, messageOf } from './errors';
import { supabase } from './supabase';
import type { ProgrammeState } from './programme';
import type { Tables, TablesInsert } from './database.types';
import { dayOfWeek, weekOfProgramme } from './weekly';

/**
 * The end-of-programme reflection.
 *
 * Sofia, 25 November: "the subjective feedback, like how was the programme? Did
 * you like it? What was your best takeaway? Things like that." Theo: "It's
 * like a reflection ... and feedback." Her three questions, in her order, and
 * a fourth, optional, for the feedback Theo named. One row per athlete in
 * `programme_reflections`; a second visit edits it.
 */

export const LIKED = ['Yes', 'Somewhat', 'No'] as const;

export type ReflectionAnswers = {
  rating: number | null;
  liked: string | null;
  bestTakeaway: string;
  feedback: string;
};

export const EMPTY_REFLECTION: ReflectionAnswers = {
  rating: null,
  liked: null,
  bestTakeaway: '',
  feedback: '',
};

export type Reflection = Tables<'programme_reflections'>;

/**
 * Whether the reflection is open: from the last programme week's sixth day,
 * when week 4's check-in opens too, and from then on.
 */
export function reflectionOpen(programme: ProgrammeState | null): boolean {
  const week = weekOfProgramme(programme);
  if (week === null) return false;
  if (week > 4) return true;
  return week === 4 && (dayOfWeek(programme) ?? 0) >= 6;
}

export function fromRow(row: Reflection | null): ReflectionAnswers {
  if (!row) return EMPTY_REFLECTION;
  return {
    rating: row.rating,
    liked: row.liked,
    bestTakeaway: row.best_takeaway ?? '',
    feedback: row.feedback ?? '',
  };
}

/** The first three are Sofia's and needed; the feedback is optional. */
export function reflectionReady(a: ReflectionAnswers): boolean {
  return a.rating !== null && a.liked !== null && a.bestTakeaway.trim() !== '';
}

export function toReflectionRow(
  participantId: string,
  a: ReflectionAnswers
): TablesInsert<'programme_reflections'> {
  const feedback = a.feedback.trim();
  return {
    participant_id: participantId,
    rating: a.rating,
    liked: a.liked,
    best_takeaway: a.bestTakeaway.trim(),
    feedback: feedback === '' ? null : feedback,
  };
}

export async function fetchReflection(participantId: string): Promise<Reflection | null> {
  const { data, error } = await supabase
    .from('programme_reflections')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();
  if (error) throw asError(error);
  return data;
}

const listeners = new Set<() => void>();
let version = 0;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const readVersion = () => version;

export async function saveReflection(row: TablesInsert<'programme_reflections'>): Promise<void> {
  const { error } = await supabase
    .from('programme_reflections')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'participant_id' });
  if (error) throw asError(error);
  version += 1;
  for (const l of listeners) l();
}

export type ReflectionState =
  | { status: 'loading' }
  | { status: 'ready'; reflection: Reflection | null }
  | { status: 'error'; message: string };

/** The athlete's reflection, refreshed the moment one is saved. */
export function useReflection(participantId: string | null): ReflectionState & {
  save: (row: TablesInsert<'programme_reflections'>) => Promise<void>;
} {
  const v = useSyncExternalStore(subscribe, readVersion, readVersion);
  const [state, setState] = useState<ReflectionState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    if (participantId === null) return;
    fetchReflection(participantId)
      .then((reflection) => active && setState({ status: 'ready', reflection }))
      .catch((e) => active && setState({ status: 'error', message: messageOf(e) }));
    return () => {
      active = false;
    };
  }, [participantId, v]);

  const save = useCallback((row: TablesInsert<'programme_reflections'>) => saveReflection(row), []);
  const shown: ReflectionState =
    participantId === null ? { status: 'ready', reflection: null } : state;
  return { ...shown, save };
}
