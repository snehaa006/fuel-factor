import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

/**
 * The two things a person can set about the app itself: how it looks and
 * which language it speaks.
 *
 * Both were asked for on the 25 November call. Theo: "could you possibly add
 * like a light or dark mode ... depending on their preferences, because I
 * think that makes like the mood different for each person", and later, "is
 * there like a feature that makes you be able to change the language when
 * you're logging in or signing up?" -- the squad is Indonesian.
 *
 * They are device settings, not account settings. Both have to work on the
 * sign-in screen, before there is an account to read them from, and a phone
 * shared by two brothers is still one phone with one owner's taste. Nothing
 * here touches Supabase, for the same reason `clock.ts` does not: this module
 * is read while the root layout decides whether to draw at all.
 *
 * Built the way `clock.ts` is -- module state, a listener set,
 * `useSyncExternalStore`, and AsyncStorage as a convenience behind it -- and
 * read back before the first screen draws, so the app never opens in the
 * wrong colours or the wrong language and then flips.
 *
 * **No native module.** `expo-localization` would read the phone's language
 * more directly, and the brief's stack table names it. It is a native module,
 * and the phones get this app as an over-the-air update to an APK that was
 * built without it: the runtime version follows the SDK, so the update would
 * be delivered and then crash on a module that is not there. `Intl` answers
 * the same question in Hermes and in a browser with nothing to install.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type Language = 'en' | 'id';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];
export const LANGUAGES: readonly Language[] = ['en', 'id'];

const THEME_KEY = 'fuel-factor.theme';
const LANGUAGE_KEY = 'fuel-factor.language';

/**
 * The phone's own language, as far as the app speaks it.
 *
 * Indonesian when the phone is set to it and English otherwise, because those
 * are the two the app has. `in` is the code Android used for Indonesian before
 * it adopted `id`, and older phones still report it.
 */
export function deviceLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return /^(id|in)(?:[-_]|$)/i.test(locale) ? 'id' : 'en';
  } catch {
    return 'en';
  }
}

type Store<T extends string> = {
  get: () => T;
  set: (next: T) => void;
  restore: () => Promise<void>;
  reset: (to: T) => void;
  subscribe: (listener: () => void) => () => void;
};

function persisted<T extends string>(
  key: string,
  valid: readonly T[],
  initial: () => T,
  onChange: (value: T) => void = () => {}
): Store<T> {
  let value: T = initial();
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: () => value,
    set(next) {
      if (!valid.includes(next)) throw new Error(`Not a choice here: ${next}`);
      if (next === value) return;
      value = next;
      onChange(next);
      emit();
      AsyncStorage.setItem(key, next).catch(() => {
        // Storage is a convenience: the switch has already happened in memory.
      });
    },
    async restore() {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored !== null && (valid as readonly string[]).includes(stored) && stored !== value) {
          value = stored as T;
          onChange(value);
          emit();
        }
      } catch {
        // Nothing remembered, or no storage: the default stands.
      }
    },
    reset(to) {
      value = to;
      onChange(to);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Tell the operating system too, so what it draws for the app -- the
 * keyboard, a system alert, the date picker -- matches the app's choice
 * rather than the phone's. Not available in a browser, where the page's own
 * colours are all there is.
 */
function applyNativeScheme(preference: ThemePreference) {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  } catch {
    // An override the platform cannot take changes nothing the app draws.
  }
}

const theme = persisted<ThemePreference>(THEME_KEY, THEME_PREFERENCES, () => 'system', applyNativeScheme);
const language = persisted<Language>(LANGUAGE_KEY, LANGUAGES, deviceLanguage);

/** Follow the phone, or always light, or always dark. */
export function themePreference(): ThemePreference {
  return theme.get();
}

export function setThemePreference(next: ThemePreference): void {
  theme.set(next);
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(theme.subscribe, theme.get, theme.get);
}

/** The language the app is speaking. */
export function currentLanguage(): Language {
  return language.get();
}

export function setLanguage(next: Language): void {
  language.set(next);
}

export function useLanguage(): Language {
  return useSyncExternalStore(language.subscribe, language.get, language.get);
}

/** Read both back. Resolves once, before the first screen draws. */
export async function restorePreferences(): Promise<void> {
  await Promise.all([theme.restore(), language.restore()]);
}

/**
 * Back to a known state, in memory only. The tests assert English copy, and a
 * machine whose own locale is Indonesian would otherwise run them in Bahasa.
 */
export function resetPreferencesForTests(): void {
  theme.reset('system');
  language.reset('en');
}
