import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWeeks } from '@/lib/use-learn';
import { useTheme } from '@/theme';

/**
 * The four weeks of the programme.
 *
 * Week 1 is written and the rest are not. A locked week shows its number and
 * nothing else -- no theme, no teaser, no "coming soon: protein" -- because
 * the programme has not said what weeks 2 to 4 are about and the app will not
 * guess on its behalf.
 */
export default function Learn() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const state = useWeeks();

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
            Could not load the programme
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          testID="learn-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← TODAY</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          Learn
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          Four weeks, one theme each.
        </Text>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {state.weeks.map((week) => (
            <Pressable
              key={week.weekNumber}
              disabled={!week.unlocked}
              onPress={() => router.push(`/learn/${week.weekNumber}`)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !week.unlocked }}
              accessibilityLabel={
                week.unlocked
                  ? `Week ${week.weekNumber}: ${week.theme ?? 'open'}`
                  : `Week ${week.weekNumber}, not written yet`
              }
              testID={`week-${week.weekNumber}`}
              style={{
                backgroundColor: week.unlocked ? colors['surface-raised'] : colors.locked,
                borderRadius: radius['radius-lg'],
                padding: spacing['space-4'],
                gap: spacing['space-1'],
              }}
            >
              <Text style={[typography.label, { color: colors['ink-muted'] }]}>
                WEEK {week.weekNumber}
              </Text>
              <Text
                style={[
                  typography['heading-l'],
                  { color: week.unlocked ? colors.ink : colors['ink-faint'] },
                ]}
              >
                {/* No theme invented for a week the programme has not written. */}
                {week.theme ?? 'Not written yet'}
              </Text>
              {week.unlocked && week.challenge !== null && (
                <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                  Challenge: {week.challenge}
                </Text>
              )}
            </Pressable>
          ))}
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
