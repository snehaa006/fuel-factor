import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgrammeGate } from '@/components/programme-gate';
import { useAccount } from '@/lib/use-account';
import { useTheme } from '@/theme';

/**
 * The front door, and the only screen that decides who sees what.
 *
 * Before this, `/` *was* the athlete's Today screen. Nothing asked what kind
 * of account had opened the app, so the two halves were separated by a menu
 * item and a hope:
 *
 * - A coach who signed in landed on an athlete's day. Not a stranger's -- one
 *   of their own squad's, because `can_see_participant` is true for every
 *   athlete a coach coaches, so the athlete query happily returned a row. The
 *   dashboard was somewhere else entirely, behind a sidebar entry.
 * - An athlete's sidebar offered "Coach", which walked them to a code box.
 *   They could not get in, but the app was still asking them to try.
 * - Signing out was not possible from anywhere, so a device was whoever it
 *   first became.
 *
 * Now there is one question -- `resolveAccount` -- asked in one place, and
 * three destinations that do not overlap. A coach never renders an athlete
 * screen and an athlete never renders a coach one.
 */
export default function Entry() {
  const state = useAccount();
  const { colors, spacing, typography } = useTheme();

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
            Could not sign you in
          </Text>
          <Text
            testID="entry-error"
            style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}
          >
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  switch (state.account.role) {
    case 'signed-out':
      return <Redirect href="/sign-in" />;
    case 'coach':
      // The coach's own home. It is not a tab on the athlete's app.
      return <Redirect href="/coach" />;
    case 'unlinked':
      // An account with no athlete behind it yet: consent, then the team code.
      return <Redirect href="/welcome" />;
    case 'athlete':
      // An athlete whose programme has not started yet has one screen, and
      // the gate is what knows which: it sends them to the baseline recall
      // and lets everyone else through to their day.
      return (
        <ProgrammeGate>
          <Redirect href="/today" />
        </ProgrammeGate>
      );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
});
