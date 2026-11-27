import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { shortDate } from '@/components/calendar';
import { MascotBanner } from '@/components/mascot-banner';
import type { Week } from '@/lib/learn';
import { learnCue } from '@/lib/mascot-copy';
import { useParticipantId } from '@/lib/use-foods';
import { useWeeks } from '@/lib/use-learn';
import { useProgramme } from '@/lib/use-programme';
import { useCheckedWeeks } from '@/lib/weekly-log';
import { canRead, checkInOpen, weekAccess, type WeekAccess } from '@/lib/weekly';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The four weeks of the programme, run week by week.
 *
 * Sofia, 25 November: "can the learning section be in tandem with the week
 * that the athlete is on?" So the week the programme is in leads, marked
 * *This week*; the weeks before it stay open to re-read, each saying whether
 * its Sunday check-in is in; the weeks after it are locked and say the day they open. With
 * no programme to follow (a coach, or no first day set) every written week
 * is simply open.
 *
 * A week the programme has not written is locked whatever the date, and
 * shows its number and nothing else -- no theme, no teaser -- because the app
 * will not guess what a week is about on the programme's behalf.
 */
export default function Learn() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const state = useWeeks();
  const programme = useProgramme();
  const participantId = useParticipantId();
  const checked = useCheckedWeeks(participantId);
  const checkedWeeks = checked.status === 'ready' ? checked.weeks : [];

  if (state.status === 'loading' || programme.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <View style={{ padding: spacing['space-6'], gap: spacing['space-2'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>
            {t.learn.couldNotLoad}
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // A coach, or an account with no athlete behind it, has no programme week.
  const programmeState = programme.status === 'ready' ? programme.programme : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.learn.backToToday}
          testID="learn-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.learn.todayCaps}</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {t.learn.title}
        </Text>
        <View style={{ marginTop: spacing['space-4'] }}>
          <MascotBanner
            pose={learnCue(t).pose}
            message={learnCue(t).message}
            eyebrow={learnCue(t).eyebrow}
            motion={learnCue(t).motion}
            testID="learn-mascot"
          />
        </View>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {ordered(state.weeks, programmeState).map(({ week, access }) => {
            const open = week.unlocked && canRead(access);
            const current = access.state === 'current';
            const done = checkedWeeks.includes(week.weekNumber);
            const due = checkInOpen(week.weekNumber, programmeState);
            return (
              <Pressable
                key={week.weekNumber}
                disabled={!open}
                onPress={() => router.push(`/learn/${week.weekNumber}`)}
                accessibilityRole="button"
                accessibilityState={{ disabled: !open }}
                accessibilityLabel={
                  week.unlocked
                    ? t.learn.weekOpen(week.weekNumber, week.theme)
                    : t.learn.weekNotWritten(week.weekNumber)
                }
                testID={`week-${week.weekNumber}`}
                style={{
                  backgroundColor: open
                    ? current
                      ? colors['pisang-tint']
                      : colors['surface-raised']
                    : colors.locked,
                  borderColor: colors.pisang,
                  borderWidth: current ? 2 : 0,
                  borderRadius: radius['radius-lg'],
                  padding: spacing['space-4'],
                  gap: spacing['space-1'],
                }}
              >
                <View style={styles.eyebrow}>
                  <Text style={[typography.label, { color: colors['ink-muted'] }]}>
                    {t.learn.weekCaps(week.weekNumber)}
                  </Text>
                  {current && (
                    <Text testID={`week-${week.weekNumber}-current`} style={[typography.label, { color: colors['pisang-deep'] }]}>
                      {t.weekly.thisWeek}
                    </Text>
                  )}
                  {access.state === 'past' && week.unlocked && (
                    <Text style={[typography.label, { color: colors['daun-deep'] }]}>
                      {t.weekly.doneCaps}
                    </Text>
                  )}
                </View>
                <Text
                  style={[typography['heading-l'], { color: open ? colors.ink : colors['ink-faint'] }]}
                >
                  {/* No theme invented for a week the programme has not written. */}
                  {week.theme ?? t.learn.notWrittenYet}
                </Text>
                {open && week.challenge !== null && (
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                    {t.learn.challenge(week.challenge)}
                  </Text>
                )}
                {access.state === 'future' && week.unlocked && (
                  <Text
                    testID={`week-${week.weekNumber}-opens`}
                    style={[typography['body-s'], { color: colors['ink-muted'] }]}
                  >
                    {t.weekly.opensOn(shortDate(access.opensOn, t))}
                  </Text>
                )}
                {due && (
                  <Pressable
                    onPress={() => router.push(`/learn/check/${week.weekNumber}`)}
                    accessibilityRole="button"
                    testID={`week-${week.weekNumber}-check`}
                    hitSlop={6}
                  >
                    <Text
                      style={[
                        typography['body-s'],
                        { color: done ? colors['daun-deep'] : colors['air-deep'] },
                      ]}
                    >
                      {done ? `${t.checkin.statusDone} ✓` : `${t.checkin.statusNotDone} · ${t.checkin.promptCta}`}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The current week first, then the rest in order. */
function ordered(weeks: Week[], programme: Parameters<typeof weekAccess>[1]) {
  const withAccess = weeks.map((week) => ({ week, access: weekAccess(week.weekNumber, programme) }));
  const current = withAccess.filter((w) => w.access.state === 'current');
  const rest = withAccess.filter((w) => w.access.state !== 'current');
  return [...current, ...rest] as { week: Week; access: WeekAccess }[];
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
