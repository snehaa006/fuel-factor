import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MascotBanner } from '@/components/mascot-banner';
import { learnCue } from '@/lib/mascot-copy';
import { useWeeks } from '@/lib/use-learn';
import { useStrings } from '@/i18n';
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
  const t = useStrings();
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
            {t.learn.couldNotLoad}
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
          accessibilityLabel={t.learn.backToToday}
          testID="learn-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.learn.todayCaps}</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {t.learn.title}
        </Text>
        <View style={{ marginTop: spacing['space-4'] }}>
          <MascotBanner
            pose={learnCue(t).pose}
            message={learnCue(t).message}
            eyebrow={learnCue(t).eyebrow}
            motion={learnCue(t).motion}
            testID="learn-mascot"
          />
        </View>

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
                  ? t.learn.weekOpen(week.weekNumber, week.theme)
                  : t.learn.weekNotWritten(week.weekNumber)
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
                {t.learn.weekCaps(week.weekNumber)}
              </Text>
              <Text
                style={[
                  typography['heading-l'],
                  { color: week.unlocked ? colors.ink : colors['ink-faint'] },
                ]}
              >
                {/* No theme invented for a week the programme has not written. */}
                {week.theme ?? t.learn.notWrittenYet}
              </Text>
              {week.unlocked && week.challenge !== null && (
                <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                  {t.learn.challenge(week.challenge)}
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
