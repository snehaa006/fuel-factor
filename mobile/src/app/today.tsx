import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSidebar } from '@/components/app-sidebar';
import { longDate } from '@/components/calendar';
import { MealChallengeCard } from '@/components/meal-challenge-card';
import { DayTypeSwitch } from '@/components/day-type-switch';
import { FactButton } from '@/components/did-you-know';
import { Mascot } from '@/components/mascot';
import { NudgeStack } from '@/components/nudge-stack';
import { FuelRing } from '@/components/fuel-ring';
import { MascotBanner } from '@/components/mascot-banner';
import { MealTimeline } from '@/components/meal-timeline';
import { ProteinBar } from '@/components/protein-bar';
import { ProgrammeGate } from '@/components/programme-gate';
import { PushButton } from '@/components/push-button';
import { RecallPrompt } from '@/components/recall-prompt';
import { SessionTimes } from '@/components/session-times';
import { SidebarButton } from '@/components/sidebar';
import { StreakChip } from '@/components/streak-chip';
import { StreakStrip } from '@/components/streak-strip';
import { ReflectionPrompt } from '@/components/reflection-prompt';
import { WeekCheckPrompt } from '@/components/week-check-prompt';
import { topNudges } from '@/lib/advice';
import { dayCue, finishedCue } from '@/lib/mascot-copy';
import { shiftDate } from '@/lib/clock';
import { programmeOver } from '@/lib/programme';
import { hasSession, nowMinutes } from '@/lib/session';
import { bestStreak, loggedToday, recentDays, streakLength } from '@/lib/streak';
import { hasSessionDay, PROTEIN_WEEK } from '@/lib/targets';
import { useMealChallenge } from '@/lib/use-meal-challenge';
import { useProgramme } from '@/lib/use-programme';
import { useRecallStatus } from '@/lib/use-recall';
import { useToday } from '@/lib/use-today';
import type { AdviceRule } from '@/lib/advice';
import type { ProgrammeState } from '@/lib/programme';
import type { TodayData } from '@/lib/today';
import type { DayType } from '@/lib/targets';
import type { TrainingSession } from '@/lib/session';
import type { MealChallengeState } from '@/lib/use-meal-challenge';
import type { RecallStatus } from '@/lib/use-recall';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The athlete's day.
 *
 * It lived at `/` and was the first thing the app rendered to anybody. That is
 * what made the two halves feel like one undivided app: a coach who signed in
 * landed here, on an athlete's meals and streak, because a coach can read
 * their squad's participant rows and the screen took the first one it was
 * handed. Routing by role happens at `/` now, and this screen is only ever
 * reached as the athlete it belongs to.
 */
function TodayScreen() {
  const state = useToday();
  const recall = useRecallStatus();
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const [focusCount, setFocusCount] = useState(0);
  const challenge = useMealChallenge(undefined, focusCount);
  const programmeStatus = useProgramme();
  const programme = programmeStatus.status === 'ready' ? programmeStatus.programme : null;

  // Coming back from the logger, the day has changed underneath this screen.
  // The first focus is the mount, which has just loaded, so it is skipped.
  const mounted = useRef(false);
  const { reload } = state;
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) {
        reload();
        setFocusCount((n) => n + 1);
      }
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

  // Reached directly without an athlete behind the session -- a deep link, or
  // a restored route after signing out. `/` sorts out which gate that means.
  if (state.status === 'needs-onboarding') {
    return <Redirect href="/" />;
  }

  if (state.status === 'error') {
    return message(t.today.couldNotLoad, state.message);
  }

  return (
    <TodayView
      data={state.data}
      rules={state.rules}
      date={state.date}
      programme={programme}
      recall={recall}
      challenge={challenge}
      onChangeDayType={state.changeDayType}
      onChangeSession={state.changeSession}
    />
  );
}

export type TodayViewProps = {
  data: TodayData;
  rules: AdviceRule[];
  date: string;
  programme: ProgrammeState | null;
  recall: RecallStatus;
  challenge: MealChallengeState;
  onChangeDayType: (next: DayType) => void;
  onChangeSession: (next: TrainingSession) => void;
};

/**
 * What Today draws, given what it loaded. Separate from the loading so the
 * screen can be drawn from fixed data -- in a test, or a design preview.
 */
export function TodayView({
  data,
  rules,
  date,
  programme,
  recall,
  challenge,
  onChangeDayType,
  onChangeSession,
}: TodayViewProps) {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const [menuOpen, setMenuOpen] = useState(false);
  const { summary } = data;

  // Day 29 onwards: the four weeks are over, and so is the daily logging. No
  // meals, no evening check-in, no streak to keep, no challenge or advice --
  // the athletes are not logging any more, so the app does not ask them to.
  // What is left is what the programme still collects after the four weeks:
  // the follow-up food recall, week 4's check-in if it is not in, and the
  // reflection.
  if (programmeOver(programme)) {
    const finished = finishedCue(t);
    const endedOn = shiftDate(programme.startsOn, programme.of - 1);
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
          <View style={styles.title}>
            <SidebarButton onPress={() => setMenuOpen(true)} testID="menu" />
            <View>
              <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.today.today}</Text>
              <Text style={[typography['display-l'], { color: colors.ink }]}>{data.participantName}</Text>
            </View>
          </View>

          <View style={{ marginTop: spacing['space-6'] }}>
            <MascotBanner
              pose={finished.pose}
              message={finished.message}
              eyebrow={finished.eyebrow}
              motion={finished.motion}
              testID="day-mascot"
            />
          </View>
          <Text
            testID="programme-ended"
            style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-3'] }]}
          >
            {t.today.endedOn(longDate(endedOn, t))}
          </Text>

          <Text style={[typography.label, { color: colors['ink-muted'], marginTop: spacing['space-8'] }]}>
            {t.today.whatsLeft}
          </Text>
          {recall.status === 'ready' && recall.window.status === 'due' && (
            <View style={{ marginTop: spacing['space-3'] }}>
              <RecallPrompt
                window={recall.window}
                onPress={() =>
                  router.push(
                    recall.window.status === 'due' ? `/recall/${recall.window.dayNumber}` : '/recall'
                  )
                }
                testID="recall-prompt"
              />
            </View>
          )}
          {recall.status === 'ready' &&
            recall.window.status === 'none' &&
            recall.window.reason === 'complete' && (
              <Text
                testID="recall-all-in"
                style={[typography['body-m'], { color: colors['daun-deep'], marginTop: spacing['space-3'] }]}
              >
                {t.today.recallAllIn}
              </Text>
            )}
          <View style={{ marginTop: spacing['space-3'] }}>
            <WeekCheckPrompt
              programme={programme}
              participantId={data.participantId}
              onOpen={(week) => router.push(`/learn/check/${week}`)}
            />
          </View>
          <View style={{ marginTop: spacing['space-3'] }}>
            <ReflectionPrompt
              programme={programme}
              participantId={data.participantId}
              onOpen={() => router.push('/reflection')}
            />
          </View>

          <View style={{ marginTop: spacing['space-8'] }}>
            <PushButton
              label={t.today.seeYourWeeks}
              fullWidth
              testID="see-progress"
              onPress={() => router.push('/progress')}
            />
          </View>
        </ScrollView>

        <AppSidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={data.participantName}
          current="today"
        />
      </SafeAreaView>
    );
  }

  const streak = streakLength(data.activeDates, date);
  const best = bestStreak(data.activeDates, date);
  const week = recentDays(data.activeDates, date);
  const now = nowMinutes();
  // Which week of the programme today is, so week 2's protein lesson and its
  // advice arrive with week 2 and not before.
  const programmeWeek = challenge.status === 'ready' ? challenge.programmeWeek : 1;
  const nudges = topNudges(summary, rules, now, undefined, programmeWeek);
  // Counts slots filled, never what filled them.
  const cue = dayCue(summary.slots.filter((slot) => slot.logged).length, summary.slots.length, t);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        {/* Name on the left; the fun fact's bulb and the streak on the right. */}
        <View style={styles.header}>
          <View style={[styles.title, { flex: 1 }]}>
            <SidebarButton onPress={() => setMenuOpen(true)} testID="menu" />
            <View style={{ flexShrink: 1 }}>
              <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.today.today}</Text>
              <Text style={[typography['display-l'], { color: colors.ink }]} numberOfLines={1}>
                {data.participantName}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <FactButton programme={programme} />
          </View>
        </View>

        {/* One friendly card: the astronaut, the day's line, and the week's
            streak underneath -- what were three separate blocks. */}
        <View
          testID="day-hero"
          style={[
            styles.hero,
            {
              backgroundColor: colors['surface-raised'],
              borderRadius: 20,
              padding: spacing['space-4'],
              marginTop: spacing['space-4'],
              gap: spacing['space-3'],
            },
          ]}
        >
          <View style={styles.heroTop}>
            <Mascot pose={cue.pose} size={92} motion={cue.motion} testID="day-mascot" />
            <View style={{ flex: 1, gap: 2 }}>
              {cue.eyebrow !== undefined && (
                <Text style={[typography.label, { color: colors['pisang-deep'] }]}>{cue.eyebrow}</Text>
              )}
              <Text style={[typography['body-l'], { color: colors.ink }]}>{cue.message}</Text>
            </View>
          </View>
          <StreakStrip days={week} testID="streak-strip" />
          <View style={styles.heroFoot}>
            <StreakChip days={streak} lit={loggedToday(data.activeDates, date)} testID="streak" />
            {best > streak && (
              <Text testID="streak-best" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                {t.today.bestSoFar(best)}
              </Text>
            )}
          </View>
        </View>

        {/* What the programme is asking for right now. The weekly check-in
            line is always here -- due, done, or the day it opens -- so it is
            never somewhere the athlete has to go looking for. The others show
            only when they are due, and take no space when they are not. */}
        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
          <WeekCheckPrompt
            programme={programme}
            participantId={data.participantId}
            onOpen={(n) => router.push(`/learn/check/${n}`)}
          />
          {recall.status === 'ready' && recall.window.status === 'due' && (
            <RecallPrompt
              window={recall.window}
              onPress={() =>
                router.push(
                  recall.window.status === 'due' ? `/recall/${recall.window.dayNumber}` : '/recall'
                )
              }
              testID="recall-prompt"
            />
          )}
          <ReflectionPrompt
            programme={programme}
            participantId={data.participantId}
            onOpen={() => router.push('/reflection')}
          />
        </View>

        <View style={{ marginTop: spacing['space-6'] }}>
          <DayTypeSwitch value={summary.dayType} onChange={onChangeDayType} testID="day-type" />
        </View>

        {/* A training or match day, or any day that already has a session recorded.
            The second half matters: switching to Rest must not strand a
            session on the row with no way left to clear it. */}
        {(hasSessionDay(summary.dayType) || hasSession(summary.session)) && (
          <View style={{ marginTop: spacing['space-3'] }}>
            <SessionTimes value={summary.session} onChange={onChangeSession} now={now} testID="session" />
          </View>
        )}

        <View style={{ marginTop: spacing['space-6'], alignItems: 'center' }}>
          <FuelRing
            eaten={summary.carbsEaten}
            band={summary.band}
            itemsWithoutFigures={summary.itemsWithoutFigures}
            testID="fuel-ring"
          />
        </View>

        {programmeWeek >= PROTEIN_WEEK && (
          <View style={{ marginTop: spacing['space-4'] }}>
            <ProteinBar
              eaten={summary.proteinEaten}
              band={summary.proteinBand}
              itemsWithoutFigures={summary.itemsWithoutProtein}
              testID="protein-bar"
            />
          </View>
        )}

        {/* The day's one job, straight after the numbers it moves. */}
        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink }]}>{t.today.meals}</Text>
          <MealTimeline
            slots={summary.slots}
            onPressSlot={(s) => router.push(`/log/${s.slot}`)}
            testID="timeline"
          />
        </View>

        <View style={[styles.actions, { marginTop: spacing['space-4'], gap: spacing['space-3'] }]}>
          <View style={{ flex: 1 }}>
            <PushButton
              label={t.today.logMeal}
              fullWidth
              testID="log-meal"
              onPress={() =>
                router.push(`/log/${(summary.slots.find((s) => !s.logged) ?? summary.slots[0]).slot}`)
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <PushButton
              label={t.today.checkIn}
              variant="success"
              fullWidth
              testID="check-in"
              onPress={() => router.push('/check-in')}
            />
          </View>
        </View>

        {/* The advice, one card at a time. */}
        {nudges.length > 0 && (
          <View style={{ marginTop: spacing['space-8'] }}>
            <NudgeStack nudges={nudges} />
          </View>
        )}

        {/* This week's challenge, read off the meals rather than ticked.
            Shown while its week is running; Learn keeps it afterwards. */}
        {challenge.status === 'ready' &&
          challenge.week !== null &&
          challenge.week.phase === 'running' && (
            <View style={{ marginTop: spacing['space-6'] }}>
              <MealChallengeCard week={challenge.week} testID="meal-challenge" />
            </View>
          )}

        {/* The sheet names a DQ Score /12 and states no formula yet. The card
            appears once there is a score; until then it would only say so. */}
        {summary.dqScore !== null && (
          <View
            style={[
              styles.dq,
              {
                backgroundColor: colors['kecap-tint'],
                borderRadius: 16,
                padding: spacing['space-4'],
                marginTop: spacing['space-6'],
              },
            ]}
          >
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.today.dqScore}</Text>
            <Text testID="dq-score" style={[typography['heading-m'], { color: colors['kecap-deep'] }]}>
              {summary.dqScore} / 12
            </Text>
          </View>
        )}
      </ScrollView>

      <AppSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={data.participantName}
        current="today"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hero: { width: '100%' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row' },
  dq: { gap: 4 },
});

/**
 * Today belongs to the four weeks, so it opens with them. Before day one
 * the athlete has the baseline recall and nothing else.
 */
export default function Today() {
  return (
    <ProgrammeGate>
      <TodayScreen />
    </ProgrammeGate>
  );
}
