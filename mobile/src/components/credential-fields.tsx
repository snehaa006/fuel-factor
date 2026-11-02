import { Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * An email and a password, drawn once.
 *
 * Both sign-ins use it -- the athlete's and the coach's -- so the two screens
 * cannot drift into looking like different apps, and the keyboard, capitalise
 * and autofill hints are got right in one place rather than twice. They are
 * worth getting right: `textContentType` is what offers the saved password,
 * and `autoCapitalize="none"` is what stops a phone from capitalising the
 * first letter of an email address and failing the sign-in for it.
 */

export type CredentialFieldsProps = {
  email: string;
  onChangeEmail: (next: string) => void;
  password: string;
  onChangePassword: (next: string) => void;
  /** A new account gets the "suggest a strong password" hint, not the saved one. */
  newAccount?: boolean;
  emailPlaceholder?: string;
  /** Prefixes the test IDs, so two forms can never collide. */
  testIDPrefix: string;
};

export function CredentialFields({
  email,
  onChangeEmail,
  password,
  onChangePassword,
  newAccount = false,
  emailPlaceholder = 'you@example.com',
  testIDPrefix,
}: CredentialFieldsProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const input = {
    backgroundColor: colors['surface-sunken'],
    borderRadius: radius['radius-lg'],
    color: colors.ink,
    padding: spacing['space-4'],
  };

  return (
    <View style={{ gap: spacing['space-4'] }}>
      <View style={{ gap: spacing['space-2'] }}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={onChangeEmail}
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder={emailPlaceholder}
          placeholderTextColor={colors['ink-faint']}
          textContentType="emailAddress"
          testID={`${testIDPrefix}-email`}
          style={[typography['body-l'], input]}
        />
      </View>

      <View style={{ gap: spacing['space-2'] }}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>PASSWORD</Text>
        <TextInput
          value={password}
          onChangeText={onChangePassword}
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder={newAccount ? 'At least 6 characters' : ''}
          placeholderTextColor={colors['ink-faint']}
          textContentType={newAccount ? 'newPassword' : 'password'}
          testID={`${testIDPrefix}-password`}
          style={[typography['body-l'], input]}
        />
      </View>
    </View>
  );
}
