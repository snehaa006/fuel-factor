import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { motion } from '@/theme/motion';

export type SparkleBurstProps = {
  /**
   * The burst's own 0 to 1, driven by whoever is celebrating. Held here as a
   * shared value rather than as state, so a celebration costs no render and
   * the marks stay on the UI thread with the mascot they belong to.
   */
  progress: SharedValue<number>;
  testID?: string;
};

/** Where each mark flies, as a fraction of a full turn. */
const ANGLES = Array.from(
  { length: motion.sparkle.count },
  (_, i) => (i / motion.sparkle.count) * Math.PI * 2
);

/**
 * The marks thrown outward when the mascot celebrates.
 *
 * The brand boards draw exactly this around the astronaut -- little tapered
 * ticks in amber and orange -- so the celebration is the board's own
 * punctuation rather than confetti borrowed from somewhere else.
 *
 * One shared value drives all eight, so a burst is a single animation rather
 * than eight competing ones. They sit behind the mascot and are decorative:
 * the screen reader is told nothing, because a sighted reader is getting a
 * flourish, not information.
 */
export function SparkleBurst({ progress, testID }: SparkleBurstProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.field}
    >
      {ANGLES.map((angle, i) => (
        <Mark
          key={angle}
          angle={angle}
          progress={progress}
          colour={i % 2 === 0 ? colors.pisang : colors.cabai}
          pill={radius['radius-pill']}
        />
      ))}
    </View>
  );
}

function Mark({
  angle,
  progress,
  colour,
  pill,
}: {
  angle: number;
  progress: SharedValue<number>;
  colour: string;
  pill: number;
}) {
  const dx = Math.cos(angle) * motion.sparkle.distance;
  const dy = Math.sin(angle) * motion.sparkle.distance;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      // Fades out over the back half, so the burst thins as it spreads
      // rather than vanishing all at once.
      opacity: p === 0 ? 0 : 1 - Math.max(0, (p - 0.4) / 0.6),
      transform: [
        { translateX: dx * p },
        { translateY: dy * p },
        { scale: 1 - 0.55 * p },
        { rotate: `${angle}rad` },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.mark, { backgroundColor: colour, borderRadius: pill }, style]}
    />
  );
}

const styles = StyleSheet.create({
  // The four offsets written out: RN 0.88 has no StyleSheet.absoluteFillObject.
  field: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A tapered dash, like the ticks drawn around the mascot on the board.
  mark: { position: 'absolute', width: 14, height: 4 },
});
