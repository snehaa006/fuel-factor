import { StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/components/calendar';
import { en } from '@/i18n/en';
import type { Strings } from '@/i18n';
import { type ChallengeDay, type ChallengeSpec, type ChallengeWeek } from '@/lib/meal-challenge';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

export type MealChallengeCardProps = {
  week: ChallengeWeek;
  /** The week's challenge as the programme row words it. */
  challenge?: string | null;
  testID?: string;
};

/** The letter on a pip, in the athlete's language: a slot's or a habit's. */
function pipInitial(key: string, t: Strings): string {
  return t.slotInitials[key] ?? t.habits[key]?.initial ?? '?';
}

/** The key under the strip: what each letter stands for. */
function legend(spec: ChallengeSpec, t: Strings): string {
  if (spec.kind === 'meals') {
    return spec.meals.map((m) => `${pipInitial(m, t)} ${t.slots[m] ?? m}`).join(' · ');
  }
  return spec.habits.map((h) => `${pipInitial(h, t)} ${t.habits[h]?.label ?? h}`).join(' · ');
}

/** What a day is checked for, for a screen reader. */
function aboutDay(spec: ChallengeSpec, t: Strings): string {
  return spec.kind === 'meals'
    ? t.challenge.aboutMeals(spec.nutrient === 'carb')
    : spec.habits.map((h) => (t.habits[h]?.label ?? h).toLowerCase()).join(t.challenge.and);
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
  const t = useStrings();
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
          {t.challenge.eyebrow(spec.week)}
        </Text>
        <Text style={[typography['heading-m'], { color: colors.ink }]}>
          {challenge ?? spec.title}
        </Text>
      </View>

      <View
        style={[styles.strip, { gap: spacing['space-1'] }]}
        accessibilityRole="text"
        accessibilityLabel={t.challenge.strip(week.doneDays, week.daysNeeded, aboutDay(spec, t))}
      >
        {week.days.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            about={aboutDay(spec, t)}
            testID={testID ? `${testID}-${day.date}` : undefined}
          />
        ))}
      </View>

      <Text
        testID={testID ? `${testID}-status` : undefined}
        style={[typography['body-m'], { color: colors.ink, textAlign: 'center' }]}
      >
        {statusLine(week, t)}
      </Text>
      <Text style={[typography['body-s'], { color: colors['ink-faint'], textAlign: 'center' }]}>
        {legend(spec, t)}
      </Text>
      {spec.kind === 'habits' && spec.unrecorded !== undefined && (
        <Text
          testID={testID ? `${testID}-unrecorded` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}
        >
          {/* One spec carries this line today (week 4's water on waking). */}
          {t.challenge.unrecordedWater}
        </Text>
      )}
    </View>
  );
}

function DayColumn({ day, about, testID }: { day: ChallengeDay; about: string; testID?: string }) {
  const { colors, radius, typography } = useTheme();
  const t = useStrings();
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
      accessibilityLabel={t.challenge.day(
        shortDate(day.date, t),
        about,
        day.hits,
        day.needed,
        t.challenge.statuses[day.status] ?? day.status
      )}
      style={styles.column}
    >
      <Text
        style={[
          typography['body-s'],
          { color: isToday ? colors.ink : colors['ink-faint'], fontWeight: isToday ? '700' : '400' },
        ]}
      >
        {t.streak.dayInitials[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}
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
              {check.applies ? pipInitial(check.key, t) : '–'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[typography['body-s'], { color: badgeColor, height: 18 }]}>{badge}</Text>
    </View>
  );
}

/** How the week stands, in one short line. */
export function statusLine(week: ChallengeWeek, t: Strings = en): string {
  const c = t.challenge;
  if (week.phase === 'before') return c.starts(shortDate(week.startsOn, t));
  const oneDay = week.daysNeeded === 1;
  if (week.complete) return oneDay ? c.doneOneDay : c.doneWeek;

  const tally = oneDay ? c.notDoneYet : c.daysOf7(week.doneDays);
  if (week.phase === 'over') return c.weekOver(tally);

  const today = week.days.find((d) => d.status === 'today');
  const { spec } = week;
  const parts = [tally];
  if (!oneDay && !week.broken && week.streak > 0) parts.push(c.streak(week.streak));
  if (today) {
    const target =
      spec.kind === 'meals' && spec.mealsNeeded !== spec.meals.length
        ? `${today.needed}+`
        : `${today.needed}`;
    parts.push(c.today(today.hits, target));
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
