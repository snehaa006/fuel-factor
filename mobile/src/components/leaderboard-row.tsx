import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { RankedRow } from '@/lib/team';

export type LeaderboardRowProps = {
  row: RankedRow;
  /** The window the count is out of, so the row reads "5 of 7 days". */
  windowDays: number;
  testID?: string;
};

/**
 * One athlete's standing.
 *
 * Position, first name, days logged, and whether they have logged today. That
 * is the whole row, and the shortness of it is the point: nothing here is a
 * measurement of a child's body, and there is no column a body metric could
 * later be slipped into without someone noticing.
 *
 * The athlete's own row is marked by a raised fill and a "YOU" tag rather than
 * by an outline, for the reason the week strip learnt: a border has to contrast
 * with whatever is inside it and the fill changes with the theme.
 */
export function LeaderboardRow({ row, windowDays, testID }: LeaderboardRowProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const days = `${row.daysLogged} of ${windowDays} days`;

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={[
        `${row.position}.`,
        row.isMe ? `${row.name}, you` : row.name,
        days,
        row.loggedToday ? 'logged today' : 'not logged today',
      ].join(' ')}
      style={[
        styles.row,
        {
          backgroundColor: row.isMe ? colors['pisang-tint'] : colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        },
      ]}
    >
      <Text
        testID={testID ? `${testID}-position` : undefined}
        style={[typography['heading-m'], styles.position, { color: colors['ink-muted'] }]}
      >
        {row.position}
      </Text>

      <View style={styles.who}>
        <View style={[styles.nameLine, { gap: spacing['space-2'] }]}>
          <Text style={[typography['heading-m'], { color: colors.ink }]}>{row.name}</Text>
          {row.isMe && (
            <Text testID={testID ? `${testID}-you` : undefined} style={[typography.label, { color: colors['pisang-deep'] }]}>
              YOU
            </Text>
          )}
        </View>
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{days}</Text>
      </View>

      {/* Lit means logged today. It is the one live thing on the row, and the
          nudge-your-mate mechanic runs on it. */}
      <View
        testID={testID ? `${testID}-today` : undefined}
        style={[
          styles.dot,
          {
            borderRadius: radius['radius-pill'],
            backgroundColor: row.loggedToday ? colors.pisang : colors['surface-sunken'],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  position: { minWidth: 24, textAlign: 'center' },
  who: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'baseline' },
  dot: { width: 14, height: 14 },
});
