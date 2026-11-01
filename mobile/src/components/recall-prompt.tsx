import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROUND_LABEL, type RecallWindow } from '@/lib/recall-window';
import { useTheme } from '@/theme';

/**
 * The card that asks for a recall day.
 *
 * It states which round it is, how many of the three days are in, and nothing
 * about food, because this is the app asking for data rather than the
 * programme giving advice. The nudge cards are where the programme's sentences
 * live, and they carry a rule code and a source so a dietitian can review
 * them; this card carries neither and says nothing that would need one.
 *
 * Tinted like the Learn section rather than like a flag: being asked for a
 * recall is a task, not a warning about how somebody is eating.
 */

export type RecallPromptProps = {
  window: RecallWindow;
  onPress: () => void;
  testID?: string;
};

export function RecallPrompt({ window, onPress, testID }: RecallPromptProps) {
  const { colors, radius, spacing, typography } = useTheme();

  // Nothing to ask for: neither a complete set nor a missing programme date is
  // something to put a card on the screen about.
  if (window.status === 'none') return null;

  const body =
    window.status === 'due'
      ? `Day ${window.position} of ${window.of}. ${window.done} ${
          window.done === 1 ? 'day is' : 'days are'
        } in.`
      : `Opens in ${window.daysUntil} ${window.daysUntil === 1 ? 'day' : 'days'}, on ${
          window.opensOn
        }.`;

  const eyebrow =
    window.status === 'due' ? ROUND_LABEL[window.round].toUpperCase() : 'FOUR WEEKS ON';

  return (
    <Pressable
      onPress={window.status === 'due' ? onPress : undefined}
      disabled={window.status !== 'due'}
      accessibilityRole={window.status === 'due' ? 'button' : 'summary'}
      accessibilityLabel={
        window.status === 'due'
          ? `Fill in food recall day ${window.position} of ${window.of}`
          : `The follow-up recall opens on ${window.opensOn}`
      }
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors['air-tint'] : colors['langit-tint'],
          borderColor: colors.hairline,
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-1'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>{eyebrow}</Text>
      <Text style={[typography['heading-m'], { color: colors.ink }]}>
        {window.status === 'due' ? 'Your food recall' : 'Your next food recall'}
      </Text>
      <Text
        testID={testID ? `${testID}-body` : undefined}
        style={[typography['body-s'], { color: colors['ink-muted'] }]}
      >
        {body}
      </Text>

      {window.status === 'due' && (
        <View style={{ marginTop: spacing['space-2'] }}>
          <Text style={[typography.label, { color: colors['air-deep'] }]}>
            {window.round === 'baseline' ? 'FILL THIS IN FIRST →' : 'FILL IT IN →'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1 },
});
