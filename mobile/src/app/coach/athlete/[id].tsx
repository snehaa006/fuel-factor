import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GapReport } from '@/components/gap-report';
import { useAccount } from '@/lib/use-account';
import { GAP_WINDOW_DAYS, useGaps } from '@/lib/use-gaps';
import { useTheme } from '@/theme';

/**
 * One athlete's fuel gaps, as their coach sees them.
 *
 * The consent screen tells every athlete that Fuel Factor "shows you and your
 * coach where your fuel gaps are". The athlete half had the charts; the coach
 * half had a one-line count per athlete and no way to see the days behind it.
 * This is that view: the same fortnight, the same bars, the same bands, drawn
 * by the same component as the athlete's own screen so the two can never
 * disagree about a day.
 *
 * It is the coach-side answer to "what does the app do with the data": a
 * squad's eating against the programme's targets, athlete by athlete, without
 * a dietitian reading each log.
 *
 * Who may open it is the same rule as the dashboard: a coach account. An
 * athlete is handed back to `/`, and a coach asking about somebody outside
 * their squad gets no row from the database -- row level security answers
 * that, not this screen -- and is told so.
 */
export default function CoachAthleteGaps() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccount();
  const { colors, spacing, typography } = useTheme();

  if (account.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (account.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text
          testID="coach-gaps-account-error"
          style={[
            typography['body-m'],
            { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' },
          ]}
        >
          {account.message}
        </Text>
      </SafeAreaView>
    );
  }

  if (account.account.role === 'signed-out') return <Redirect href="/coach/account" />;
  // An athlete never renders a coach screen; `/` sends them to their own day.
  if (account.account.role === 'athlete') return <Redirect href="/" />;

  return <AthleteGaps participantId={id} />;
}

/** Split out so its queries only ever run for an account allowed to make them. */
function AthleteGaps({ participantId }: { participantId: string }) {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const state = useGaps(participantId);

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/coach'))}
      accessibilityRole="button"
      accessibilityLabel="Back to the squad"
      testID="coach-gaps-back"
    >
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>← SQUAD</Text>
    </Pressable>
  );

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error' || state.status === 'needs-onboarding') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
          {back}
          <Text
            testID="coach-gaps-error"
            style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-6'] }]}
          >
            {state.status === 'error'
              ? state.message
              : 'This athlete is not on your squad, or their record could not be read.'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { analysis } = state;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        {back}
        <View style={{ marginTop: spacing['space-2'] }}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>
            FUEL GAPS · LAST {GAP_WINDOW_DAYS} DAYS
          </Text>
          <Text testID="coach-gaps-name" style={[typography['display-l'], { color: colors.ink }]}>
            {analysis.athleteName ?? 'Athlete'}
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
            What they logged against the programme&apos;s own targets. Every bar is one day.
          </Text>
        </View>

        <GapReport analysis={analysis} reader="coach" testID="coach-gaps" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
