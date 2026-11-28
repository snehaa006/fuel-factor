import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StackCard } from '@/components/stack-card';
import { useStrings } from '@/i18n';
import type { ProgrammeState } from '@/lib/programme';
import { quizStatus, useQuizResults } from '@/lib/quiz';
import { useTheme } from '@/theme';
import { palette } from '@/theme/tokens';

/**
 * The week's mini quiz on Today: a small printed card when it is due (from the
 * week's seventh day), and one line with the score once it is taken, which
 * opens it again. Hidden when the results cannot be read.
 */
export function QuizPrompt({
  programme,
  participantId,
  onOpen,
  testID = 'quiz-prompt',
}: {
  programme: ProgrammeState | null;
  participantId: string | null;
  onOpen: (week: number) => void;
  testID?: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const results = useQuizResults(participantId);

  if (participantId === null || results.status !== 'ready') return null;
  const status = quizStatus(programme, results.results);
  if (status === null) return null;

  if (status.kind === 'done') {
    const { score, total } = status.result;
    return (
      <Pressable
        onPress={() => onOpen(status.week)}
        accessibilityRole="button"
        testID={`${testID}-done`}
        style={({ pressed }) => [
          styles.line,
          {
            backgroundColor: pressed ? colors['surface-sunken'] : colors['surface-raised'],
            borderRadius: radius['radius-lg'],
            paddingVertical: spacing['space-3'],
            paddingHorizontal: spacing['space-4'],
          },
        ]}
      >
        <View style={[styles.badge, { backgroundColor: colors.air }]}>
          <Text style={[typography.label, { color: palette.light['surface-raised'] }]}>?</Text>
        </View>
        <Text style={[typography['body-m'], styles.lineText, { color: colors.ink }]}>
          {t.quiz.lineDone(status.week, score, total)}
        </Text>
        <Text style={[typography.label, { color: colors['air-deep'] }]}>{t.quiz.retake} ›</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => onOpen(status.week)} accessibilityRole="button" testID={testID}>
      {({ pressed }) => (
        <StackCard
          color={palette.light.air}
          shadow={palette.light['air-deep']}
          border={palette.light.langit}
          offset={pressed ? 3 : 6}
          radius={20}
        >
          <View style={{ padding: spacing['space-4'], gap: spacing['space-1'] }}>
            <Text style={[typography.label, { color: palette.light['surface-raised'] }]}>
              {t.quiz.promptTitle(status.week)}
            </Text>
            <Text style={[typography['body-m'], { color: palette.light['surface-raised'] }]}>
              {t.quiz.promptBody}
            </Text>
            <Text
              style={[typography.label, { color: palette.light.pisang, marginTop: spacing['space-2'] }]}
            >
              {t.quiz.promptCta}
            </Text>
          </View>
        </StackCard>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineText: { flex: 1 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
