import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachSidebar } from '@/components/coach-sidebar';
import { PushButton } from '@/components/push-button';
import { SidebarButton } from '@/components/sidebar';
import { useAccount } from '@/lib/use-account';
import { useCoach } from '@/lib/use-coach';
import { useTheme } from '@/theme';
import type { CoachAthlete } from '@/lib/coach';

/**
 * The coach's home.
 *
 * The B2B hook: a roster, who logged today, breakfast frequency, where the
 * days landed against the programme's own carbohydrate band, and two flags.
 * It runs on web from this same codebase (`npm run web`), which is where a
 * coach will actually open it.
 *
 * The roster is alphabetical and stays that way. Sorting a list of named
 * minors by a compliance figure turns a roster into a league table of who is
 * eating properly, which is not what a coach needs and not something to hand
 * a school.
 *
 * Both flags quote the threshold they fired on, so a coach can check the app
 * rather than take its word, and neither is a diagnosis -- "three recorded
 * days below the band" is an observation about logs.
 *
 * ## Who gets in
 *
 * This screen used to open its code box to anybody who tapped "Coach" in the
 * athlete's menu -- no account, no session, no question asked. The code box
 * could not actually let them in, since `claim_coach` refuses a device that
 * holds an athlete, but asking a 15 year old for a coach code is still the
 * app inviting them to try. The guard below answers first:
 *
 * - no session at all goes to the coach sign-in, not to a code box;
 * - an athlete is told plainly that this is the coach's half and sent back;
 * - an account that is neither gets the code box and the "create a team"
 *   route, which is what a new coach actually needs.
 */
export default function Coach() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const account = useAccount();

  if (account.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (account.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text
          testID="coach-account-error"
          style={[
            typography['body-m'],
            { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' },
          ]}
        >
          {account.message}
        </Text>
      </SafeAreaView>
    );
  }

  // A coach signs in with an email. There is no anonymous way into this half.
  if (account.account.role === 'signed-out') {
    return <Redirect href="/coach/account" />;
  }

  // Said once, plainly, instead of a code box that was never going to open.
  if (account.account.role === 'athlete') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <View style={{ padding: spacing['space-6'], gap: spacing['space-3'], alignItems: 'center' }}>
          <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>
            This is the coach&apos;s side
          </Text>
          <Text
            testID="coach-is-athlete"
            style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}
          >
            You are signed in as an athlete. Coaches use a separate account, and your own logs are
            not shown here.
          </Text>
          <PushButton
            label="Back to my day"
            testID="coach-back-to-today"
            onPress={() => router.replace('/today')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return <CoachDashboard />;
}

/**
 * Split out so its queries only ever run for an account that is allowed to
 * make them. Called from the guard above and nowhere else.
 */
function CoachDashboard() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const state = useCoach();
  const [code, setCode] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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
            Could not load the squad
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'needs-code') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
          <Text style={[typography['display-l'], { color: colors.ink }]}>Coach</Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
            {/* Said plainly: the athletes' code does not open this. */}
            Enter your coach code. It is not the same code the squad uses to join.
          </Text>

          {/* The route for a coach who owns the squad rather than joining
              somebody else's. */}
          <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
            <PushButton
              label="Create a team instead"
              variant="ghost"
              fullWidth
              testID="coach-create-team"
              onPress={() => router.push('/coach/team')}
            />
            <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
              A coach code joins a team somebody else made. Creating your own makes you its owner.
            </Text>
          </View>

          <TextInput
            testID="coach-code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="COACH01"
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel="Coach code"
            style={[
              typography['heading-m'],
              {
                color: colors.ink,
                backgroundColor: colors['surface-sunken'],
                borderRadius: radius['radius-lg'],
                padding: spacing['space-4'],
                marginTop: spacing['space-6'],
              },
            ]}
          />

          {state.joinError !== null && (
            <Text
              testID="coach-join-error"
              style={[
                typography['body-s'],
                { color: colors['cabai-deep'], marginTop: spacing['space-2'] },
              ]}
            >
              {state.joinError}
            </Text>
          )}

          <View style={{ marginTop: spacing['space-6'] }}>
            <PushButton
              label={state.joining ? 'Joining…' : 'Open the dashboard'}
              fullWidth
              disabled={code.trim() === '' || state.joining}
              testID="coach-join"
              onPress={() => state.join(code)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { view } = state;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <View style={styles.title}>
          <SidebarButton onPress={() => setMenuOpen(true)} testID="coach-menu" />
          <View>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>COACH</Text>
            <Text style={[typography['display-l'], { color: colors.ink }]}>
              {view.teamName ?? 'Your squad'}
            </Text>
          </View>
        </View>

        <Text
          testID="coach-today"
          style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}
        >
          {view.loggedToday} of {view.athletes.length} logged today · last {view.windowDays} days
        </Text>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {view.athletes.length === 0 ? (
            <Text testID="coach-empty" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              No athletes on this team yet.
            </Text>
          ) : (
            view.athletes.map((athlete) => (
              <AthleteCard key={athlete.participantId} athlete={athlete} />
            ))
          )}
        </View>

        <Text
          testID="coach-basis"
          style={[
            typography['body-s'],
            { color: colors['ink-faint'], marginTop: spacing['space-8'], textAlign: 'center' },
          ]}
        >
          Flags come from the programme&apos;s own thresholds, not the app&apos;s. Challenge photos
          are not shown here.
        </Text>
      </ScrollView>

      <CoachSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={view.teamName ?? 'Your squad'}
        current="dashboard"
      />
    </SafeAreaView>
  );
}

function AthleteCard({ athlete }: { athlete: CoachAthlete }) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID={`athlete-${athlete.participantId}`}
      style={{
        backgroundColor: colors['surface-raised'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-4'],
        gap: spacing['space-2'],
      }}
    >
      <View style={styles.header}>
        <Text style={[typography['heading-m'], { color: colors.ink }]}>{athlete.name}</Text>
        {/* The live bit a coach opens this for. */}
        <View
          testID={`athlete-${athlete.participantId}-today`}
          style={[
            styles.dot,
            {
              borderRadius: radius['radius-pill'],
              backgroundColor: athlete.loggedToday ? colors.pisang : colors['surface-sunken'],
            },
          ]}
        />
      </View>

      <Text
        testID={`athlete-${athlete.participantId}-counts`}
        style={[typography['body-s'], { color: colors['ink-muted'] }]}
      >
        Logged {athlete.daysLogged} days · breakfast {athlete.breakfastDays} ·{' '}
        {/* Days that could be judged at all, stated, because two of the three
            athletes have an unconfirmed weight and without one there is no
            band to judge against. */}
        {athlete.daysWithBand === 0
          ? 'no day could be measured against the band'
          : `${athlete.insideBand} of ${athlete.daysWithBand} days inside the band`}
      </Text>

      {athlete.flags.map((flag) => (
        <View
          key={flag.code}
          testID={`athlete-${athlete.participantId}-flag-${flag.code}`}
          style={{
            backgroundColor: colors['cabai-tint'],
            borderRadius: radius['radius-md'],
            padding: spacing['space-3'],
            gap: 2,
          }}
        >
          <Text style={[typography.label, { color: colors['cabai-deep'] }]}>
            {flag.code === 'under_fuelling' ? 'UNDER-FUELLING' : 'HYDRATION'}
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{flag.detail}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 14, height: 14 },
});
