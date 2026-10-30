import { Pressable, StyleSheet, Text, View } from 'react-native';

import { URINE_LEVELS, URINE_WORDING } from '@/lib/check-in';
import { useTheme } from '@/theme';

export type UrineScaleProps = {
  value: number | null;
  onChange: (value: number) => void;
  testID?: string;
};

/**
 * The hydration reading, 1 to 8.
 *
 * Deliberately numbers and not swatches. The programme's chart has eight
 * specific colours and they are not in this repository; an approximated swatch
 * would not make the control vaguer, it would make the reading wrong, and this
 * is the measurement Theo's own three days at 6 rest on. The athlete matches
 * against the workbook's printed chart and taps the number.
 *
 * When the dietitian supplies the eight values they become colour tokens and
 * each cell gets its fill. Nothing else here changes.
 */
export function UrineScale({ value, onChange, testID }: UrineScaleProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const wording = value === null ? null : URINE_WORDING[value];

  return (
    <View testID={testID} style={{ gap: spacing['space-2'] }}>
      <View style={styles.scale}>
        {URINE_LEVELS.map((level) => {
          const selected = value === level;
          return (
            <Pressable
              key={level}
              onPress={() => onChange(level)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Urine colour ${level}${URINE_WORDING[level] ? `, ${URINE_WORDING[level]}` : ''}`}
              testID={testID ? `${testID}-${level}` : undefined}
              style={[
                styles.cell,
                {
                  backgroundColor: selected ? colors['air-edge'] : colors['surface-sunken'],
                  borderColor: selected ? colors['air-edge'] : colors.hairline,
                  borderRadius: radius['radius-sm'],
                },
              ]}
            >
              <Text
                style={[
                  typography['body-s'],
                  { color: selected ? colors['on-fill'] : colors['ink-muted'] },
                ]}
              >
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        testID={testID ? `${testID}-wording` : undefined}
        style={[typography['body-s'], { color: wording ? colors['air-deep'] : colors['ink-muted'] }]}
      >
        {wording ?? 'Match against the chart in your workbook, then tap the number.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scale: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
