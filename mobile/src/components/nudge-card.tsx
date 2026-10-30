import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { Nudge } from '@/lib/advice';

export type NudgeCardProps = {
  nudge: Nudge;
  testID?: string;
};

const DOMAIN_LABEL: Record<string, string> = {
  carbohydrate: 'CARBOHYDRATE',
  hydration: 'HYDRATION',
  timing: 'TIMING',
};

/**
 * One advice card, carrying a sentence the programme wrote.
 *
 * The app never composes advice copy, so this renders the rule's message
 * verbatim. A rule the dietitian has not yet signed off is marked as such,
 * which keeps an unreviewed sentence from passing as clinical guidance in a
 * demo.
 */
export function NudgeCard({ nudge, testID }: NudgeCardProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      style={[
        styles.card,
        {
          backgroundColor: colors['pisang-tint'],
          borderRadius: radius['radius-xl'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors['pisang-deep'] }]}>
        {DOMAIN_LABEL[nudge.domain] ?? nudge.domain.toUpperCase()}
      </Text>
      <Text testID={testID ? `${testID}-message` : undefined} style={[typography['body-l'], { color: colors.ink }]}>
        {nudge.message}
      </Text>
      {!nudge.reviewed && (
        <Text
          testID={testID ? `${testID}-unreviewed` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'] }]}
        >
          Week 1 material · awaiting dietitian review
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
});
