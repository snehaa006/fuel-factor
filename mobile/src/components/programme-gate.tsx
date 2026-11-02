import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isProgrammeOpen } from '@/lib/programme';
import { useProgramme } from '@/lib/use-programme';
import { useTheme } from '@/theme';

/**
 * Nothing behind this renders until the programme has started.
 *
 * Wrapped around the screens that belong to the four weeks -- Today, the
 * logger, the evening check-in -- rather than checked inside each of them, so
 * the rule is written once and a new screen joins it by being wrapped.
 *
 * The recall is deliberately not behind it. The three baseline days are the
 * one thing that has to happen *before* day one, and gating them behind day
 * one would make the baseline impossible to collect.
 *
 * A redirect, not a message: an athlete who taps a stale link or whose phone
 * restored yesterday's route should land on the screen that tells them when
 * the programme opens, not on a dead end inside a screen they cannot use.
 */
export function ProgrammeGate({ children }: { children: React.ReactNode }) {
  const state = useProgramme();
  const { colors } = useTheme();

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  // Which gate that means is `/`'s question, and it asks it in one place.
  if (state.status === 'needs-onboarding') return <Redirect href="/" />;

  // A failure here must not lock an athlete out of a programme that is
  // running. The screen behind loads its own data and reports its own
  // failure, which is the honest place for this one to surface too.
  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <View style={styles.pad}>
          <Text testID="gate-error" style={{ color: colors['cabai-deep'], textAlign: 'center' }}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isProgrammeOpen(state.programme)) return <Redirect href="/before-you-start" />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  pad: { padding: 24 },
});
