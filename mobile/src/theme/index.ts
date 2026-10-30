import { useColorScheme } from 'react-native';

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

/** The active theme, following the device's light/dark setting. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return getTheme(scheme === 'dark' ? 'dark' : 'light');
}

export { palette, radius, spacing, typography };
export type { ColorToken, RadiusToken, SpacingToken, ThemeName, TypeToken } from './tokens';
export { EDGE_HEIGHT, motion } from './motion';
