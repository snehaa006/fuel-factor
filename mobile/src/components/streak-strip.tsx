import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { StreakDay } from '@/lib/streak';

export type StreakStripProps = {
  days: StreakDay[];
  testID?: string;
};

/**
 * The last seven days as cells, oldest first.
 *
 * Engagement, not nutrition: a cell is lit by the athlete having logged
 * anything at all that day, never by what was in it.
 *
 * Today is marked by a larger dot and a darker initial, not by an outline. An
 * outline has to contrast with whatever is inside it, and the fill changes
 * with both the state and the theme -- a ring that reads in light on an
 * unlogged day disappears in dark on a logged one. Size and text colour carry
 * the same meaning in both themes and without relying on colour at all.
 */
export function StreakStrip({ days, testID }: StreakStripProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const logged = days.filter((d) => d.active).length;

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${logged} of the last ${days.length} days logged`}
      style={[styles.strip, { gap: spacing['space-2'] }]}
    >
      {days.map((day) => (
        <View key={day.date} style={[styles.cell, { gap: spacing['space-1'] }]}>
          {/* A fixed-height slot, so today's larger dot does not push its own
              initial out of line with the other six. */}
          <View style={styles.dotSlot}>
            <View
              testID={testID ? `${testID}-${day.isToday ? 'today' : day.date}` : undefined}
              style={[
                day.isToday ? styles.dotToday : styles.dot,
                {
                  borderRadius: radius['radius-pill'],
                  backgroundColor: day.active ? colors.pisang : colors['surface-sunken'],
                },
              ]}
            />
          </View>
          <Text
            style={[
              typography['body-s'],
              { color: day.isToday ? colors.ink : colors['ink-faint'] },
            ]}
          >
            {day.initial}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'flex-start' },
  cell: { flex: 1, alignItems: 'center' },
  dotSlot: { height: 20, justifyContent: 'center' },
  dot: { width: 14, height: 14 },
  dotToday: { width: 20, height: 20 },
});
