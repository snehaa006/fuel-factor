import { Pressable, StyleSheet, Text } from 'react-native';

import { useStrings } from '@/i18n';
import type { ProgrammeState } from '@/lib/programme';
import { useCards, useWeeks } from '@/lib/use-learn';
import { useWeekChecks } from '@/lib/week-check';
import { quizFor, weekToCheck } from '@/lib/weekly';
import { useTheme } from '@/theme';

/**
 * The week check, offered on Today when it is due.
 *
 * Theo, 25 November: "do you want to make like a survey or quiz before they
 * move on to the next week? Like a check-in to ensure that they actually
 * learn and not just use the app because they have to." A week's check is
 * offered from its sixth day and stays here through the next week until it
 * is done. It never blocks anything: the next week's lesson opens on its day
 * either way, because the programme's calendar is the coach's, not a score's.
 */

export type WeekCheckPromptProps = {
  programme: ProgrammeState | null;
  participantId: string | null;
  onOpen: (week: number) => void;
  testID?: string;
};

export function WeekCheckPrompt({
  programme,
  participantId,
  onOpen,
  testID = 'week-check-prompt',
}: WeekCheckPromptProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const weeks = useWeeks();
  const checks = useWeekChecks(participantId);

  const written =
    weeks.status === 'ready' ? weeks.weeks.filter((w) => w.unlocked).map((w) => w.weekNumber) : [];
  const week = weeks.status === 'ready' ? weekToCheck(programme, (n) => n in checks, written) : null;
  const cards = useCards(week === null ? '' : String(week));

  if (week === null || cards.status !== 'ready') return null;
  const questions = quizFor(cards.cards[week] ?? [], week);
  if (questions.length === 0) return null;

  return (
    <Pressable
      onPress={() => onOpen(week)}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors['daun-tint'] : colors['surface-raised'],
          borderColor: colors['daun'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-1'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors['daun-deep'] }]}>
        {t.weekly.promptTitle(week)}
      </Text>
      <Text style={[typography['body-m'], { color: colors.ink }]}>
        {t.weekly.promptBody(questions.length)}
      </Text>
      <Text style={[typography.label, { color: colors['air-deep'], marginTop: spacing['space-2'] }]}>
        {t.weekly.promptCta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1.5 },
});
