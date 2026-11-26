import { useColorScheme } from 'react-native';

import { useThemePreference, type ThemePreference } from '@/lib/preferences';

import { palette, radius, spacing, typography } from './tokens';
import type { ThemeName } from './tokens';

export type Theme = {
  name: ThemeName;
  colors: (typeof palette)[ThemeName];
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export function getTheme(name: ThemeName): Theme {
  return { name, colors: palette[name], spacing, radius, typography };
}

/** Which palette a preference comes to, given what the phone is set to. */
export function resolveThemeName(
  preference: ThemePreference,
  device: string | null | undefined
): ThemeName {
  if (preference !== 'system') return preference;
  return device === 'dark' ? 'dark' : 'light';
}

/**
 * The active theme: the person's own choice where they made one, and the
 * device's light/dark setting where they left it on System.
 */
export function useTheme(): Theme {
  const device = useColorScheme();
  const preference = useThemePreference();
  return getTheme(resolveThemeName(preference, device));
}

export { palette, radius, spacing, typography };
export type { ColorToken, RadiusToken, SpacingToken, ThemeName, TypeToken } from './tokens';
export { EDGE_HEIGHT, motion } from './motion';
