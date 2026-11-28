import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import type { ProgrammeState } from '@/lib/programme';
import { useWeeks } from '@/lib/use-learn';
import { useCheckedWeeks } from '@/lib/weekly-log';
import { shortDate } from '@/components/calendar';
import { checkInStatus } from '@/lib/weekly';
import { useTheme } from '@/theme';

/**
 * The week's check-in, offered on Today when it is due.
 *
 * Theo, 25 November: "do you want to make like a survey or quiz before they
 * move on to the next week? Like a check-in to ensure that they actually
 * learn." Sofia, the same call: use the WEEKLY LOG tab's questions. So this
 * is the Sunday check-in Theo used to send on WhatsApp, offered from the
 * week's sixth day and kept here through the next week until it is in. It
 * never blocks anything: the next week opens on its day either way.
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
  const checked = useCheckedWeeks(participantId);

  if (weeks.status !== 'ready' || checked.status !== 'ready' || participantId === null) return null;
  // Every programme week has a check-in, written lesson or not: it asks about
  // the athlete's week, not about the lesson.
  const all = weeks.weeks.map((w) => w.weekNumber);
  const status = checkInStatus(programme, (n) => checked.weeks.includes(n), all);
  if (status === null) return null;

  // Not due: one compact line, so the check-in is always visible on Today
  // without taking a card's worth of the scroll. Done opens the answers.
  if (status.kind !== 'due') {
    const done = status.kind === 'done';
    return (
      <Pressable
        onPress={done ? () => onOpen(status.week) : undefined}
        disabled={!done}
        accessibilityRole={done ? 'button' : 'text'}
        testID={`${testID}-${status.kind}`}
        style={({ pressed }) => [
          styles.line,
          {
            backgroundColor: pressed ? colors['daun-tint'] : colors['surface-raised'],
            borderRadius: radius['radius-lg'],
            paddingVertical: spacing['space-3'],
            paddingHorizontal: spacing['space-4'],
          },
        ]}
      >
        <View
          style={[
            styles.badge,
            { backgroundColor: done ? colors.daun : colors['surface-sunken'] },
          ]}
        >
          <Text style={[typography.label, { color: done ? colors['on-bright'] : colors['ink-muted'] }]}>
            {done ? '✓' : '📝'}
          </Text>
        </View>
        <Text style={[typography['body-m'], styles.lineText, { color: done ? colors.ink : colors['ink-muted'] }]}>
          {done
            ? t.checkin.lineDone(status.week)
            : t.checkin.lineUpcoming(status.week, shortDate(status.opensOn, t))}
        </Text>
        {done && (
          <Text style={[typography.label, { color: colors['air-deep'] }]}>{t.checkin.seeAnswers} ›</Text>
        )}
      </Pressable>
    );
  }
  const week = status.week;

  return (
    <Pressable
      onPress={() => onOpen(week)}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors['daun-tint'] : colors['surface-raised'],
          borderColor: colors.daun,
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-1'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors['daun-deep'] }]}>
        {t.checkin.promptTitle(week)}
      </Text>
      <Text style={[typography['body-m'], { color: colors.ink }]}>{t.checkin.promptBody}</Text>
      <Text style={[typography.label, { color: colors['air-deep'], marginTop: spacing['space-2'] }]}>
        {t.checkin.promptCta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1.5 },
  line: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineText: { flex: 1 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
