import { StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

export type StreakChipProps = {
  days: number;
  /** Whether today is already on the board. An unlit flame is not a lost streak. */
  lit: boolean;
  testID?: string;
};

/**
 * The streak, counted from days the athlete logged something.
 *
 * Engagement, not nutrition: it never reads what was eaten, so it cannot be
 * broken by a bad day, only by a silent one.
 */
export function StreakChip({ days, lit, testID }: StreakChipProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={
        days === 0
          ? t.streak.none
          : t.streak.label(days, lit)
      }
      style={[
        styles.chip,
        {
          backgroundColor: lit ? colors['pisang-tint'] : colors['surface-sunken'],
          borderRadius: radius['radius-pill'],
          paddingHorizontal: spacing['space-3'],
          paddingVertical: spacing['space-2'],
          gap: spacing['space-2'],
        },
      ]}
    >
      <Text style={[typography['display-m'], { color: lit ? colors['pisang-deep'] : colors['ink-faint'] }]}>
        {days}
      </Text>
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.streak.dayStreak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
