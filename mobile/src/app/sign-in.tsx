import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CredentialFields } from '@/components/credential-fields';
import { Mascot } from '@/components/mascot';
import { PushButton } from '@/components/push-button';
import { signInAthlete, signUpAthlete } from '@/lib/account';
import { messageOf } from '@/lib/errors';
import { WELCOME_CUE } from '@/lib/mascot-copy';
import { useTheme } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

/**
 * The athlete's sign-in. The app's front door.
 *
 * There was not one. An athlete was an anonymous session plus a team code,
 * which meant three things that only looked like separate problems:
 *
 * 1. A new phone could not get the old athlete back. The claim lived in the
 *    old install's storage, and `claim_participant` refused the new device
 *    with "already claimed on another device" -- correctly, because that is
 *    indistinguishable from somebody else taking the row.
 * 2. Anonymous sign-ins are switched off on this project and only its owner
 *    can turn them on, so the whole athlete half stopped at the gate on any
 *    build pointed at the real database.
 * 3. There was nowhere to come back to. Opening the app was either "you are
 *    already somebody" or "pick a name off a roster", with no step in between
 *    that said who you are.
 *
 * The team code has not gone anywhere -- the next screen still asks for it,
 * and it is still how an athlete finds their squad and their own name. It is
 * the layer underneath that changed: the account is the identity, the code is
 * the link to a squad.
 */
export default function SignIn() {
  const router = useRouter();
  // An invite link that found no account sends its team code through here, so
  // the questionnaire is still waiting on the other side of the sign-in.
  const { joinCode } = useLocalSearchParams<{ joinCode?: string }>();
  const { colors, spacing, typography } = useTheme();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ready = email.trim() !== '' && password !== '' && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'sign-up') {
        const { confirmed } = await signUpAthlete(email, password);
        if (!confirmed) {
          // A project setting rather than a failure, so it is said plainly
          // instead of leaving an athlete on a screen that looks broken.
          setNotice('Check your email to confirm the account, then sign in.');
          setMode('sign-in');
          return;
        }
      } else {
        await signInAthlete(email, password);
      }
      // The root route asks who this is and sends them on: an athlete who has
      // already claimed a name goes to Today, a new one goes to the team code.
      if (joinCode) {
        router.replace({ pathname: '/join/[code]', params: { code: joinCode } });
      } else {
        router.replace('/');
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-6'] }]}>
        <View style={{ alignItems: 'center' }}>
          <Mascot pose={WELCOME_CUE.pose} size={140} motion={WELCOME_CUE.motion} testID="sign-in-mascot" />
        </View>

        <Text style={[typography['display-l'], { color: colors.ink }]}>
          {mode === 'sign-in' ? 'Welcome back' : 'Make your account'}
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {mode === 'sign-in'
            ? 'Sign in and pick up where you left off. Your streak follows the account, not the phone.'
            : 'An email and a password, so a new phone still knows who you are. Your coach gives you the team code on the next screen.'}
        </Text>

        <View style={{ marginTop: spacing['space-6'] }}>
          <CredentialFields
            email={email}
            onChangeEmail={setEmail}
            password={password}
            onChangePassword={setPassword}
            newAccount={mode === 'sign-up'}
            testIDPrefix="sign-in"
          />
        </View>

        {notice !== null && (
          <Text
            testID="sign-in-notice"
            style={[typography['body-s'], { color: colors['air-deep'], marginTop: spacing['space-4'] }]}
          >
            {notice}
          </Text>
        )}

        {error !== null && (
          <Text
            testID="sign-in-error"
            style={[typography['body-s'], { color: colors['cabai-deep'], marginTop: spacing['space-4'] }]}
          >
            {error}
          </Text>
        )}

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
          <PushButton
            label={busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create my account'}
            fullWidth
            disabled={!ready}
            testID="sign-in-submit"
            // An async onPress swallows its own rejection: a button that threw
            // simply did nothing, with no error and no log.
            onPress={() => {
              submit().catch((e: unknown) => setError(messageOf(e)));
            }}
          />
          <PushButton
            label={mode === 'sign-in' ? 'I need an account' : 'I already have an account'}
            variant="ghost"
            fullWidth
            testID="sign-in-switch"
            onPress={() => {
              setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
              setError(null);
              setNotice(null);
            }}
          />
        </View>

        {/* A coach is not an athlete and has their own door. Said here so a
            coach handed the squad's link does not make an athlete account and
            then find there is no squad behind it. */}
        <Pressable
          onPress={() => router.push('/coach/account')}
          accessibilityRole="button"
          testID="sign-in-as-coach"
          style={{ paddingVertical: spacing['space-4'] }}
        >
          <Text style={[typography['body-m'], { color: colors['air-deep'], textAlign: 'center' }]}>
            I am a coach →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 48, gap: 8 },
});
