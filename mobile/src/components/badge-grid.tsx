import { StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';
import type { EarnedBadge } from '@/lib/badges';

export type BadgeGridProps = {
  badges: EarnedBadge[];
  testID?: string;
};

/**
 * The badge set, earned and not.
 *
 * Locked badges are shown rather than hidden, with the criterion in words and
 * how far along the athlete is: a badge nobody can see is not a target. The
 * ladder stays in its seeded order so the next rung sits under the last one
 * cleared.
 *
 * Earned is carried by the fill and by the description turning into a plain
 * "Earned", never by a border -- the same lesson the week strip taught, since
 * the fill behind it changes with the theme.
 */
export function BadgeGrid({ badges, testID }: BadgeGridProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  // The badges are the app's own words, kept as rows so a new one is an
  // INSERT. The dictionary carries their Bahasa by code; the row is the English
  // and the fallback for a badge the dictionary does not know yet.
  const words = (badge: { code: string; name: string; description: string }) =>
    t.badges.names[badge.code] ?? { name: badge.name, description: badge.description };

  return (
    <View testID={testID} style={[styles.grid, { gap: spacing['space-3'] }]}>
      {badges.map((badge) => (
        <View
          key={badge.code}
          testID={testID ? `${testID}-${badge.code}` : undefined}
          accessibilityRole="text"
          accessibilityLabel={
            badge.earned
              ? t.badges.earnedLabel(words(badge).name)
              : t.badges.notYetLabel(
                  words(badge).name,
                  words(badge).description,
                  badge.progress,
                  badge.threshold
                )
          }
          style={[
            styles.badge,
            {
              backgroundColor: badge.earned ? colors['pisang-tint'] : colors.locked,
              borderRadius: radius['radius-lg'],
              padding: spacing['space-4'],
              gap: 2,
            },
          ]}
        >
          <Text
            style={[
              typography['heading-m'],
              { color: badge.earned ? colors['pisang-deep'] : colors['ink-faint'] },
            ]}
          >
            {words(badge).name}
          </Text>
          <Text
            testID={testID ? `${testID}-${badge.code}-state` : undefined}
            style={[typography['body-s'], { color: colors['ink-muted'] }]}
          >
            {badge.earned
              ? t.badges.earned
              : /* The criterion in words, then the distance to it, so a
                   locked badge reads as something to go and do. */
                t.badges.progress(words(badge).description, badge.progress, badge.threshold)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { flexGrow: 1, flexBasis: '45%' },
});
