import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckBox } from '@/components/check-box';
import { Mascot } from '@/components/mascot';
import { PushButton } from '@/components/push-button';
import { WELCOME_CUE } from '@/lib/mascot-copy';
import { claimParticipant, signIn, teamRoster, type RosterEntry } from '@/lib/auth';
import { teamByCode } from '@/lib/join';
import {
  CONSENT_CHECKBOX,
  CONSENT_HEADING,
  CONSENT_WHAT_IT_IS,
  CONSENT_WHAT_IT_IS_NOT,
} from '@/lib/consent';
import { messageOf } from '@/lib/errors';
import { normaliseCode } from '@/lib/invite';
import { useTheme } from '@/theme';

type Step = 'consent' | 'team' | 'athlete';

/**
 * The onboarding gate.
 *
 * Consent first and always: decision 8 of the brief makes it blocking, and the
 * claim function refuses without it, so there is no path into the app that
 * skips this screen. Then a team code rather than a password, because the
 * athletes are 14 to 16 and a squad will not carry credentials.
 */
export default function Welcome() {
  const router = useRouter();
  // An invite link that landed on the questionnaire and was sent here instead
  // arrives with its code, so nobody types six characters they already have.
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { colors, radius, spacing, typography } = useTheme();

  const [step, setStep] = useState<Step>('consent');
  const [consented, setConsented] = useState(false);
  const [joinCode, setJoinCode] = useState(() => normaliseCode(code ?? ''));
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInBlocked, setSignInBlocked] = useState(false);

  // The session is what row level security answers about, so it has to exist
  // before the roster can be read. Anonymous: no credential is ever collected.
  useEffect(() => {
    let active = true;
    signIn()
      .then((userId) => {
        if (active && userId === null) setSignInBlocked(true);
      })
      .catch((e: unknown) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
    };
  }, []);

  async function findTeam() {
    setBusy(true);
    setError(null);
    try {
      const entries = await teamRoster(joinCode);
      if (entries.length === 0) {
        // A team a coach has only just created has nobody on it yet, which
        // reads identically to a wrong code through `team_roster` alone. Ask
        // whether the team exists before telling somebody their code is bad.
        const team = await teamByCode(joinCode);
        if (team === null) {
          setError('No team with that code.');
          return;
        }
        router.push(`/join/${normaliseCode(joinCode)}`);
        return;
      }
      setRoster(entries);
      setStep('athlete');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function claim(entry: RosterEntry) {
    setBusy(true);
    setError(null);
    try {
      await claimParticipant(joinCode, entry.participant_code, consented);
      router.replace('/');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  const heading = (text: string) => (
    <Text style={[typography['display-l'], { color: colors.ink }]}>{text}</Text>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-6'] }]}>
        {signInBlocked && (
          <View
            testID="sign-in-blocked"
            style={[
              styles.notice,
              { backgroundColor: colors['cabai-tint'], borderRadius: radius['radius-lg'], padding: spacing['space-4'] },
            ]}
          >
            <Text style={[typography.label, { color: colors['cabai-deep'] }]}>SIGN-IN UNAVAILABLE</Text>
            <Text style={[typography['body-s'], { color: colors.ink, marginTop: 4 }]}>
              Anonymous sign-ins are switched off for this project. Turn them on in Supabase under
              Authentication → Sign In / Providers.
            </Text>
          </View>
        )}

        {step === 'consent' && (
          <View style={{ gap: spacing['space-4'] }}>
            {/* The one place the mascot is the hero rather than a messenger:
                this is the app introducing itself. */}
            <View style={{ alignItems: 'center' }}>
              <Mascot
                pose={WELCOME_CUE.pose}
                size={176}
                motion={WELCOME_CUE.motion}
                testID="welcome-mascot"
              />
            </View>
            {heading(CONSENT_HEADING)}
            <Text style={[typography['body-l'], { color: colors.ink }]}>{CONSENT_WHAT_IT_IS}</Text>
            <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              {CONSENT_WHAT_IT_IS_NOT}
            </Text>

            <CheckBox
              label={CONSENT_CHECKBOX}
              checked={consented}
              onChange={setConsented}
              testID="consent-checkbox"
            />

            <PushButton
              label="Continue"
              fullWidth
              // Without a session the roster lookup is refused, so the gate
              // stops here rather than walking the athlete into a dead end.
              disabled={!consented || signInBlocked}
              testID="consent-continue"
              onPress={() => setStep('team')}
            />
          </View>
        )}

        {step === 'team' && (
          <View style={{ gap: spacing['space-4'] }}>
            {heading('Your team code')}
            <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              Your coach has it. It looks like FUEL01.
            </Text>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="FUEL01"
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel="Team code"
              testID="team-code"
              style={[
                typography['heading-m'],
                {
                  backgroundColor: colors['surface-sunken'],
                  borderRadius: radius['radius-lg'],
                  color: colors.ink,
                  padding: spacing['space-4'],
                },
              ]}
            />
            <PushButton
              label={busy ? 'Looking…' : 'Find my team'}
              fullWidth
              disabled={busy || joinCode.trim().length === 0}
              testID="find-team"
              onPress={findTeam}
            />

            {/* A coach is not an athlete and needs an account, not a team
                code. Said here so a coach handed the squad's link does not
                type their way into claiming a child's row. */}
            <Pressable
              onPress={() => router.push('/coach/account')}
              accessibilityRole="button"
              testID="i-am-a-coach"
              style={{ paddingVertical: spacing['space-3'] }}
            >
              <Text style={[typography['body-m'], { color: colors['air-deep'], textAlign: 'center' }]}>
                I am a coach →
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'athlete' && (
          <View style={{ gap: spacing['space-4'] }}>
            {heading('Which one are you?')}
            {busy && <ActivityIndicator color={colors.pisang} />}
            {roster.map((entry) => (
              <Pressable
                key={entry.participant_code}
                onPress={entry.claimed || busy ? undefined : () => claim(entry)}
                disabled={entry.claimed || busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: entry.claimed }}
                accessibilityLabel={
                  entry.claimed ? `${entry.name}, already taken` : `I am ${entry.name}`
                }
                testID={`athlete-${entry.participant_code}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: entry.claimed ? colors.locked : colors['surface-raised'],
                    borderRadius: radius['radius-lg'],
                    padding: spacing['space-4'],
                  },
                ]}
              >
                <Text
                  style={[
                    typography['heading-m'],
                    { color: entry.claimed ? colors['ink-faint'] : colors.ink },
                  ]}
                >
                  {entry.name}
                </Text>
                <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                  {entry.claimed ? 'Already on another device' : entry.participant_code}
                </Text>
              </Pressable>
            ))}

            {/* Somebody the research team has not typed into the tracker yet.
                They fill the programme's questionnaire instead of claiming a
                row, which is the only way a participant row is created from a
                phone. */}
            <Pressable
              onPress={() => router.push(`/join/${normaliseCode(joinCode)}`)}
              accessibilityRole="button"
              testID="not-listed"
              style={{ paddingVertical: spacing['space-3'] }}
            >
              <Text style={[typography['body-m'], { color: colors['air-deep'], textAlign: 'center' }]}>
                I am not on this list →
              </Text>
            </Pressable>
          </View>
        )}

        {error && (
          <Text testID="gate-error" style={[typography['body-m'], { color: colors['cabai-deep'], marginTop: spacing['space-4'] }]}>
            {error}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 48, gap: 24 },
  notice: { gap: 2 },
  row: { gap: 2 },
});
