import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentPanel } from '@/components/assessment-panel';
import { OPEN_BOTH_FOR_TESTING, phaseAccess, withRecallFill } from '@/lib/assessments';
import { useAccount } from '@/lib/use-account';
import { useSquadAssessments } from '@/lib/use-assessments';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The squad's ASSESSMENTS, for the coach who runs the tests: pick an athlete,
 * enter their Week 0 or Week 4 figures, and see the whole squad side by side
 * on the COMPARISON tab's layout.
 */
export default function CoachAssessments() {
  const { colors } = useTheme();
  const account = useAccount();

  if (account.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }
  if (account.status === 'ready' && account.account.role === 'signed-out') {
    return <Redirect href="/coach/account" />;
  }
  // An athlete has their own screen for their own figures.
  if (account.status === 'ready' && account.account.role === 'athlete') {
    return <Redirect href="/assessments" />;
  }
  return <SquadAssessments />;
}

function SquadAssessments() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const state = useSquadAssessments();
  const [selected, setSelected] = useState<string | null>(null);

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
        <Text
          testID="coach-assessments-error"
          style={[typography['body-m'], { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' }]}
        >
          {state.message}
        </Text>
      </SafeAreaView>
    );
  }

  const athleteId = selected ?? state.athletes[0]?.participantId ?? null;
  const athlete = state.athletes.find((a) => a.participantId === athleteId) ?? null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="coach-assessments-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {t.assess.title}
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}>
          {t.assess.coachLead}
        </Text>
        {OPEN_BOTH_FOR_TESTING && (
          <Text style={[typography['body-s'], { color: colors['pisang-deep'], marginTop: spacing['space-2'] }]}>
            {t.assess.testingMode}
          </Text>
        )}

        {state.athletes.length === 0 ? (
          <Text
            testID="coach-assessments-empty"
            style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-6'] }]}
          >
            {t.assess.noAthletes}
          </Text>
        ) : (
          <>
            <Text style={[typography.label, { color: colors['ink-muted'], marginTop: spacing['space-6'] }]}>
              {t.assess.athleteCaps}
            </Text>
            <View style={[styles.chips, { marginTop: spacing['space-2'], gap: spacing['space-2'] }]}>
              {state.athletes.map((a) => {
                const on = a.participantId === athleteId;
                return (
                  <Pressable
                    key={a.participantId}
                    onPress={() => setSelected(a.participantId)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    testID={`coach-assessments-athlete-${a.participantId}`}
                    style={{
                      backgroundColor: on ? colors.pisang : colors['surface-sunken'],
                      borderRadius: radius['radius-pill'],
                      paddingHorizontal: spacing['space-4'],
                      paddingVertical: spacing['space-2'],
                    }}
                  >
                    <Text style={[typography.label, { color: on ? colors['on-bright'] : colors.ink }]}>
                      {a.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {athlete !== null && (
              <View style={{ marginTop: spacing['space-6'] }}>
                <AssessmentPanel
                  participantId={athlete.participantId}
                  pairs={withRecallFill(
                    state.pairs[athlete.participantId] ?? {},
                    state.fills[athlete.participantId] ?? { pre: {}, post: {} }
                  )}
                  fill={state.fills[athlete.participantId]}
                  access={{
                    pre: phaseAccess('pre', state.programme, undefined, t),
                    post: phaseAccess('post', state.programme, undefined, t),
                  }}
                  onSave={(phase, values) => state.save(athlete.participantId, phase, values)}
                  comparison={state.athletes.map((a) => ({
                    participantId: a.participantId,
                    name: a.name,
                    pairs: withRecallFill(
                      state.pairs[a.participantId] ?? {},
                      state.fills[a.participantId] ?? { pre: {}, post: {} }
                    ),
                  }))}
                  showNames
                  testID="coach-assessments"
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
