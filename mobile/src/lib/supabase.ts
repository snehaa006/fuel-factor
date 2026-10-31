import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database } from './database.types';

/**
 * The Supabase client, built on first use rather than on import.
 *
 * It used to throw at import time when the environment was missing, which
 * read as a useful early failure and was not one: `supabase.ts` is imported
 * transitively by nearly every module, so a build without the configuration
 * died on launch with "Missing EXPO_PUBLIC_SUPABASE_URL" before a single
 * screen rendered -- **including a demo build, which never calls Supabase at
 * all**. An app that cannot start without a backend it does not use is
 * broken, and it shipped that way in the first APK.
 *
 * Deferring the check moves the failure to the first actual call, where it
 * belongs: a real build still fails loudly with the same message the moment
 * it tries to reach the database, and a demo build never trips it.
 */

let client: SupabaseClient<Database> | null = null;

/** Whether the app has been given somewhere to talk to. */
export function isConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function connect(): SupabaseClient<Database> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
