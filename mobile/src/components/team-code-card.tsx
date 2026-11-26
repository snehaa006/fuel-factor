import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { PushButton } from '@/components/push-button';
import { copyText } from '@/lib/clipboard';
import { messageOf } from '@/lib/errors';
import { inviteMessage, normaliseCode } from '@/lib/invite';
import { useStrings } from '@/i18n';
import { useTheme } from '@/theme';

/** How long "Copied ✓" stays on the button before it reads "Copy code" again. */
export const COPIED_FOR_MS = 2500;

export type TeamCodeCardProps = {
  /** The squad's join code. Rendered as the database holds it. */
  code: string;
  /** Names the squad in the shared message. */
  teamName: string | null;
  /** The small line under the code: who it is for. */
  hint?: string;
  /** How long the button says "Copied ✓". Shortened in tests. */
  copiedForMs?: number;
  testID?: string;
};

/**
 * A team's join code, with a one-tap copy and a share.
 *
 * Coaches *and* athletes hand this code around, almost always by pasting it
 * into a WhatsApp group. Until now only the coach's team screen had a copy
 * button; an athlete could see their code nowhere, and a coach on the
 * dashboard had to open another screen and long-press a heading. So the same
 * card sits everywhere the code is shown.
 *
 * **Copy** puts the bare six characters on the clipboard, because that is
 * what goes into the team-code box. **Share** opens the phone's share sheet
 * with the whole invite -- link and code -- for when WhatsApp is not open yet.
 *
 * The code is also `selectable`, so a long-press still works on a phone whose
 * clipboard refused, and the card says so rather than claiming a copy that
 * did not happen.
 */
export function TeamCodeCard({
  code,
  teamName,
  hint,
  copiedForMs = COPIED_FOR_MS,
  testID = 'team-code-card',
}: TeamCodeCardProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const clean = normaliseCode(code);

  // "Copied ✓" is feedback for the tap, not a state of the card: it goes
  // back to "Copy code" so a second copy later reads as a second copy.
  useEffect(() => {
    if (copied !== 'yes') return;
    const timer = setTimeout(() => setCopied(null), copiedForMs);
    return () => clearTimeout(timer);
  }, [copied, copiedForMs]);

  function copy() {
    copyText(clean)
      .then((ok) => setCopied(ok ? 'yes' : 'failed'))
      .catch(() => setCopied('failed'));
  }

  function share() {
    setShareError(null);
    // Share rejects when the sheet is dismissed on some platforms, and an
    // async onPress that swallows its rejection is a button that silently
    // does nothing.
    Share.share({ message: inviteMessage(teamName ?? t.teamCode.myTeam, clean, t) }).catch((e: unknown) =>
      setShareError(messageOf(e))
    );
  }

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors['pisang-tint'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-4'],
        gap: spacing['space-2'],
      }}
    >
      <Text style={[typography.label, { color: colors['pisang-deep'] }]}>{t.teamCode.title}</Text>
      <Text
        selectable
        testID={`${testID}-code`}
        accessibilityLabel={t.teamCode.label(clean.split('').join(' '))}
        style={[typography['stat-hero'], { color: colors.ink }]}
      >
        {clean}
      </Text>
      {hint !== undefined && (
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{hint}</Text>
      )}

      <View style={[styles.row, { gap: spacing['space-2'], marginTop: spacing['space-1'] }]}>
        <View style={styles.cell}>
          <PushButton
            label={copied === 'yes' ? t.teamCode.copied : t.teamCode.copy}
            variant={copied === 'yes' ? 'success' : 'primary'}
            fullWidth
            testID={`${testID}-copy`}
            onPress={copy}
          />
        </View>
        <View style={styles.cell}>
          <PushButton
            label={t.teamCode.share}
            variant="ghost"
            fullWidth
            testID={`${testID}-share`}
            onPress={share}
          />
        </View>
      </View>

      {copied === 'failed' && (
        <Text testID={`${testID}-copy-failed`} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {t.teamCode.noClipboard}
        </Text>
      )}
      {shareError !== null && (
        <Text testID={`${testID}-share-error`} style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
          {shareError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1 },
});
