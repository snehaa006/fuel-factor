import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { SlotState } from '@/lib/today';

export type MealTimelineProps = {
  slots: SlotState[];
  onPressSlot?: (slot: SlotState) => void;
  testID?: string;
};

/**
 * The six meal slots of the DAILY LOG sheet, down the screen in sheet order.
 *
 * An unlogged slot is empty, never late and never missed: the sheet records a
 * tick or no tick, and the app does not add a judgement the programme has not
 * made. The only states are logged and not yet.
 */
export function MealTimeline({ slots, onPressSlot, testID }: MealTimelineProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing['space-2'] }} testID={testID}>
      {slots.map((slot, index) => {
        const last = index === slots.length - 1;
        const names = slot.items.map((i) => i.name).join(', ');

        return (
          <Pressable
            key={slot.slot}
            onPress={onPressSlot ? () => onPressSlot(slot) : undefined}
            accessibilityRole={onPressSlot ? 'button' : undefined}
            accessibilityLabel={`${slot.label}, ${slot.logged ? 'logged' : 'not logged yet'}`}
            testID={testID ? `${testID}-${slot.slot}` : undefined}
            style={styles.row}
          >
            {/* The rail: a node per slot, joined by a line that stops at the last. */}
            <View style={styles.rail}>
              <View
                testID={testID ? `${testID}-${slot.slot}-node` : undefined}
                style={[
                  styles.node,
                  {
                    backgroundColor: slot.logged ? colors.daun : colors['surface-sunken'],
                    borderColor: slot.logged ? colors['daun-edge'] : colors.hairline,
                  },
                ]}
              />
              {!last && <View style={[styles.line, { backgroundColor: colors.hairline }]} />}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: slot.logged ? colors['daun-tint'] : colors['surface-raised'],
                  borderRadius: radius['radius-md'],
                  padding: spacing['space-3'],
                },
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={[typography['heading-m'], { color: colors.ink }]}>{slot.label}</Text>
                {slot.carbs_g !== null && (
                  <Text style={[typography['body-s'], { color: colors['pisang-deep'] }]}>
                    {Math.round(slot.carbs_g)} g
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={2}
                style={[typography['body-s'], { color: colors['ink-muted'] }]}
              >
                {names || 'Nothing logged yet'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 20 },
  node: { width: 16, height: 16, borderRadius: 999, borderWidth: 2, marginTop: 14 },
  line: { width: 2, flex: 1, marginTop: 4, minHeight: 12 },
  card: { flex: 1, gap: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
