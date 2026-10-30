import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton, type PushButtonVariant } from '@/components/push-button';
import { useTheme } from '@/theme';

const VARIANTS: { variant: PushButtonVariant; label: string; caption: string }[] = [
  { variant: 'primary', label: 'Log breakfast', caption: 'Primary' },
  { variant: 'success', label: 'Mark done', caption: 'Success' },
  { variant: 'alert', label: 'End streak', caption: 'Alert' },
  { variant: 'ghost', label: 'Skip for now', caption: 'Ghost' },
];

export default function ButtonShowcase() {
  const { colors, spacing, typography } = useTheme();
  const [lastPressed, setLastPressed] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-6'] }]}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>Fuel Factor</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}>
          Step 1 — tokens, fonts and the push button. Press and hold one.
        </Text>

        <View style={{ gap: spacing['space-6'], marginTop: spacing['space-8'] }}>
          {VARIANTS.map(({ variant, label, caption }) => (
            <View key={variant} style={{ gap: spacing['space-2'] }}>
              <Text style={[typography.label, { color: colors['ink-muted'] }]}>
                {caption.toUpperCase()}
              </Text>
              <PushButton
                variant={variant}
                label={label}
                testID={`button-${variant}`}
                onPress={() => setLastPressed(label)}
              />
            </View>
          ))}

          <View style={{ gap: spacing['space-2'] }}>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>DISABLED</Text>
            <PushButton label="Log breakfast" disabled testID="button-disabled" onPress={() => setLastPressed('nope')} />
          </View>

          <View style={{ gap: spacing['space-2'] }}>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>FULL WIDTH</Text>
            <PushButton
              label="Finish today"
              fullWidth
              testID="button-full"
              onPress={() => setLastPressed('Finish today')}
            />
          </View>
        </View>

        <View
          style={[
            styles.readout,
            {
              backgroundColor: colors['surface-raised'],
              borderRadius: 16,
              padding: spacing['space-4'],
              marginTop: spacing['space-8'],
            },
          ]}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>LAST PRESSED</Text>
          <Text testID="readout" style={[typography['heading-m'], { color: colors.ink }]}>
            {lastPressed ?? 'nothing yet'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 48 },
  readout: { gap: 4 },
});
