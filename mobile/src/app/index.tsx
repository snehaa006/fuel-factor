import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayTypeSwitch } from '@/components/day-type-switch';
import { FuelRing } from '@/components/fuel-ring';
import { MascotBanner } from '@/components/mascot-banner';
import { MealTimeline } from '@/components/meal-timeline';
import { NudgeCard } from '@/components/nudge-card';
import { PushButton } from '@/components/push-button';
import { SessionTimes } from '@/components/session-times';
import { StreakChip } from '@/components/streak-chip';
import { StreakStrip } from '@/components/streak-strip';
import { topNudges } from '@/lib/advice';
import { dayCue } from '@/lib/mascot-copy';
import { hasSession, nowMinutes } from '@/lib/session';
import { bestStreak, loggedToday, recentDays, streakLength } from '@/lib/streak';
import { useToday } from '@/lib/use-today';
import { useTheme } from '@/theme';

export default function Today() {
  const router = useRouter();
  const state = useToday();
  const { colors, spacing, typography } = useTheme();

  // Coming back from the logger, the day has changed underneath this screen.
  // The first focus is the mount, which has just loaded, so it is skipped.
  const mounted = useRef(false);
  const { reload } = state;
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) reload();
      mounted.current = true;
    }, [reload])
  );

  const message = (title: string, detail: string) => (
    <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
      <View style={{ padding: spacing['space-6'], gap: spacing['space-2'], alignItems: 'center' }}>
        <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>{title}</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
          {detail}
        </Text>
      </View>
    </SafeAreaView>
  );

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  // No session, or a session with no athlete claimed: both start at the gate,
  // which is also where consent is taken.
  if (state.status === 'needs-onboarding') {
    return <Redirect href="/welcome" />;
  }

  if (state.status === 'error') {
    return message('Could not load today', state.message);
  }

  const { data, rules, date } = state;
  const { summary } = data;
  const streak = streakLength(data.activeDates, date);
  const best = bestStreak(data.activeDates, date);
  const week = recentDays(data.activeDates, date);
  const now = nowMinutes();
  const nudges = topNudges(summary, rules, now);
  // Counts slots filled, never what filled them.
  const cue = dayCue(summary.slots.filter((slot) => slot.logged).length, summary.slots.length);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <View style={styles.header}>
          <View>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>TODAY</Text>
            <Text style={[typography['display-l'], { color: colors.ink }]}>{data.participantName}</Text>
          </View>
          <StreakChip days={streak} lit={loggedToday(data.activeDates, date)} testID="streak" />
        </View>

        {/* The chip gives the number, the strip gives its shape: a gap two
            days back is visible here and invisible in a count. */}
        <View
          style={[
            styles.streak,
            {
              backgroundColor: colors['surface-raised'],
              borderRadius: 16,
              padding: spacing['space-4'],
              marginTop: spacing['space-4'],
              gap: spacing['space-3'],
            },
          ]}
        >
          <StreakStrip days={week} testID="streak-strip" />
          {best > streak && (
            <Text
              testID="streak-best"
              style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}
            >
              Best so far: {best} days
            </Text>
          )}
        </View>

        <View style={{ marginTop: spacing['space-6'] }}>
          <MascotBanner
            pose={cue.pose}
            message={cue.message}
            eyebrow={cue.eyebrow}
            motion={cue.motion}
            testID="day-mascot"
          />
        </View>

        <View style={{ marginTop: spacing['space-6'] }}>
          <DayTypeSwitch value={summary.dayType} onChange={state.changeDayType} testID="day-type" />
        </View>

        {/* A training day, or any day that already has a session recorded.
            The second half matters: switching to Rest must not strand a
            session on the row with no way left to clear it. */}
        {(summary.dayType === 'training' || hasSession(summary.session)) && (
          <View style={{ marginTop: spacing['space-4'] }}>
            <SessionTimes
              value={summary.session}
              onChange={state.changeSession}
              now={now}
              testID="session"
            />
          </View>
        )}

        <View style={{ marginTop: spacing['space-8'], alignItems: 'center' }}>
          <FuelRing
            eaten={summary.carbsEaten}
            band={summary.band}
            itemsWithoutFigures={summary.itemsWithoutFigures}
            testID="fuel-ring"
          />
        </View>

        {nudges.length > 0 && (
          <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
            {nudges.map((nudge, i) => (
              <NudgeCard key={nudge.code} nudge={nudge} testID={i === 0 ? 'nudge' : `nudge-${i}`} />
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink }]}>Meals</Text>
          <MealTimeline
            slots={summary.slots}
            onPressSlot={(s) => router.push(`/log/${s.slot}`)}
            testID="timeline"
          />
        </View>

        {/* The sheet names a DQ Score /12 and states no formula, so the app
            shows the slot and leaves the number to the dietitian. */}
        <View
          style={[
            styles.dq,
            {
              backgroundColor: colors['kecap-tint'],
              borderRadius: 16,
              padding: spacing['space-4'],
              marginTop: spacing['space-8'],
            },
          ]}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>DIET QUALITY SCORE</Text>
          <Text testID="dq-score" style={[typography['heading-m'], { color: colors['kecap-deep'] }]}>
            {summary.dqScore === null ? 'Not scored yet' : `${summary.dqScore} / 12`}
          </Text>
        </View>

        <View style={{ marginTop: spacing['space-12'], gap: spacing['space-3'] }}>
          <PushButton
            label="Log a meal"
            fullWidth
            testID="log-meal"
            onPress={() =>
              router.push(`/log/${(summary.slots.find((s) => !s.logged) ?? summary.slots[0]).slot}`)
            }
          />
          <PushButton
            label="Evening check-in"
            variant="success"
            fullWidth
            testID="check-in"
            onPress={() => router.push('/check-in')}
          />
          <PushButton
            label="Learn"
            variant="ghost"
            fullWidth
            testID="learn"
            onPress={() => router.push('/learn')}
          />
          <PushButton
            label="Team"
            variant="ghost"
            fullWidth
            testID="team"
            onPress={() => router.push('/team')}
          />
          <PushButton
            label="Progress"
            variant="ghost"
            fullWidth
            testID="progress"
            onPress={() => router.push('/progress')}
          />
          {/* The dashboard is the coach's, and it asks for a coach code of its
              own. It sits here so a coach on a shared device can reach it;
              an athlete who taps it gets the code gate and nothing else. */}
          <PushButton
            label="Coach dashboard"
            variant="ghost"
            fullWidth
            testID="coach"
            onPress={() => router.push('/coach')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streak: { width: '100%' },
  dq: { gap: 4 },
});
