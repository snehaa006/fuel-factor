import { StyleSheet, Text, View } from 'react-native';

import {
  CARB_CHALLENGE_RULE,
  CHALLENGE_MEALS,
  type ChallengeDay,
  type ChallengeWeek,
} from '@/lib/carb-challenge';
import { SLOT_LABEL } from '@/lib/today';
import { useTheme } from '@/theme';

export type CarbChallengeCardProps = {
  week: ChallengeWeek;
  /** The week's challenge as the programme row words it. */
  challenge?: string | null;
  testID?: string;
};

const MEAL_INITIAL: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D' };

/**
 * Week 1's challenge, read off the daily log.
 *
 * Seven columns, one per day of the programme week. Each has three pips --
 * breakfast, lunch, dinner -- lit when that meal had a carbohydrate logged in
 * it, and a day is won when all three are lit. The line underneath says how
 * the week stands: the streak while it is alive, and plainly when a day has
 * been missed and seven of seven is gone.
 *
 * Like the streak strip, today is marked by size and a darker initial rather
 * than an outline, which survives both themes.
 */
export function CarbChallengeCard({ week, challenge, testID }: CarbChallengeCardProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        },
      ]}
    >
      <View style={{ gap: 2 }}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>
          WEEK {week.weekNumber} CHALLENGE
        </Text>
        <Text style={[typography['heading-m'], { color: colors.ink }]}>
          {challenge ?? 'Add one carb to every meal'}
        </Text>
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {CARB_CHALLENGE_RULE}
        </Text>
      </View>

      <View
        style={[styles.strip, { gap: spacing['space-1'] }]}
        accessibilityRole="text"
        accessibilityLabel={`${week.doneDays} of 7 days with a carb at every meal`}
      >
        {week.days.map((day) => (
          <DayColumn key={day.date} day={day} testID={testID ? `${testID}-${day.date}` : undefined} />
        ))}
      </View>

      <Text
        testID={testID ? `${testID}-status` : undefined}
        style={[typography['body-m'], { color: colors.ink, textAlign: 'center' }]}
      >
        {statusLine(week)}
      </Text>
      <Text style={[typography['body-s'], { color: colors['ink-faint'], textAlign: 'center' }]}>
        {CHALLENGE_MEALS.map((m) => `${MEAL_INITIAL[m]} ${SLOT_LABEL[m]}`).join(' · ')}
      </Text>
    </View>
  );
}

function DayColumn({ day, testID }: { day: ChallengeDay; testID?: string }) {
  const { colors, radius, typography } = useTheme();
  const { isToday } = day;

  const badge =
    day.status === 'done' ? '✓' : day.status === 'missed' ? '✕' : day.status === 'today' ? '…' : '';
  const badgeColor =
    day.status === 'done'
      ? colors['daun-deep']
      : day.status === 'missed'
        ? colors['cabai-deep']
        : colors['ink-faint'];

  return (
    <View
      testID={testID}
      accessibilityLabel={`${day.date}: ${day.carbMeals} of 3 meals with a carb, ${day.status}`}
      style={styles.column}
    >
      <Text
        style={[
          typography['body-s'],
          { color: isToday ? colors.ink : colors['ink-faint'], fontWeight: isToday ? '700' : '400' },
        ]}
      >
        {day.initial}
      </Text>
      <View style={styles.pips}>
        {day.meals.map((meal) => (
          <View
            key={meal.slot}
            style={[
              styles.pip,
              {
                borderRadius: radius['radius-sm'],
                backgroundColor: meal.carb
                  ? colors.pisang
                  : day.status === 'upcoming'
                    ? colors['surface-sunken']
                    : colors.locked,
              },
            ]}
          >
            <Text
              style={[
                styles.pipText,
                { color: meal.carb ? colors['on-bright'] : colors['ink-faint'] },
              ]}
            >
              {MEAL_INITIAL[meal.slot]}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[typography['body-s'], { color: badgeColor, height: 18 }]}>{badge}</Text>
    </View>
  );
}

/** How the week stands, in one line. */
export function statusLine(week: ChallengeWeek): string {
  if (week.phase === 'before') return `Starts on ${week.startsOn}.`;
  if (week.complete) return 'All 7 days. Challenge complete!';

  const tally = `${week.doneDays} of 7 days`;
  if (week.phase === 'over') return `Week over: ${tally}.`;

  const today = week.days.find((d) => d.status === 'today');
  const left = today ? ` Today: ${today.carbMeals} of 3 meals so far.` : '';
  if (week.broken) return `${tally} so far. A day was missed, so keep the habit going.${left}`;
  const streak = week.streak > 0 ? ` ${week.streak}-day streak.` : '';
  return `${tally} so far.${streak}${left}`;
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  strip: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  pips: { gap: 3 },
  pip: { width: 26, height: 20, alignItems: 'center', justifyContent: 'center' },
  pipText: { fontSize: 11, fontWeight: '700' },
});
