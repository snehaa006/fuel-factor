import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import type { IsoDate } from './streak';

/**
 * Which week checks an athlete has done, and how they went. On the phone.
 *
 * The check is engagement -- the app's own side -- and it records nothing the
 * programme asked for, so it is not a research table and it is not on the
 * server. That is also its limit: a coach cannot see it, and a new phone
 * starts with none done. If Sofia wants the answers as data (she suggested
 * the WEEKLY LOG tab's questions for "capturing if the athlete has really
 * understood"), that is a table with the tracker's columns, not this.
 *
 * Keyed by athlete, so two athletes on one shared phone do not share results.
 */

export type CheckResult = { right: number; total: number; on: IsoDate };

const PREFIX = 'fuel-factor.week-check';
const key = (participant: string) => `${PREFIX}.${participant}`;

type Results = Record<number, CheckResult>;

const cache = new Map<string, Results>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const EMPTY: Results = {};

function emit() {
  for (const listener of listeners) listener();
}

/** Read an athlete's results from the phone, once. */
export function loadChecks(participant: string): Promise<void> {
  if (cache.has(participant)) return Promise.resolve();
  const pending = loading.get(participant);
  if (pending) return pending;

  const load = AsyncStorage.getItem(key(participant))
    .then((raw) => {
      let parsed: Results = {};
      try {
        const value: unknown = raw === null ? {} : JSON.parse(raw);
        if (value !== null && typeof value === 'object') parsed = value as Results;
      } catch {
        // A damaged entry is the same as none.
      }
      cache.set(participant, parsed);
    })
    .catch(() => {
      cache.set(participant, {});
    })
    .finally(() => {
      loading.delete(participant);
      emit();
    });

  loading.set(participant, load);
  return load;
}

export function checksFor(participant: string): Results {
  return cache.get(participant) ?? EMPTY;
}

/** Record a finished check. A retake replaces the earlier result. */
export function saveCheck(participant: string, week: number, result: CheckResult): void {
  const next = { ...checksFor(participant), [week]: result };
  cache.set(participant, next);
  emit();
  AsyncStorage.setItem(key(participant), JSON.stringify(next)).catch(() => {
    // The result is on screen already; storage is how it survives a reload.
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The athlete's results, loading them on first use and re-rendering on a save. */
export function useWeekChecks(participant: string | null): Results {
  const id = participant ?? 'nobody';
  useEffect(() => {
    loadChecks(id).catch(() => {});
  }, [id]);
  const read = () => checksFor(id);
  return useSyncExternalStore(subscribe, read, read);
}

/** Tests only: forget everything held in memory. */
export function resetChecksForTests(): void {
  cache.clear();
  loading.clear();
  emit();
}
