import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MascotBanner } from '@/components/mascot-banner';
import { MetricCompare } from '@/components/metric-compare';
import { PushButton } from '@/components/push-button';
import { progressCue } from '@/lib/mascot-copy';
import { useProgress } from '@/lib/use-progress';
import { useStrings } from '@/i18n';
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
  const t = useStrings();
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
            {t.progress.couldNotLoad}
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
          accessibilityLabel={t.learn.backToToday}
          testID="progress-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.learn.todayCaps}</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {t.progress.title}
        </Text>
        <View testID="progress-intro" style={{ marginTop: spacing['space-4'] }}>
          <MascotBanner
            pose={progressCue(t).pose}
            message={progressCue(t).message}
            eyebrow={progressCue(t).eyebrow}
            motion={progressCue(t).motion}
            testID="progress-mascot"
          />
        </View>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {progress.metrics.map((metric) => (
            <MetricCompare key={metric.key} metric={metric} testID={`metric-${metric.key}`} />
          ))}
        </View>

        {/* Where the Week 0 / Week 4 figures are entered and compared. */}
        <View style={{ marginTop: spacing['space-6'] }}>
          <PushButton
            label={t.progress.assessmentsButton}
            variant="ghost"
            fullWidth
            testID="progress-assessments"
            onPress={() => router.push('/assessments')}
          />
        </View>

        {progress.assessments.length > 0 && (
          <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
            <Text style={[typography['heading-l'], { color: colors.ink }]}>{t.progress.fitnessTests}</Text>
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
                  {a.pre === null
                    ? t.progress.notMeasured
                    : t.progress.atBaseline(`${a.pre}${a.unit ? ` ${a.unit}` : ''}`)}
                  {' · '}
                  {a.post !== null
                    ? t.progress.now(`${a.post}${a.unit ? ` ${a.unit}` : ''}`)
                    : progress.postOpensOn
                      ? t.progress.retestedFrom(progress.postOpensOn)
                      : t.progress.notRemeasured}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
