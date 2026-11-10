import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSidebar } from '@/components/app-sidebar';
import { GapBars } from '@/components/gap-bars';
import { MascotBanner } from '@/components/mascot-banner';
import { PushButton } from '@/components/push-button';
import { SidebarButton } from '@/components/sidebar';
import { GAP_WINDOW_DAYS, useGaps } from '@/lib/use-gaps';
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
  const { colors, radius, spacing, typography } = useTheme();
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
            Could not load your fuel gaps
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
  const logged = analysis.days.length;
  const anyJudged = analysis.gaps.some((g) => g.judged > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <View style={styles.header}>
          <SidebarButton onPress={() => setMenuOpen(true)} testID="menu" />
          <View>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>
              LAST {GAP_WINDOW_DAYS} DAYS
            </Text>
            <Text style={[typography['display-l'], { color: colors.ink }]}>Your fuel gaps</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing['space-4'] }}>
          {/* The mascot stays on the app's own side of the line: it explains
              the chart, never what the chart means. The band and what it is
              are plain text, in the legend and under each chart. */}
          <MascotBanner
            pose={anyJudged ? 'think' : 'float'}
            eyebrow={anyJudged ? 'WHAT YOUR LOG SHOWS' : 'NOTHING TO SHOW YET'}
            message={
              anyJudged
                ? 'Every bar is one day you logged.'
                : 'Log a few days and this fills in on its own.'
            }
            testID="gaps-mascot"
          />
        </View>

        <Text
          testID="gaps-window"
          style={[
            typography['body-s'],
            { color: colors['ink-muted'], marginTop: spacing['space-4'] },
          ]}
        >
          {logged === 0
            ? `No days logged between ${analysis.from} and ${analysis.to}.`
            : `${logged} ${logged === 1 ? 'day' : 'days'} logged between ${analysis.from} and ${analysis.to}.`}
        </Text>

        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
          {analysis.gaps.map((gap) => (
            <GapBars key={gap.nutrient} gap={gap} testID={`gap-${gap.nutrient}`} />
          ))}
        </View>

        {analysis.weightKg === null && (
          <Text
            testID="gaps-no-weight"
            style={[
              typography['body-m'],
              { color: colors['ink-muted'], marginTop: spacing['space-4'] },
            ]}
          >
            {/* Both bands are per kilogram, so without a weight there is no
                band to compare anything against. Said once, here, rather than
                under each chart. */}
            Both of the programme&apos;s bands are set per kilogram of body weight, and yours is
            not recorded yet. Ask your coach to add it and these charts fill in.
          </Text>
        )}

        {/* The legend, because three fills and a hollow bar is three things to
            learn and the charts are worth nothing if they are misread. */}
        <View
          style={{
            marginTop: spacing['space-6'],
            backgroundColor: colors['surface-raised'],
            borderRadius: radius['radius-lg'],
            padding: spacing['space-4'],
            gap: spacing['space-2'],
          }}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>READING THE CHARTS</Text>
          <Key colour={colors.daun} text="Inside the programme’s band" />
          <Key colour={colors.cabai} text="Below it" />
          <Key colour={colors.pisang} text="Above it" />
          <Key colour={null} text="Not enough recorded to say" />
        </View>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          <PushButton
            label="Baseline against now"
            variant="ghost"
            fullWidth
            testID="gaps-progress"
            onPress={() => router.push('/progress')}
          />
          <PushButton
            label="Back to today"
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
        title="Your fuel gaps"
        current="gaps"
      />
    </SafeAreaView>
  );
}

/** One row of the legend. A hollow swatch for the unjudged days. */
function Key({ colour, text }: { colour: string | null; text: string }) {
  const { colors, radius, typography } = useTheme();
  return (
    <View style={styles.key}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: radius['radius-sm'],
          backgroundColor: colour ?? 'transparent',
          borderWidth: colour === null ? 1.5 : 0,
          borderColor: colors['ink-faint'],
          borderStyle: colour === null ? 'dashed' : 'solid',
        }}
      />
      <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
