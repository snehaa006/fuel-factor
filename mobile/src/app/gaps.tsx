import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSidebar } from '@/components/app-sidebar';
import { GapReport } from '@/components/gap-report';
import { MascotBanner } from '@/components/mascot-banner';
import { PushButton } from '@/components/push-button';
import { SidebarButton } from '@/components/sidebar';
import { GAP_WINDOW_DAYS, useGaps } from '@/lib/use-gaps';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * The gap analysis: a fortnight of eating against the programme's own bands.
 *
 * This is the answer to "what does the app do with the data". Everything else
 * in the athlete's half is about one day -- the ring, the slots, the check-in.
 * A single day is the wrong unit for a gap: one low day is a Tuesday, eleven
 * low days out of fourteen is a finding, and only the second is worth a
 * coach's attention or a pitch slide.
 *
 * **It is the screen that makes the dietitian unnecessary, so it is careful
 * not to impersonate one.** Everything on it is either a figure read off the
 * log or a band printed in a deck, and the sentence under each chart counts
 * days rather than giving advice. "Eleven of fourteen days below the band, by
 * 84 g on average" is checkable; "you are not eating enough carbohydrate"
 * would be a nutrition instruction, and those live in the advice engine where
 * each one carries a rule code, a source and a review flag.
 *
 * **Nothing is hidden to make the charts look finished.** Days the programme's
 * rule cannot be applied to are drawn hollow and the reason is named. A chart
 * of fourteen solid bars assembled by quietly dropping the awkward four would
 * be the most convincing and least honest thing in the app.
 */
export default function Gaps() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const state = useGaps();
  const [menuOpen, setMenuOpen] = useState(false);

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  // Who this is belongs to `/`, which is the one place that decides it.
  if (state.status === 'needs-onboarding') return <Redirect href="/" />;

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <View style={{ padding: spacing['space-6'], gap: spacing['space-2'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>
            {t.gaps.couldNotLoad}
          </Text>
          <Text
            testID="gaps-error"
            style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}
          >
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { analysis } = state;
  const anyJudged = analysis.gaps.some((g) => g.judged > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <View style={styles.header}>
          <SidebarButton onPress={() => setMenuOpen(true)} testID="menu" />
          <View>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>
              {t.gaps.lastDays(GAP_WINDOW_DAYS)}
            </Text>
            <Text style={[typography['display-l'], { color: colors.ink }]}>{t.gaps.title}</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing['space-4'] }}>
          {/* The mascot stays on the app's own side of the line: it explains
              the chart, never what the chart means. The band and what it is
              are plain text, in the legend and under each chart. */}
          <MascotBanner
            pose={anyJudged ? 'think' : 'float'}
            eyebrow={anyJudged ? t.gaps.whatYourLogShows : t.gaps.nothingToShow}
            message={
              anyJudged
                ? t.gaps.everyBar
                : t.gaps.logAFewDays
            }
            testID="gaps-mascot"
          />
        </View>

        <GapReport analysis={analysis} reader="athlete" testID="gaps" />

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          <PushButton
            label={t.gaps.baselineAgainstNow}
            variant="ghost"
            fullWidth
            testID="gaps-progress"
            onPress={() => router.push('/progress')}
          />
          <PushButton
            label={t.gaps.backToToday}
            variant="ghost"
            fullWidth
            testID="gaps-today"
            onPress={() => router.replace('/today')}
          />
        </View>
      </ScrollView>

      <AppSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t.gaps.title}
        current="gaps"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
