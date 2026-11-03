import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { DEFAULT_SUPABASE_PUBLISHABLE_KEY, DEFAULT_SUPABASE_URL } from './supabase-config';
import type { Database } from './database.types';

/**
 * The Supabase client, built on first use rather than on import.
 *
 * It used to throw at import time when the environment was missing, which
 * read as a useful early failure and was not one: `supabase.ts` is imported
 * transitively by nearly every module, so a build without the configuration
 * died on launch with "Missing EXPO_PUBLIC_SUPABASE_URL" before a single
 * screen rendered.
 *
 * Deferring the check moves the failure to the first actual call, where it
 * belongs: a build without the configuration still fails loudly with the same
 * message the moment it tries to reach the database.
 */

let client: SupabaseClient<Database> | null = null;

/**
 * The environment first, the committed default second.
 *
 * `EXPO_PUBLIC_*` wins wherever it is set, so a `.env` still points a dev
 * build at a local Supabase. When nothing sets it the app falls back to
 * `supabase-config.ts` rather than to an error, which is the whole point of
 * that file: a bundle published without the environment exported used to
 * open on "Missing EXPO_PUBLIC_SUPABASE_URL" at the team-code gate.
 */
function configuredUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

function configuredKey(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

/** Whether the app has been given somewhere to talk to. */
export function isConfigured(): boolean {
  return Boolean(configuredUrl() && configuredKey());
}

function connect(): SupabaseClient<Database> {
  const url = configuredUrl();
  const key = configuredKey();

  if (!url || !key) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      // AsyncStorage rather than SecureStore: SecureStore caps values at 2 KB on
      // Android and a Supabase session can exceed that.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // There is no URL to parse a session out of outside the browser.
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

/**
 * Every call site still writes `supabase.from(...)`, so nothing else changed.
 * Methods are bound to the real client, because a Supabase method called with
 * the proxy as its `this` does not work.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property) {
    client ??= connect();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
