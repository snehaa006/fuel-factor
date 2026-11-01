import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { measurementsOf, type AthleteProfile, type CoachProfile } from '@/lib/profile';
import { PROGRAMME_WEEKS } from '@/lib/recall-window';
import { useProfile } from '@/lib/use-profile';
import { useTheme } from '@/theme';

/**
 * Who this device is signed in as.
 *
 * **The measurements are shown and not editable.** They are PARTICIPANTS
 * columns; for the three seeded footballers they are figures the research team
 * measured and recorded disagreements about across two tabs. A text field here
 * would let a 14 year old overwrite a measurement with a guess, and the
 * carbohydrate band on Today is computed from the weight -- so the band would
 * quietly start answering to a self-report. Somebody joining by link enters
 * their own figures once, in the questionnaire, where there is nothing to
 * overwrite.
 *
 * Nothing on this screen comments on a figure. No BMI, no category, no colour
 * and no "healthy range": the programme has defined none of those, and a
 * screen that put a word next to a teenager's weight would be the single worst
 * thing this app could do.
 */
export default function Profile() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const state = useProfile();
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'signed-out') return <Redirect href="/welcome" />;

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" testID="profile-back">
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
    </Pressable>
  );

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
          {back}
          <Text
            testID="profile-error"
            style={[
              typography['body-m'],
              { color: colors['cabai-deep'], marginTop: spacing['space-6'] },
            ]}
          >
            {state.message}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { profile } = state;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        {back}
        {profile.kind === 'athlete' ? (
          <Athlete profile={profile} />
        ) : (
          <Coach profile={profile} onOpenTeam={() => router.push('/coach/team')} />
        )}

        <View style={{ marginTop: spacing['space-12'], gap: spacing['space-3'] }}>
          {confirmLeave ? (
            <>
              <Text
                testID="profile-leave-warning"
                style={[typography['body-m'], { color: colors.ink }]}
              >
                {profile.kind === 'athlete'
                  ? // Said in full, because an anonymous session is the only
                    // identity an athlete has and there is no credential to
                    // sign back in with.
                    'Signing out gives up this device’s link to your athlete record. There is no password to get back in with — your coach would have to add you again.'
                  : 'You can sign back in with your email and password. The team stays as it is.'}
              </Text>
              <PushButton
                label={state.leaving ? 'Signing out…' : 'Yes, sign out'}
                variant="alert"
                fullWidth
                disabled={state.leaving}
                testID="profile-leave-confirm"
                onPress={() => {
                  state.leave().catch(() => {
                    // Surfaced through the hook's error state.
                  });
                }}
              />
              <PushButton
                label="Stay signed in"
                variant="ghost"
                fullWidth
                testID="profile-leave-cancel"
                onPress={() => setConfirmLeave(false)}
              />
            </>
          ) : (
            <PushButton
              label="Sign out"
              variant="ghost"
              fullWidth
              testID="profile-leave"
              onPress={() => setConfirmLeave(true)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Athlete({ profile }: { profile: AthleteProfile }) {
  const { colors, radius, spacing, typography } = useTheme();

  const row = (label: string, value: string, testID?: string) => (
    <View key={label} style={styles.row}>
      <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>{label}</Text>
      <Text testID={testID} style={[typography['body-m'], { color: colors.ink }]}>
        {value}
      </Text>
    </View>
  );

  const card = (title: string, children: React.ReactNode, testID?: string) => (
    <View
      testID={testID}
      style={{
        backgroundColor: colors['surface-raised'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-4'],
        gap: spacing['space-2'],
      }}
    >
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={{ gap: spacing['space-4'] }}>
      <View style={{ marginTop: spacing['space-2'] }}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>{profile.name}</Text>
        <Text testID="profile-code" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {profile.participantCode}
          {profile.teamName !== null ? ` · ${profile.teamName}` : ''}
        </Text>
      </View>

      {card(
        'THE PROGRAMME',
        <>
          {row('Sport', profile.sport ?? 'Not recorded')}
          {row('Age', profile.ageBand ?? 'Not recorded')}
          {row(
            'Programme starts',
            profile.programmeStartsOn ?? 'Your coach has not set it',
            'profile-programme'
          )}
          {profile.programmeStartsOn !== null && (
            <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
              The follow-up recall opens {PROGRAMME_WEEKS} weeks after that day.
            </Text>
          )}
        </>,
        'profile-programme-card'
      )}

      {card(
        'MEASUREMENTS',
        <>
          {measurementsOf(profile).map((m) => row(m.label, m.value))}
          <Text
            testID="profile-measurements-note"
            style={[typography['body-s'], { color: colors['ink-muted'] }]}
          >
            {/* Why there is no edit button, rather than leaving it to be
                wondered about. */}
            Your coach or the programme&apos;s dietitian measures these. Nothing here is scored,
            compared with anybody else, or shown on the leaderboard.
          </Text>
        </>,
        'profile-measurements'
      )}

      {card(
        'CONSENT',
        <>
          {row(
            'Parent or guardian form',
            profile.consentSigned ? 'Signed' : 'Not recorded as signed',
            'profile-consent-signed'
          )}
          {row(
            'Accepted in the app',
            profile.consentAckAt === null ? 'Not recorded' : profile.consentAckAt.slice(0, 10),
            'profile-consent-ack'
          )}
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {/* The two are deliberately separate records and the screen says
                so, because one is a paper form and one is a checkbox. */}
            The first is the programme&apos;s paper form. The second is this app&apos;s own screen.
            They are kept apart on purpose.
          </Text>
        </>,
        'profile-consent'
      )}
    </View>
  );
}

function Coach({ profile, onOpenTeam }: { profile: CoachProfile; onOpenTeam: () => void }) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing['space-4'] }}>
      <View style={{ marginTop: spacing['space-2'] }}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>Coach</Text>
        <Text testID="profile-email" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {profile.email ?? 'No email on this session'}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        }}
      >
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>YOUR TEAM</Text>
        <Text testID="profile-team" style={[typography['heading-m'], { color: colors.ink }]}>
          {profile.team?.name ?? 'No team yet'}
        </Text>
        {profile.team !== null && (
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {profile.team.athletes} {profile.team.athletes === 1 ? 'athlete' : 'athletes'} · code{' '}
            {profile.team.joinCode}
          </Text>
        )}
        <View style={{ marginTop: spacing['space-2'] }}>
          <PushButton
            label={profile.team === null ? 'Create a team' : 'Team and invite link'}
            fullWidth
            testID="profile-open-team"
            onPress={onOpenTeam}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
});
