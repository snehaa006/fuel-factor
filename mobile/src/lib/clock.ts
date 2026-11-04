import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * The time machine: a date the whole app treats as today, for testing.
 *
 * Every screen asks `todayIso()` what day it is, and `todayIso()` asks here
 * first. Setting a date makes the logger write to that day, Today draw that
 * day, the streak count back from it, the programme gate open or shut on it
 * and the leaderboard rank the seven days before it -- so a month of logging
 * can be tested in one sitting by stepping the date forward, rather than by
 * waiting a month.
 *
 * Only the **date** is simulated. The time of day stays real, because the two
 * timing rules measure a training session the athlete typed against the
 * clock, and a fake clock would make them fire on nothing.
 *
 * It is in every build -- there is one app, and testing it means testing the
 * same thing everybody runs. Rows logged on a simulated day are real rows in
 * the live database, so test with a test athlete.
 *
 * This module imports nothing from Supabase, deliberately: `today.ts` reads it
 * at runtime, and a runtime import that pulls in the client is how Today once
 * rendered blank while every test passed (see SESSION-HANDOFF).
 */

const STORAGE_KEY = 'fuel-factor.simulated-date';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

let simulated: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** A real calendar date in YYYY-MM-DD, and nothing else. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** The date the app is pretending is today, or null when it is the real one. */
export function simulatedDate(): string | null {
  return simulated;
}

/**
 * Travel to a date, or pass null to come back to the real today.
 *
 * Remembered across reloads, because testing a month means closing the app
 * between days and it should reopen on the day being tested.
 */
export function setSimulatedDate(date: string | null): void {
  if (date !== null && !isIsoDate(date)) throw new Error(`Not a date: ${date}`);
  if (date === simulated) return;

  simulated = date;
  emit();

  const write =
    date === null ? AsyncStorage.removeItem(STORAGE_KEY) : AsyncStorage.setItem(STORAGE_KEY, date);
  write.catch(() => {
    // Storage is a convenience here: the jump has already happened in memory.
  });
}

/** Read the remembered date back. Resolves once, before the first screen draws. */
export async function restoreSimulatedDate(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== null && isIsoDate(stored) && stored !== simulated) {
      simulated = stored;
      emit();
    }
  } catch {
    // Nothing remembered, or no storage: the real today it is.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The simulated date, re-rendering whoever asks when it moves. */
export function useSimulatedDate(): string | null {
  return useSyncExternalStore(subscribe, simulatedDate, simulatedDate);
}

/** `date` moved by `days`, as YYYY-MM-DD. */
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
