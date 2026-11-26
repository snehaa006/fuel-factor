import { StyleSheet, Text, View } from 'react-native';

import { useStrings, type Strings } from '@/i18n';
import { en } from '@/i18n/en';
import { useLanguage } from '@/lib/preferences';
import { useTheme, type ColorToken } from '@/theme';
import type { Nudge } from '@/lib/advice';

export type NudgeCardProps = {
  nudge: Nudge;
  testID?: string;
};

/**
 * A tint per domain, so a stack of two cards reads as two things.
 *
 * Categorical and not ordinal: it says which pillar the card is about, never
 * how bad it is. Severity is the rule row's own and is carried by the order
 * the cards appear in, not by colour.
 */
const DOMAIN_TINT: Record<string, { fill: ColorToken; label: ColorToken }> = {
  carbohydrate: { fill: 'pisang-tint', label: 'pisang-deep' },
  hydration: { fill: 'air-tint', label: 'air-deep' },
  timing: { fill: 'daun-tint', label: 'daun-deep' },
  protein: { fill: 'kecap-tint', label: 'kecap-deep' },
};

/** "Week 2 material" from 'week-2-deck'; plain "Programme material" otherwise. */
export function materialLabel(source: string | undefined, t: Strings = en): string {
  const week = source ? /^week-(\d)-deck$/.exec(source)?.[1] : undefined;
  return week ? t.nudge.weekMaterial(week) : t.nudge.programmeMaterial;
}

/**
 * The sentence to show: the programme's Bahasa wording where the rule row
 * carries one (`message_id`), and its English otherwise.
 *
 * The app does not translate advice itself. Every sentence here was written by
 * the programme and is waiting on the dietitian's review in English already; a
 * translation the app made up would be a second unreviewed sentence, in the
 * language the reviewer reads less easily.
 */
export function nudgeText(nudge: Nudge, language: 'en' | 'id'): string {
  return language === 'id' && nudge.messageId ? nudge.messageId : nudge.message;
}

/**
 * One advice card, carrying a sentence the programme wrote.
 *
 * The app never composes advice copy, so this renders the rule's message
 * verbatim. A rule the dietitian has not yet signed off is marked as such,
 * which keeps an unreviewed sentence from passing as clinical guidance.
 */
export function NudgeCard({ nudge, testID }: NudgeCardProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const language = useLanguage();
  const tint = DOMAIN_TINT[nudge.domain] ?? DOMAIN_TINT.carbohydrate;

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      style={[
        styles.card,
        {
          backgroundColor: colors[tint.fill],
          borderRadius: radius['radius-xl'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors[tint.label] }]}>
        {t.nudge.domains[nudge.domain] ?? nudge.domain.toUpperCase()}
      </Text>
      <Text testID={testID ? `${testID}-message` : undefined} style={[typography['body-l'], { color: colors.ink }]}>
        {nudgeText(nudge, language)}
      </Text>
      {!nudge.reviewed && (
        <Text
          testID={testID ? `${testID}-unreviewed` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'] }]}
        >
          {t.nudge.awaitingReview}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
});
