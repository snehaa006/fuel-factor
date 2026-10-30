import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clampCounter, LIMITS } from '@/lib/check-in';
import { useTheme } from '@/theme';

export type StepperProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  testID?: string;
};

/**
 * One serving counter.
 *
 * It counts and shows the count. There is no target, no tick and no colour
 * change at any number, because the programme has set no serving targets —
 * anything that read as "enough" would be a nutrition judgement.
 */
export function Stepper({ label, value, onChange, testID }: StepperProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const current = value ?? 0;

  const button = (delta: number, symbol: string, name: string) => {
    const disabled =
      delta < 0 ? current <= LIMITS.counter.min : current >= LIMITS.counter.max;
    return (
      <Pressable
        onPress={() => onChange(clampCounter(current + delta))}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${name} ${label}`}
        accessibilityState={{ disabled }}
        testID={testID ? `${testID}-${name}` : undefined}
        style={[
          styles.button,
          {
            backgroundColor: disabled ? colors.locked : colors['surface-sunken'],
            borderRadius: radius['radius-pill'],
          },
        ]}
      >
        <Text
          style={[typography['heading-m'], { color: disabled ? colors['ink-faint'] : colors.ink }]}
        >
          {symbol}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      testID={testID}
      style={[
        styles.row,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-md'],
          padding: spacing['space-3'],
        },
      ]}
    >
      <Text style={[typography['body-m'], { color: colors.ink, flex: 1 }]}>{label}</Text>
      {button(-1, '−', 'minus')}
      <Text
        testID={testID ? `${testID}-value` : undefined}
        accessibilityLabel={`${label}: ${value === null ? 'not answered' : value}`}
        style={[typography['heading-m'], styles.value, { color: value === null ? colors['ink-faint'] : colors.ink }]}
      >
        {value === null ? '–' : value}
      </Text>
      {button(1, '+', 'plus')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 28, textAlign: 'center' },
});
