import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.'
  );
}

export const supabase = createClient<Database>(url, key, {
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
