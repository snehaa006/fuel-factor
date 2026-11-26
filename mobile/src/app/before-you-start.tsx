import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSidebar } from '@/components/app-sidebar';
import { shortDate } from '@/components/calendar';
import { MascotBanner } from '@/components/mascot-banner';
import { PushButton } from '@/components/push-button';
import { SidebarButton } from '@/components/sidebar';
import { isProgrammeOpen, waitingLine } from '@/lib/programme';
import { BASELINE_DAYS, positionInRound } from '@/lib/recall-window';
import { useProgramme } from '@/lib/use-programme';
import { useRecallStatus } from '@/lib/use-recall';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The athlete's app before day one: the baseline recall, and nothing else.
 *
 * "So what we did initially is we took a three-day recall already. A
 * three-day, so we've done our baseline. In every research, we have a
 * baseline, and then we have an intervention, and then we see the post
 * effects." The baseline is a thing that happens *before* the intervention,
 * and an app that opened logging, the ring and the streak the moment somebody
 * joined a squad made that impossible to hold to -- a baseline recall filled
 * on the fourth day of logging is not a baseline.
 *
 * So this is the whole app until the coach's date arrives. Three days to
 * fill, a line saying when everything else opens, and no ring, no streak, no
 * leaderboard and no lesson to start a habit the programme has not started.
 *
 * What it is careful not to be is a punishment screen. Nothing here says the
 * athlete is late or missing anything, because they are not: this is the
 * first job of the programme and they are doing it.
 */
export default function BeforeYouStart() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const programme = useProgramme();
  const recall = useRecallStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  // Coming back from a day's form, a day has been filled underneath this
  // screen. The first focus is the mount, which has just loaded.
  const mounted = useRef(false);
  const { reload } = recall;
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) reload();
      mounted.current = true;
    }, [reload])
  );

  if (programme.status === 'loading' || recall.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (programme.status === 'needs-onboarding' || recall.status === 'needs-onboarding') {
    return <Redirect href="/" />;
  }

  if (programme.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text
          testID="before-error"
          style={[
            typography['body-m'],
            { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' },
          ]}
        >
          {programme.message}
        </Text>
      </SafeAreaView>
    );
  }

  // The four weeks have started while this screen was the route -- a phone
  // left open overnight on day zero, or a coach who moved the date forward.
  if (isProgrammeOpen(programme.programme)) return <Redirect href="/today" />;

  const recorded = recall.status === 'ready' ? recall.days.map((d) => d.dayNumber) : [];
  const done = BASELINE_DAYS.filter((day) => recorded.includes(day)).length;
  const allIn = done === BASELINE_DAYS.length;
  const next = BASELINE_DAYS.find((day) => !recorded.includes(day)) ?? BASELINE_DAYS[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <View style={styles.header}>
          <SidebarButton onPress={() => setMenuOpen(true)} testID="menu" />
          <View>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>
              {(programme.teamName ?? t.beforeYouStart.yourSquad).toUpperCase()}
            </Text>
            <Text style={[typography['display-l'], { color: colors.ink }]}>{programme.name}</Text>
          </View>
        </View>

        {/* The countdown, stated plainly and without a number ticking on it.
            A day is the unit the programme runs in. */}
        <View
          testID="before-countdown"
          style={{
            backgroundColor: colors['langit-tint'],
            borderColor: colors.hairline,
            borderWidth: 1,
            borderRadius: radius['radius-lg'],
            padding: spacing['space-4'],
            marginTop: spacing['space-6'],
            gap: spacing['space-1'],
          }}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.beforeYouStart.title}</Text>
          <Text style={[typography['heading-l'], { color: colors.ink }]}>
            {waitingLine(programme.programme, t)}
          </Text>
        </View>

        <View style={{ marginTop: spacing['space-6'] }}>
          <MascotBanner
            pose={allIn ? 'best' : 'think'}
            eyebrow={allIn ? t.beforeYouStart.allIn : t.beforeYouStart.firstJob}
            message={
              allIn
                ? t.beforeYouStart.baselineDone
                : t.beforeYouStart.writeDown
            }
            testID="before-mascot"
          />
        </View>

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink }]}>
            {t.beforeYouStart.yourThreeDays}
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {t.recall.dayChoice}
          </Text>
          <Text testID="before-count" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
            {t.recall.daysIn(done, BASELINE_DAYS.length)}
          </Text>

          <View style={{ gap: spacing['space-2'] }}>
            {BASELINE_DAYS.map((day) => {
              const entry =
                recall.status === 'ready'
                  ? recall.days.find((d) => d.dayNumber === day)
                  : undefined;
              return (
                <Pressable
                  key={day}
                  onPress={() => router.push(`/recall/${day}`)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    entry
                      ? t.recall.dayAnswered(positionInRound(day))
                      : t.recall.dayNotAnswered(positionInRound(day))
                  }
                  testID={`before-day-${day}`}
                  style={({ pressed }) => [
                    styles.dayRow,
                    {
                      backgroundColor: pressed
                        ? colors['surface-sunken']
                        : entry
                          ? colors['daun-tint']
                          : colors['surface-raised'],
                      borderRadius: radius['radius-md'],
                      padding: spacing['space-3'],
                    },
                  ]}
                >
                  <Text style={[typography['body-m'], { color: colors.ink }]}>
                    {t.recall.day(positionInRound(day))}
                  </Text>
                  <Text
                    testID={`before-day-${day}-state`}
                    style={[
                      typography['body-s'],
                      { color: entry ? colors['daun-deep'] : colors['ink-muted'] },
                    ]}
                  >
                    {/* A row with no meal text is honest about it: only food
                        can go through the food database. */}
                    {entry === undefined
                      ? t.recall.notAnswered
                      : entry.hasMeals
                        ? entry.recallDate === null
                          ? t.recall.answered
                          : shortDate(entry.recallDate, t)
                        : t.recall.noMeals}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {recall.status === 'error' && (
          <Text
            testID="before-recall-error"
            style={[
              typography['body-m'],
              { color: colors['cabai-deep'], marginTop: spacing['space-4'] },
            ]}
          >
            {recall.message}
          </Text>
        )}

        {!allIn && (
          <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
            {/* All three in one sitting is the primary offer here, because
                before the programme starts there is no reason to spread them
                across three evenings -- they are three days already lived. */}
            <PushButton
              label={t.recall.fillAllThree}
              fullWidth
              testID="before-all"
              onPress={() => router.push('/recall/all')}
            />
            <PushButton
              label={t.beforeYouStart.justDay(positionInRound(next))}
              variant="ghost"
              fullWidth
              testID="before-next"
              onPress={() => router.push(`/recall/${next}`)}
            />
          </View>
        )}

      </ScrollView>

      <AppSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={programme.name}
        subtitle={programme.teamName ?? undefined}
        current="before"
        beforeStart
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
