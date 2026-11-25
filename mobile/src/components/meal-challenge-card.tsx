import { StyleSheet, Text, View } from 'react-native';

import {
  HABIT_LABEL,
  type ChallengeDay,
  type ChallengeSpec,
  type ChallengeWeek,
} from '@/lib/meal-challenge';
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

/** The key under the strip: what each letter stands for. */
function legend(spec: ChallengeSpec): string {
  if (spec.kind === 'meals') {
    return spec.meals.map((m) => `${MEAL_INITIAL[m] ?? '?'} ${SLOT_LABEL[m]}`).join(' · ');
  }
  return spec.habits.map((h) => `${HABIT_LABEL[h].initial} ${HABIT_LABEL[h].label}`).join(' · ');
}

/** What a day is checked for, for a screen reader. */
function aboutDay(spec: ChallengeSpec): string {
  return spec.kind === 'meals'
    ? `${spec.nutrient === 'carb' ? 'a carb' : 'protein'} at meals`
    : spec.habits.map((h) => HABIT_LABEL[h].label.toLowerCase()).join(' and ');
}

/**
 * A week's challenge, read off the daily log.
 *
 * Seven columns, one per day of the programme week. Each has a pip per thing
 * the challenge checks -- a meal in weeks 1 and 2, a habit in weeks 3 and 4 --
 * lit when it was met, and a tick once the day has enough. A check the day
 * does not ask (week 3's pre-sleep snack on a rest night) is drawn as a dash
 * rather than as a miss. The line underneath says how the week stands: the
 * streak while it is alive, and plainly when the week is out of reach.
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
        accessibilityLabel={`${week.doneDays} of ${week.daysNeeded} ${week.daysNeeded === 1 ? 'day' : 'days'} needed, checking ${aboutDay(spec)}`}
      >
        {week.days.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            about={aboutDay(spec)}
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
        {legend(spec)}
      </Text>
      {spec.kind === 'habits' && spec.unrecorded !== undefined && (
        <Text
          testID={testID ? `${testID}-unrecorded` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}
        >
          {spec.unrecorded}
        </Text>
      )}
    </View>
  );
}

function DayColumn({ day, about, testID }: { day: ChallengeDay; about: string; testID?: string }) {
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
      accessibilityLabel={`${day.date}: ${about}, ${day.hits} of ${day.needed} met, ${day.status}`}
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
        {day.checks.map((check) => (
          <View
            key={check.key}
            testID={testID ? `${testID}-${check.key}` : undefined}
            style={[
              styles.pip,
              {
                borderRadius: radius['radius-sm'],
                backgroundColor: !check.applies
                  ? 'transparent'
                  : check.hit
                    ? colors.pisang
                    : day.status === 'upcoming'
                      ? colors['surface-sunken']
                      : colors.locked,
              },
            ]}
          >
            <Text
              style={[styles.pipText, { color: check.hit ? colors['on-bright'] : colors['ink-faint'] }]}
            >
              {check.applies ? check.initial : '–'}
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
  const oneDay = week.daysNeeded === 1;
  if (week.complete) return oneDay ? 'Done. Challenge complete!' : '7 of 7 days. Challenge complete!';

  const tally = oneDay ? 'Not done yet' : `${week.doneDays} of 7 days`;
  if (week.phase === 'over') return `Week over · ${tally}`;

  const today = week.days.find((d) => d.status === 'today');
  const { spec } = week;
  const parts = [tally];
  if (!oneDay && !week.broken && week.streak > 0) parts.push(`${week.streak}-day streak`);
  if (today) {
    const target =
      spec.kind === 'meals' && spec.mealsNeeded !== spec.meals.length
        ? `${today.needed}+`
        : `${today.needed}`;
    parts.push(`today ${today.hits}/${target}`);
  }
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
