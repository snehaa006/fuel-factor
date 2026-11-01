import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * A tick box with its label.
 *
 * Extracted from the welcome gate when the invite questionnaire needed the
 * same control. Both screens take consent, and a consent tick that looked or
 * behaved differently on one of the two routes into the app would be the
 * beginning of them saying different things.
 *
 * The whole row is the target, not just the box: a 28px square is a poor hit
 * area on a phone being held one-handed on a touchline.
 */

export type CheckBoxProps = {
  label: string;
  /** A quieter second line, where the question needs one. */
  note?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testID?: string;
};

export function CheckBox({ label, note, checked, onChange, testID }: CheckBoxProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityHint={note}
      testID={testID}
      style={[
        styles.row,
        {
          backgroundColor: checked ? colors['daun-tint'] : colors['surface-raised'],
          borderColor: checked ? colors['daun-deep'] : colors.hairline,
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.daun : 'transparent',
            // Both themes: a transparent box needs the hairline to be visible
            // against surface-raised, and a filled one needs its own edge.
            borderColor: checked ? colors['daun-edge'] : colors.hairline,
            borderRadius: radius['radius-sm'],
          },
        ]}
      >
        {checked && <Text style={{ color: colors['on-bright'], fontWeight: '700' }}>✓</Text>}
      </View>
      <View style={styles.text}>
        <Text style={[typography['body-m'], { color: colors.ink }]}>{label}</Text>
        {note !== undefined && (
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{note}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  box: { width: 28, height: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
