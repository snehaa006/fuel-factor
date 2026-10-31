import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { DayType } from '@/lib/targets';

/**
 * Training and rest, and no third option.
 *
 * The tracker's Day Type column holds these two. The Week 1 deck does give a
 * game-day carbohydrate band, so the concept is the programme's, but the value
 * is not in their schema and the app does not add one.
 */
const OPTIONS: { value: DayType; label: string }[] = [
  { value: 'training', label: 'Training' },
  { value: 'rest', label: 'Rest' },
];

export type DayTypeSwitchProps = {
  value: DayType | null;
  onChange?: (value: DayType) => void;
  testID?: string;
};

export function DayTypeSwitch({ value, onChange, testID }: DayTypeSwitchProps) {
  const { colors, radius, spacing, typography } = useTheme();

  function select(next: DayType) {
    if (next === value) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onChange?.(next);
  }

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      style={[
        styles.track,
        { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-pill'], padding: 4 },
      ]}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => select(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} day`}
            testID={testID ? `${testID}-${option.value}` : undefined}
            style={[
              styles.option,
              {
                backgroundColor: selected ? colors.pisang : 'transparent',
                borderRadius: radius['radius-pill'],
                paddingVertical: spacing['space-2'],
              },
            ]}
          >
            <Text
              style={[
                typography.label,
                { color: selected ? colors['on-bright'] : colors['ink-muted'] },
              ]}
            >
              {option.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignSelf: 'flex-start', gap: 4 },
  option: { minWidth: 96, alignItems: 'center', justifyContent: 'center' },
});
