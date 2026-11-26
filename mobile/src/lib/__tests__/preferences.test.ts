import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import {
  currentLanguage,
  deviceLanguage,
  resetPreferencesForTests,
  restorePreferences,
  setLanguage,
  setThemePreference,
  themePreference,
} from '@/lib/preferences';
import { resolveThemeName } from '@/theme';

beforeEach(async () => {
  await AsyncStorage.clear();
  resetPreferencesForTests();
  jest.restoreAllMocks();
});

/** Let the fire-and-forget storage write land. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function phoneLocale(locale: string) {
  jest
    .spyOn(Intl, 'DateTimeFormat')
    .mockImplementation(
      () => ({ resolvedOptions: () => ({ locale }) }) as unknown as Intl.DateTimeFormat
    );
}

describe('the phone’s own language', () => {
  it('is Indonesian on a phone set to Indonesian', () => {
    phoneLocale('id-ID');
    expect(deviceLanguage()).toBe('id');
  });

  it('reads the code older Android phones still report', () => {
    // Java called Indonesian `in` before it adopted `id`.
    phoneLocale('in_ID');
    expect(deviceLanguage()).toBe('id');
  });

  it('is English on anything else the app does not speak', () => {
    for (const locale of ['en-US', 'en-IN', 'ms-MY', 'jv-ID', 'ind']) {
      phoneLocale(locale);
      expect(deviceLanguage()).toBe('en');
    }
  });

  it('falls back to English when the phone cannot say', () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no Intl');
    });
    expect(deviceLanguage()).toBe('en');
  });
});

describe('remembering the choice', () => {
  it('keeps the language across a reload', async () => {
    setLanguage('id');
    await flush();
    expect(await AsyncStorage.getItem('fuel-factor.language')).toBe('id');

    // A reload: memory is gone, storage is not.
    resetPreferencesForTests();
    expect(currentLanguage()).toBe('en');
    await restorePreferences();
    expect(currentLanguage()).toBe('id');
  });

  it('keeps the theme across a reload', async () => {
    setThemePreference('dark');
    await flush();
    resetPreferencesForTests();
    await restorePreferences();
    expect(themePreference()).toBe('dark');
  });

  it('ignores a stored value it does not recognise', async () => {
    await AsyncStorage.setItem('fuel-factor.language', 'fr');
    await AsyncStorage.setItem('fuel-factor.theme', 'sepia');
    await restorePreferences();
    expect(currentLanguage()).toBe('en');
    expect(themePreference()).toBe('system');
  });

  it('refuses a choice that is not on offer', () => {
    // @ts-expect-error -- the point is a value the type does not allow
    expect(() => setThemePreference('sepia')).toThrow();
    // @ts-expect-error -- likewise
    expect(() => setLanguage('fr')).toThrow();
  });

  it('starts on System, not on a forced theme', () => {
    expect(themePreference()).toBe('system');
  });
});

describe('which palette a choice comes to', () => {
  it('follows the phone on System', () => {
    expect(resolveThemeName('system', 'dark')).toBe('dark');
    expect(resolveThemeName('system', 'light')).toBe('light');
    // A browser or platform that cannot say is light, as before.
    expect(resolveThemeName('system', null)).toBe('light');
    expect(resolveThemeName('system', undefined)).toBe('light');
  });

  it('overrides the phone either way when chosen', () => {
    expect(resolveThemeName('light', 'dark')).toBe('light');
    expect(resolveThemeName('dark', 'light')).toBe('dark');
  });
});

describe('telling the operating system', () => {
  it('passes the choice on, and hands back to the phone on System', () => {
    const set = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    setThemePreference('dark');
    expect(set).toHaveBeenLastCalledWith('dark');
    setThemePreference('system');
    expect(set).toHaveBeenLastCalledWith('unspecified');
  });
});
