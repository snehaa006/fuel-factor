import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MascotBanner } from '@/components/mascot-banner';
import { MetricCompare } from '@/components/metric-compare';
import { PROGRESS_CUE } from '@/lib/mascot-copy';
import { useProgress } from '@/lib/use-progress';
import { useTheme } from '@/theme';

/**
 * Baseline against now.
 *
 * This is the screen that turns the study into the pitch, which is exactly
 * why it states what has not been measured as plainly as what has. Three of
 * the four measures have no baseline in the database today -- the three-day
 * recall holds them as free text that has not been exported, and fluid has
 * never been collected at all. Those gaps are findings of the programme's
 * own, not failures of the screen, and they are the argument for the app
 * existing.
 *
 * Nothing here says whether a change is good. The direction of better is a
 * nutrition judgement nobody has supplied.
 */
export default function ProgressScreen() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const state = useProgress();

  if (state.status === 'loading') {
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
            Could not load your progress
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { progress } = state;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          testID="progress-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← TODAY</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          Progress
        </Text>
        <View testID="progress-intro" style={{ marginTop: spacing['space-4'] }}>
          <MascotBanner
            pose={PROGRESS_CUE.pose}
            message={PROGRESS_CUE.message}
            eyebrow={PROGRESS_CUE.eyebrow}
            motion={PROGRESS_CUE.motion}
            testID="progress-mascot"
          />
        </View>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {progress.metrics.map((metric) => (
            <MetricCompare key={metric.key} metric={metric} testID={`metric-${metric.key}`} />
          ))}
        </View>

        {progress.assessments.length > 0 && (
          <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
            <Text style={[typography['heading-l'], { color: colors.ink }]}>Fitness tests</Text>
            {progress.assessments.map((a) => (
              <View
                key={a.measure}
                testID={`assessment-${a.measure}`}
                style={{
                  backgroundColor: colors['surface-raised'],
                  borderRadius: radius['radius-lg'],
                  padding: spacing['space-4'],
                  gap: 4,
                }}
              >
                <Text style={[typography['heading-m'], { color: colors.ink }]}>{a.measure}</Text>
                <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
                  {/* A test that has not been re-run says so. The December
                      recall is what fills the second half of this line. */}
                  {a.pre === null ? 'Not measured' : `${a.pre}${a.unit ? ` ${a.unit}` : ''} at baseline`}
                  {' · '}
                  {a.post === null
                    ? 'not re-measured yet'
                    : `${a.post}${a.unit ? ` ${a.unit}` : ''} now`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* The honest frame for everything above it. */}
        <Text
          testID="progress-basis"
          style={[
            typography['body-s'],
            { color: colors['ink-faint'], marginTop: spacing['space-8'], textAlign: 'center' },
          ]}
        >
          The app shows what was recorded and the change between. Whether a change is good is
          for the programme to say, not the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
