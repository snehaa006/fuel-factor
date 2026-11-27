import { Pressable, StyleSheet, Text } from 'react-native';

import { useStrings } from '@/i18n';
import type { ProgrammeState } from '@/lib/programme';
import { reflectionOpen, useReflection } from '@/lib/reflection';
import { useTheme } from '@/theme';

/**
 * The end-of-programme reflection, offered on Today once the four weeks are
 * (nearly) done and until it is in. Hidden whenever the lookup fails: a
 * prompt that opens onto an error is worse than none.
 */
export type ReflectionPromptProps = {
  programme: ProgrammeState | null;
  participantId: string | null;
  onOpen: () => void;
  testID?: string;
};

export function ReflectionPrompt({
  programme,
  participantId,
  onOpen,
  testID = 'reflection-prompt',
}: ReflectionPromptProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const state = useReflection(participantId);

  if (participantId === null || !reflectionOpen(programme)) return null;
  if (state.status !== 'ready' || state.reflection !== null) return null;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors['pisang-tint'] : colors['surface-raised'],
          borderColor: colors.pisang,
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-1'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors['pisang-deep'] }]}>{t.reflection.promptTitle}</Text>
      <Text style={[typography['body-m'], { color: colors.ink }]}>{t.reflection.promptBody}</Text>
      <Text style={[typography.label, { color: colors['air-deep'], marginTop: spacing['space-2'] }]}>
        {t.reflection.promptCta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1.5 },
});
