import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import {
  BASELINE_DAYS,
  DAY_CHOICE_GUIDANCE,
  FOLLOW_UP_DAYS,
  PROGRAMME_WEEKS,
  ROUND_LABEL,
  positionInRound,
  type RecallRound,
} from '@/lib/recall-window';
import { useRecallStatus } from '@/lib/use-recall';
import { useTheme } from '@/theme';

/**
 * The recall rounds, and which days are in.
 *
 * Two rounds of three days each, which is the programme's instrument and not
 * the app's: "we took a three-day recall already ... so we've done our
 * baseline", then four weeks later, "post one month, the app can prompt the
 * participant to try to fulfill the data again or food recalls".
 *
 * A day shows as done because a row exists for it, derived on read exactly as
 * the streak and the badges are. There is no "recall complete" flag to drift.
 */
export default function RecallIndex() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const state = useRecallStatus();

  // Coming back from a day's form, a round has gained a day underneath this
  // screen. The first focus is the mount, which has just loaded.
  const mounted = useRef(false);
  const { reload } = state;
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) reload();
      mounted.current = true;
    }, [reload])
  );

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'needs-onboarding') return <Redirect href="/welcome" />;

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" testID="recall-back">
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
    </Pressable>
  );

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
          {back}
          <Text
            testID="recall-error"
            style={[
              typography['body-m'],
              { color: colors['cabai-deep'], marginTop: spacing['space-6'] },
            ]}
          >
            {state.message}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const recorded = state.days.map((d) => d.dayNumber);
  const { window } = state;

  const round = (name: RecallRound, days: readonly number[], blurb: string) => {
    const done = days.filter((day) => recorded.includes(day)).length;
    // The follow-up is shut until the four weeks are up. Said with the date
    // rather than greyed out silently.
    const locked = name === 'follow-up' && window.status === 'waiting';

    return (
      <View
        key={name}
        testID={`round-${name}`}
        style={{
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        }}
      >
        <View>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>
            {ROUND_LABEL[name].toUpperCase()}
          </Text>
          <Text
            testID={`round-${name}-count`}
            style={[typography['heading-l'], { color: colors.ink }]}
          >
            {done} of {days.length} days
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{blurb}</Text>
        </View>

        {locked && window.status === 'waiting' ? (
          <Text testID={`round-${name}-locked`} style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            Opens on {window.opensOn}, {window.daysUntil}{' '}
            {window.daysUntil === 1 ? 'day' : 'days'} from now.
          </Text>
        ) : (
          <View style={{ gap: spacing['space-2'] }}>
            {days.map((day) => {
              const entry = state.days.find((d) => d.dayNumber === day);
              return (
                <Pressable
                  key={day}
                  onPress={() => router.push(`/recall/${day}`)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    entry
                      ? `Day ${positionInRound(day)}, answered. Open to change it.`
                      : `Day ${positionInRound(day)}, not answered yet`
                  }
                  testID={`recall-day-${day}`}
                  style={({ pressed }) => [
                    styles.dayRow,
                    {
                      backgroundColor: pressed
                        ? colors['surface-sunken']
                        : entry
                          ? colors['daun-tint']
                          : colors['surface-sunken'],
                      borderRadius: radius['radius-md'],
                      padding: spacing['space-3'],
                    },
                  ]}
                >
                  {/* Counted inside the round: the tracker's own day_number
                      carries on at 4 for the follow-up, and an athlete doing
                      three days should not be shown a "Day 4 of 3". */}
                  <Text style={[typography['body-m'], { color: colors.ink }]}>
                    Day {positionInRound(day)}
                  </Text>
                  <Text
                    testID={`recall-day-${day}-state`}
                    style={[
                      typography['body-s'],
                      { color: entry ? colors['daun-deep'] : colors['ink-muted'] },
                    ]}
                  >
                    {/* A row with no meal text is honest about it: the
                        baseline's nine days hold a urine reading and nothing
                        else, and only food can go through the food database. */}
                    {entry === undefined
                      ? 'Not answered'
                      : entry.hasMeals
                        ? (entry.recallDate ?? 'Answered')
                        : 'No meals recorded'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        {back}
        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          Food recall
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {DAY_CHOICE_GUIDANCE}
        </Text>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-4'] }}>
          {round(
            'baseline',
            BASELINE_DAYS,
            'Three days before the programme starts, so there is something to compare with later.'
          )}
          {round(
            'follow-up',
            FOLLOW_UP_DAYS,
            `Three more days, ${PROGRAMME_WEEKS} weeks in.`
          )}
        </View>

        {window.status === 'none' && window.reason === 'no-programme-date' && (
          <Text
            testID="recall-no-date"
            style={[
              typography['body-s'],
              { color: colors['ink-muted'], marginTop: spacing['space-6'] },
            ]}
          >
            Your coach has not set the programme&apos;s first day yet, so there is nothing to count
            four weeks from.
          </Text>
        )}

        {window.status === 'due' && (
          <View style={{ marginTop: spacing['space-8'] }}>
            <PushButton
              label={`Fill in day ${window.position}`}
              fullWidth
              testID="recall-next"
              onPress={() => router.push(`/recall/${window.dayNumber}`)}
            />
          </View>
        )}

        <Text
          testID="recall-basis"
          style={[
            typography['body-s'],
            { color: colors['ink-faint'], marginTop: spacing['space-8'], textAlign: 'center' },
          ]}
        >
          Three days at the start and three after four weeks is the programme&apos;s own design,
          not the app&apos;s.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
