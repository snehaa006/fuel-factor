import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { longDate } from '@/components/calendar';
import { PreferenceSwitches } from '@/components/preference-switches';
import { PushButton } from '@/components/push-button';
import { TeamCodeCard } from '@/components/team-code-card';
import { measurementsOf, type AthleteProfile, type CoachProfile } from '@/lib/profile';
import { PROGRAMME_WEEKS } from '@/lib/recall-window';
import { useProfile } from '@/lib/use-profile';
import { useStrings } from '@/i18n';
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
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const state = useProfile();
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  // `/` is the one place that decides where a given account belongs, and a
  // signed-out one belongs at the sign-in rather than at the team-code gate.
  if (state.status === 'signed-out') return <Redirect href="/" />;

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" testID="profile-back">
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
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

        {/* The same two switches as the foot of the menu. Profile is where
            somebody looks for a setting, so they are here as well. */}
        <View
          testID="profile-settings"
          style={{
            marginTop: spacing['space-4'],
            backgroundColor: colors['surface-raised'],
            borderRadius: radius['radius-lg'],
            padding: spacing['space-4'],
            gap: spacing['space-3'],
          }}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>
            {t.preferences.title}
          </Text>
          <PreferenceSwitches testID="profile-preferences" />
        </View>

        <View style={{ marginTop: spacing['space-12'], gap: spacing['space-3'] }}>
          {confirmLeave ? (
            <>
              <Text
                testID="profile-leave-warning"
                style={[typography['body-m'], { color: colors.ink }]}
              >
                {/* This used to warn an athlete there was no way back in,
                    and it was true: an anonymous session was the only
                    identity they had. They have an account now, so the
                    warning would be a lie that costs somebody their logs. */}
                {profile.kind === 'athlete' ? t.profile.leaveAthlete : t.profile.leaveCoach}
              </Text>
              <PushButton
                label={state.leaving ? t.profile.signingOut : t.profile.yesSignOut}
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
                label={t.profile.staySignedIn}
                variant="ghost"
                fullWidth
                testID="profile-leave-cancel"
                onPress={() => setConfirmLeave(false)}
              />
            </>
          ) : (
            <PushButton
              label={t.common.signOut}
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
  const t = useStrings();
  const p = t.profile;

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

      {/* An athlete hands the code to a teammate as often as a coach does,
          and this used to be loaded and never shown. */}
      {profile.joinCode !== null && (
        <TeamCodeCard
          code={profile.joinCode}
          teamName={profile.teamName}
          hint={p.teamCodeHint}
          testID="profile-team-code"
        />
      )}

      {card(
        p.theProgramme,
        <>
          {row(p.sport, profile.sport ?? t.common.notRecorded)}
          {row(
            p.age,
            profile.ageBand === null ? t.common.notRecorded : (t.ageBands[profile.ageBand] ?? profile.ageBand)
          )}
          {row(
            p.programmeStarts,
            profile.programmeStartsOn === null
              ? p.coachNotSet
              : longDate(profile.programmeStartsOn, t),
            'profile-programme'
          )}
          {profile.programmeStartsOn !== null && (
            <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
              {p.followUpOpens(PROGRAMME_WEEKS)}
            </Text>
          )}
        </>,
        'profile-programme-card'
      )}

      {card(
        p.measurements,
        <>
          {measurementsOf(profile, t).map((m) => row(m.label, m.value))}
          <Text
            testID="profile-measurements-note"
            style={[typography['body-s'], { color: colors['ink-muted'] }]}
          >
            {p.coachUpdates}
          </Text>
        </>,
        'profile-measurements'
      )}

      {card(
        p.consent,
        <>
          {row(
            p.paperForm,
            profile.consentSigned ? p.signed : p.notSigned,
            'profile-consent-signed'
          )}
          {row(
            p.acceptedInApp,
            profile.consentAckAt === null
              ? t.common.notRecorded
              : longDate(profile.consentAckAt.slice(0, 10), t),
            'profile-consent-ack'
          )}
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {/* The two are deliberately separate records and the screen says
                so, because one is a paper form and one is a checkbox. */}
            {p.consentNote}
          </Text>
        </>,
        'profile-consent'
      )}
    </View>
  );
}

function Coach({ profile, onOpenTeam }: { profile: CoachProfile; onOpenTeam: () => void }) {
  const { colors, radius, spacing, typography } = useTheme();
  const p = useStrings().profile;

  return (
    <View style={{ gap: spacing['space-4'] }}>
      <View style={{ marginTop: spacing['space-2'] }}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>{p.coach}</Text>
        <Text testID="profile-email" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {profile.email ?? p.noEmail}
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
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>{p.yourTeam}</Text>
        <Text testID="profile-team" style={[typography['heading-m'], { color: colors.ink }]}>
          {profile.team?.name ?? p.noTeamYet}
        </Text>
        {profile.team !== null && (
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {p.athletes(profile.team.athletes)}
          </Text>
        )}
        {profile.team !== null && (
          <TeamCodeCard
            code={profile.team.joinCode}
            teamName={profile.team.name}
            hint={p.squadJoins}
            testID="profile-coach-team-code"
          />
        )}
        <View style={{ marginTop: spacing['space-2'] }}>
          <PushButton
            label={profile.team === null ? p.createTeam : p.teamAndInvite}
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
