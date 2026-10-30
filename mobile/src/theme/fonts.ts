import {
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
} from '@expo-google-fonts/josefin-sans';

/**
 * Every font face the app uses. The keys are the family names that
 * src/theme/tokens.ts refers to, so a missing entry is a render-time fallback,
 * not a type error — keep this in step with FONT_FILES in scripts/generate-theme.mjs.
 */
export const fontAssets = {
  PiePie: require('../../assets/fonts/Piepie-W01-Regular.ttf'),
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
} as const;

export const FONT_FAMILIES = Object.keys(fontAssets);
