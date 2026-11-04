import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CredentialFields } from '@/components/credential-fields';
import { PushButton } from '@/components/push-button';
import { signInCoach, signUpCoach } from '@/lib/coach-auth';
import { messageOf } from '@/lib/errors';
import { useTheme } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

/**
 * The coach's sign-in.
 *
 * An email and a password, which the athletes do not have and will not get.
 * The reasoning is the same one read in both directions: a squad of 14 to 16
 * year olds should not carry a credential each, and the adult who owns the
 * squad's data should not be identified by a device. A coach who creates a
 * team from an anonymous session owns it from one app install's storage, and
 * loses it on reinstall with nothing to prove it was theirs.
 *
 * Athletes have their own door at `/sign-in`, on this same provider. What
 * keeps the two apart is not the credential any more but what the account
 * owns: a coach owns a team, an athlete claims a name on one.
 */
export default function CoachAccount() {
  const router = useRouter();
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
        const { confirmed } = await signUpCoach(email, password);
        if (!confirmed) {
          // A setting rather than a failure, so it is said plainly instead of
          // leaving the coach on a screen that looks broken.
          setNotice('Check your email to confirm the account, then sign in.');
          setMode('sign-in');
          return;
        }
      } else {
        await signInCoach(email, password);
      }
      router.replace('/coach');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="account-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
        </Pressable>

        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {mode === 'sign-in' ? 'Coach sign-in' : 'New coach account'}
        </Text>
        <Text
          style={[
            typography['body-m'],
            { color: colors['ink-muted'], marginBottom: spacing['space-6'] },
          ]}
        >
          Sign in to manage your team.
        </Text>

        <CredentialFields
          email={email}
          onChangeEmail={setEmail}
          password={password}
          onChangePassword={setPassword}
          newAccount={mode === 'sign-up'}
          emailPlaceholder="you@school.sch.id"
          testIDPrefix="account"
        />

        {notice !== null && (
          <Text
            testID="account-notice"
            style={[
              typography['body-s'],
              { color: colors['air-deep'], marginTop: spacing['space-4'] },
            ]}
          >
            {notice}
          </Text>
        )}

        {error !== null && (
          <Text
            testID="account-error"
            style={[
              typography['body-s'],
              { color: colors['cabai-deep'], marginTop: spacing['space-4'] },
            ]}
          >
            {error}
          </Text>
        )}

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
          <PushButton
            label={busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create the account'}
            fullWidth
            disabled={!ready}
            testID="account-submit"
            onPress={() => {
              // An async onPress swallows its own rejection: the photo picker
              // threw once and the button simply did nothing.
              submit().catch((e: unknown) => setError(messageOf(e)));
            }}
          />
          <PushButton
            label={mode === 'sign-in' ? 'I need an account' : 'I already have an account'}
            variant="ghost"
            fullWidth
            testID="account-switch"
            onPress={() => {
              setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
              setError(null);
              setNotice(null);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 48 },
});
