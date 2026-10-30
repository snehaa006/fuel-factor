import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LIMITS } from '@/lib/check-in';
import { useTheme } from '@/theme';

const LEVELS = Array.from(
  { length: LIMITS.rating.max - LIMITS.rating.min + 1 },
  (_, i) => i + LIMITS.rating.min
);

export type RatingScaleProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  testID?: string;
};

/**
 * One of the sheet's five 1-10 self-ratings.
 *
 * The ends are labelled 1 and 10 and nothing else. The workbook has anchor
 * text for these scales and it is not in this repository, so the app shows no
 * adjective rather than a plausible one — "1 = exhausted" would be the app
 * writing the instrument's wording for it.
 */
export function RatingScale({ label, value, onChange, testID }: RatingScaleProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View testID={testID} style={{ gap: spacing['space-2'] }}>
      <View style={styles.head}>
        <Text style={[typography['body-m'], { color: colors.ink }]}>{label}</Text>
        <Text
          testID={testID ? `${testID}-value` : undefined}
          style={[typography['body-s'], { color: value === null ? colors['ink-faint'] : colors['pisang-deep'] }]}
        >
          {value === null ? 'not answered' : value}
        </Text>
      </View>
      <View style={styles.scale}>
        {LEVELS.map((level) => {
          const selected = value === level;
          return (
            <Pressable
              key={level}
              onPress={() => onChange(level)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${level} out of ${LIMITS.rating.max}`}
              testID={testID ? `${testID}-${level}` : undefined}
              style={[
                styles.cell,
                {
                  backgroundColor: selected ? colors.pisang : colors['surface-sunken'],
                  borderRadius: radius['radius-sm'],
                },
              ]}
            >
              <Text
                style={[
                  typography['body-s'],
                  { color: selected ? colors['on-bright'] : colors['ink-muted'] },
                ]}
              >
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  scale: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
});
