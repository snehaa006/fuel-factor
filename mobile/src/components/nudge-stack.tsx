import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NudgeCard } from '@/components/nudge-card';
import { useStrings } from '@/i18n';
import type { Nudge } from '@/lib/advice';
import { useTheme } from '@/theme';

/**
 * Today's advice as one card to flip through, rather than a card each.
 *
 * Sneha, 28 November: the advice cards were each a section, adding to the
 * scroll. So one shows at a time, with a dot per tip and "Next tip" to turn
 * to the next. Every card is still the rule's own sentence (`NudgeCard`).
 */
export function NudgeStack({ nudges, testID = 'tips' }: { nudges: Nudge[]; testID?: string }) {
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const [turned, setTurned] = useState(0);

  if (nudges.length === 0) return null;
  const index = turned % nudges.length;

  return (
    <View testID={testID} style={{ gap: spacing['space-2'] }}>
      <NudgeCard nudge={nudges[index]} testID={index === 0 ? 'nudge' : `nudge-${index}`} />
      {nudges.length > 1 && (
        <View style={styles.foot}>
          <View style={styles.dots}>
            {nudges.map((n, i) => (
              <View
                key={n.code}
                style={[
                  styles.dot,
                  { backgroundColor: i === index ? colors['air-deep'] : colors.hairline },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={() => setTurned(index + 1)}
            accessibilityRole="button"
            testID={`${testID}-next`}
            hitSlop={10}
          >
            <Text style={[typography.label, { color: colors['air-deep'] }]}>{t.nudge.nextTip}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
