import { StyleSheet, Text, View } from 'react-native';

import type { ChallengeDay, ChallengeWeek } from '@/lib/meal-challenge';
import { SLOT_LABEL, type MealSlot } from '@/lib/today';
import { useTheme } from '@/theme';

export type MealChallengeCardProps = {
  week: ChallengeWeek;
  /** The week's challenge as the programme row words it. */
  challenge?: string | null;
  testID?: string;
};

const MEAL_INITIAL: Partial<Record<MealSlot, string>> = {
  breakfast: 'B',
  lunch: 'L',
  post_training: 'P',
  dinner: 'D',
};

const NUTRIENT_WORD = { carb: 'a carb', protein: 'protein' } as const;

/**
 * A week's challenge, read off the daily log.
 *
 * Seven columns, one per day of the programme week. Each has a pip per meal
 * the challenge counts, lit when that meal had the week's nutrient logged in
 * it, and a tick once the day has enough. The line underneath says how the
 * week stands: the streak while it is alive, and plainly when a day has been
 * missed and seven of seven is gone.
 *
 * Like the streak strip, today is marked by weight and a darker initial
 * rather than an outline, which survives both themes.
 */
export function MealChallengeCard({ week, challenge, testID }: MealChallengeCardProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const { spec } = week;

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
          WEEK {spec.week} CHALLENGE
        </Text>
        <Text style={[typography['heading-m'], { color: colors.ink }]}>
          {challenge ?? spec.title}
        </Text>
      </View>

      <View
        style={[styles.strip, { gap: spacing['space-1'] }]}
        accessibilityRole="text"
        accessibilityLabel={`${week.doneDays} of 7 days with ${NUTRIENT_WORD[spec.nutrient]} at ${spec.mealsNeeded} meals`}
      >
        {week.days.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            nutrient={NUTRIENT_WORD[spec.nutrient]}
            needed={spec.mealsNeeded}
            testID={testID ? `${testID}-${day.date}` : undefined}
          />
        ))}
      </View>

      <Text
        testID={testID ? `${testID}-status` : undefined}
        style={[typography['body-m'], { color: colors.ink, textAlign: 'center' }]}
      >
        {statusLine(week)}
      </Text>
      <Text style={[typography['body-s'], { color: colors['ink-faint'], textAlign: 'center' }]}>
        {spec.meals.map((m) => `${MEAL_INITIAL[m] ?? '?'} ${SLOT_LABEL[m]}`).join(' · ')}
      </Text>
    </View>
  );
}

function DayColumn({
  day,
  nutrient,
  needed,
  testID,
}: {
  day: ChallengeDay;
  nutrient: string;
  needed: number;
  testID?: string;
}) {
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
      accessibilityLabel={`${day.date}: ${nutrient} at ${day.hits} of ${needed} meals needed, ${day.status}`}
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
                backgroundColor: meal.hit
                  ? colors.pisang
                  : day.status === 'upcoming'
                    ? colors['surface-sunken']
                    : colors.locked,
              },
            ]}
          >
            <Text
              style={[styles.pipText, { color: meal.hit ? colors['on-bright'] : colors['ink-faint'] }]}
            >
              {MEAL_INITIAL[meal.slot] ?? '?'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[typography['body-s'], { color: badgeColor, height: 18 }]}>{badge}</Text>
    </View>
  );
}

/** How the week stands, in one short line. */
export function statusLine(week: ChallengeWeek): string {
  if (week.phase === 'before') return `Starts ${week.startsOn}`;
  if (week.complete) return '7 of 7 days. Challenge complete!';

  const tally = `${week.doneDays} of 7 days`;
  if (week.phase === 'over') return `Week over · ${tally}`;

  const today = week.days.find((d) => d.status === 'today');
  const { mealsNeeded, meals } = week.spec;
  const target = mealsNeeded === meals.length ? `${mealsNeeded}` : `${mealsNeeded}+`;
  const parts = [tally];
  if (!week.broken && week.streak > 0) parts.push(`${week.streak}-day streak`);
  if (today) parts.push(`today ${today.hits}/${target}`);
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  strip: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  pips: { gap: 3 },
  pip: { width: 26, height: 20, alignItems: 'center', justifyContent: 'center' },
  pipText: { fontSize: 11, fontWeight: '700' },
});
