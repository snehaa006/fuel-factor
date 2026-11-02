import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentPanel } from '@/components/assessment-panel';
import { OPEN_BOTH_FOR_TESTING, phaseAccess } from '@/lib/assessments';
import { useMyAssessments } from '@/lib/use-assessments';
import { useTheme } from '@/theme';

/**
 * The athlete's own ASSESSMENTS: Week 0 at baseline, Week 4 at follow-up, and
 * the before-and-after comparison with Δ worked out.
 */
export default function AssessmentsScreen() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const state = useMyAssessments();

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'needs-onboarding') return <Redirect href="/" />;

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text
          testID="assessments-error"
          style={[typography['body-m'], { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' }]}
        >
          {state.message}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="assessments-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          Assessments
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}>
          Your baseline (Week 0) and follow-up (Week 4) measures. Leave anything you did not
          measure empty.
        </Text>
        {OPEN_BOTH_FOR_TESTING && (
          <Text
            testID="assessments-testing"
            style={[typography['body-s'], { color: colors['pisang-deep'], marginTop: spacing['space-2'] }]}
          >
            Testing mode: Week 4 is open now instead of in the programme’s fourth week.
          </Text>
        )}

        <View style={{ marginTop: spacing['space-6'] }}>
          <AssessmentPanel
            participantId={state.participantId}
            pairs={state.pairs}
            access={{
              pre: phaseAccess('pre', state.programme),
              post: phaseAccess('post', state.programme),
            }}
            onSave={(phase, values) => state.save(state.participantId, phase, values)}
            comparison={[{ participantId: state.participantId, name: state.name, pairs: state.pairs }]}
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
});
