import { StyleSheet, Text, View } from 'react-native';

import { Mascot, type MascotMotion, type MascotPose } from '@/components/mascot';
import { useTheme } from '@/theme';

export type MascotBannerProps = {
  pose: MascotPose;
  /** The line the mascot is there to deliver. Kept to one sentence. */
  message: string;
  /** A short lead-in above it, in caps. Optional. */
  eyebrow?: string;
  /**
   * Something the app was told, shown under the message in muted type.
   * Deliberately separate: a server's own words are not the mascot's, and
   * cannot be held to the vocabulary rule the messages are held to.
   */
  detail?: string;
  motion?: MascotMotion;
  size?: number;
  testID?: string;
};

/**
 * The mascot with something to say.
 *
 * The pattern Duolingo uses and the reason the character earns its place:
 * the astronaut is never decoration beside a paragraph, it is the thing
 * delivering one short line. The text is the accessible content and the
 * mascot stays hidden from a screen reader, so the line is read once.
 *
 * **Nothing here may carry a nutrition claim.** The mascot speaks about
 * logging, streaks and challenges -- the app's own side -- and the
 * programme's own sentences go in a NudgeCard, which is sourced and
 * reviewable. A cartoon is the wrong mouth for a dietitian's advice.
 */
export function MascotBanner({
  pose,
  message,
  eyebrow,
  detail,
  motion = 'enter',
  size = 104,
  testID,
}: MascotBannerProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.row,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-4'],
        },
      ]}
    >
      <Mascot pose={pose} size={size} motion={motion} testID={testID ? `${testID}-mascot` : undefined} />
      <View style={styles.copy}>
        {eyebrow !== undefined && (
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{eyebrow}</Text>
        )}
        <Text
          testID={testID ? `${testID}-message` : undefined}
          style={[typography['body-m'], { color: colors.ink }]}
        >
          {message}
        </Text>
        {detail !== undefined && (
          <Text
            testID={testID ? `${testID}-detail` : undefined}
            style={[typography['body-s'], { color: colors['ink-muted'] }]}
          >
            {detail}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, gap: 2 },
});
