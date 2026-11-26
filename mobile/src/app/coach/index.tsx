import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachSidebar } from '@/components/coach-sidebar';
import { PushButton } from '@/components/push-button';
import { SidebarButton } from '@/components/sidebar';
import { TeamCodeCard } from '@/components/team-code-card';
import { normaliseCodeText } from '@/lib/invite';
import { useAccount } from '@/lib/use-account';
import { useCoach } from '@/lib/use-coach';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';
import { DEHYDRATED_AT, UNDER_FUELLING_DAYS, type CoachAthlete } from '@/lib/coach';

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
  const t = useStrings();
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
            {t.coach.coachesSide}
          </Text>
          <Text
            testID="coach-is-athlete"
            style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}
          >
            {t.coach.signedInAsAthlete}
          </Text>
          <PushButton
            label={t.coach.backToMyDay}
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
  const t = useStrings();
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
            {t.coach.couldNotLoad}
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
          <Text style={[typography['display-l'], { color: colors.ink }]}>{t.coach.coach}</Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
            {/* Said plainly: the athletes' code does not open this. */}
            {t.coach.enterCode}
          </Text>

          {/* The route for a coach who owns the squad rather than joining
              somebody else's. */}
          <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
            <PushButton
              label={t.coach.createInstead}
              variant="ghost"
              fullWidth
              testID="coach-create-team"
              onPress={() => router.push('/coach/team')}
            />
          </View>

          <TextInput
            testID="coach-code"
            value={code}
            // Normalised here, not just asked of the keyboard: a coach opens
            // this on the web, where autoCapitalize does nothing at all.
            onChangeText={(text) => setCode(normaliseCodeText(text))}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="COACH01"
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel={t.coach.coachCodeLabel}
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
              label={state.joining ? t.coach.joining : t.coach.openDashboard}
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
          {/* Shrinks beside the menu button so a long team name wraps onto a
              second line instead of running off the screen. */}
          <View style={styles.titleText}>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.coach.coachCaps}</Text>
            <Text style={[typography['display-l'], { color: colors.ink }]}>
              {view.teamName ?? t.coach.yourSquad}
            </Text>
          </View>
        </View>

        <Text
          testID="coach-today"
          style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}
        >
          {t.coach.loggedToday(view.loggedToday, view.athletes.length, view.windowDays)}
        </Text>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {view.athletes.length === 0 ? (
            <Text testID="coach-empty" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              {t.coach.noAthletes}
            </Text>
          ) : (
            view.athletes.map((athlete) => (
              <AthleteCard key={athlete.participantId} athlete={athlete} />
            ))
          )}
        </View>

        {/* The code a coach pastes into the squad's group chat, one tap from
            the screen they actually open, rather than a long-press away on
            another one. */}
        {view.joinCode !== null && (
          <View style={{ marginTop: spacing['space-6'] }}>
            <TeamCodeCard
              code={view.joinCode}
              teamName={view.teamName}
              hint={t.coach.athletesJoin}
              testID="coach-join-code"
            />
          </View>
        )}

      </ScrollView>

      <CoachSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={view.teamName ?? t.coach.yourSquad}
        current="dashboard"
      />
    </SafeAreaView>
  );
}

function AthleteCard({ athlete }: { athlete: CoachAthlete }) {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();

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
        {t.coach.counts(athlete.daysLogged, athlete.breakfastDays)}
        {/* Days that could be judged at all, stated, because two of the three
            athletes have an unconfirmed weight and without one there is no
            band to judge against. */}
        {athlete.daysWithBand === 0
          ? t.coach.noDayMeasured
          : t.coach.insideBand(athlete.insideBand, athlete.daysWithBand)}
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
            {flag.code === 'under_fuelling' ? t.coach.flagUnder : t.coach.flagHydration}
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {flag.code === 'under_fuelling'
              ? t.coach.flagUnderDetail(UNDER_FUELLING_DAYS)
              : flag.reading !== undefined
                ? t.coach.flagDehydratedDetail(flag.reading, DEHYDRATED_AT)
                : flag.detail}
          </Text>
        </View>
      ))}

      {/* The days behind the count: intake against the programme's targets,
          as bar charts, the same ones the athlete sees. */}
      <View style={{ marginTop: spacing['space-1'] }}>
        <PushButton
          label={t.coach.seeGaps}
          variant="ghost"
          fullWidth
          testID={`athlete-${athlete.participantId}-gaps`}
          onPress={() =>
            router.push({ pathname: '/coach/athlete/[id]', params: { id: athlete.participantId } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleText: { flex: 1 },
  dot: { width: 14, height: 14 },
});
