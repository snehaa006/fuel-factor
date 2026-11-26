import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import {
  setLanguage,
  setThemePreference,
  useLanguage,
  useThemePreference,
  type Language,
  type ThemePreference,
} from '@/lib/preferences';
import { useTheme } from '@/theme';

/**
 * The language and theme switches.
 *
 * Drawn like the day-type switch -- a sunken track, the choice filled in
 * pisang -- so they read as the same kind of control. Three places use them:
 * the foot of the menu, which every athlete and coach screen has; the profile;
 * and, language only, the sign-in and sign-up screens, which is where Theo
 * asked for it -- before there is an account, a squad member who reads
 * Indonesian more easily than English is choosing it on the first screen.
 *
 * The language names are each written in their own language and never
 * translated, so somebody who cannot read the current one can still find
 * theirs.
 */

type Option<T extends string> = { value: T; label: string; accessibilityLabel: string };

function Choice<T extends string>({
  options,
  value,
  onChange,
  compact,
  label,
  testID,
}: {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  compact: boolean;
  label: string;
  testID: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[
        styles.track,
        compact ? styles.trackCompact : styles.trackFull,
        { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-pill'] },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel}
            testID={`${testID}-${option.value}`}
            hitSlop={compact ? 6 : 0}
            style={[
              styles.option,
              !compact && styles.optionFull,
              {
                backgroundColor: selected ? colors.pisang : 'transparent',
                borderRadius: radius['radius-pill'],
                paddingVertical: compact ? spacing['space-1'] : spacing['space-2'],
                paddingHorizontal: spacing['space-3'],
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[typography.label, { color: selected ? colors['on-bright'] : colors['ink-muted'] }]}
            >
              {option.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** English or Bahasa Indonesia. `compact` is the two-letter pill for the sign-in screens. */
export function LanguageSwitch({
  compact = false,
  testID = 'language-switch',
}: {
  compact?: boolean;
  testID?: string;
}) {
  const language = useLanguage();
  const t = useStrings();

  const options: Option<Language>[] = [
    { value: 'en', label: compact ? 'EN' : 'English', accessibilityLabel: 'English' },
    { value: 'id', label: compact ? 'ID' : 'Indonesia', accessibilityLabel: 'Bahasa Indonesia' },
  ];

  return (
    <Choice
      options={options}
      value={language}
      onChange={setLanguage}
      compact={compact}
      label={t.preferences.languageLabel}
      testID={testID}
    />
  );
}

/** Follow the phone, or always light, or always dark. */
export function ThemeSwitch({
  compact = false,
  testID = 'theme-switch',
}: {
  compact?: boolean;
  testID?: string;
}) {
  const preference = useThemePreference();
  const t = useStrings();
  const p = t.preferences;

  const options: Option<ThemePreference>[] = [
    {
      value: 'system',
      label: compact ? p.systemShort : p.system,
      accessibilityLabel: p.themeLabel(p.system),
    },
    { value: 'light', label: p.light, accessibilityLabel: p.themeLabel(p.light) },
    { value: 'dark', label: p.dark, accessibilityLabel: p.themeLabel(p.dark) },
  ];

  return (
    <Choice
      options={options}
      value={preference}
      onChange={setThemePreference}
      compact={compact}
      label={p.theme}
      testID={testID}
    />
  );
}

/** Both, each under its label: the menu's foot and the profile's settings card. */
export function PreferenceSwitches({ testID = 'preferences' }: { testID?: string }) {
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();

  return (
    <View testID={testID} style={{ gap: spacing['space-3'] }}>
      <View style={{ gap: spacing['space-2'] }}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.preferences.language}</Text>
        <LanguageSwitch testID={`${testID}-language`} />
      </View>
      <View style={{ gap: spacing['space-2'] }}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.preferences.theme}</Text>
        <ThemeSwitch testID={`${testID}-theme`} />
        <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
          {t.preferences.themeHint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 4 },
  trackCompact: { alignSelf: 'flex-end' },
  trackFull: { alignSelf: 'stretch' },
  option: { alignItems: 'center', justifyContent: 'center' },
  optionFull: { flex: 1 },
});
