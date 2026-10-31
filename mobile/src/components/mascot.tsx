import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/use-reduce-motion';
import { motion } from '@/theme/motion';

/**
 * The mascot.
 *
 * Theo's astronaut, cut from `design-system/brand/mascot-board.jpg`. Pure
 * engagement: it is the app's face, it carries no data, and nothing it does
 * depends on what anybody ate.
 *
 * **The poses are the board's own and the app does not invent new ones.**
 * Where a screen needs a feeling the board has not drawn, it gets no mascot
 * rather than a pose bent to fit.
 */
export const MASCOT_POSES = [
  'float',
  'stand',
  'run',
  'learn',
  'think',
  'fuel',
  'best',
  'balloons',
] as const;

export type MascotPose = (typeof MASCOT_POSES)[number];

/**
 * How the mascot moves.
 *
 * `idle` is the resting state: one slow bob, because the character is
 * weightless and a still astronaut reads as a sticker. `enter` adds an
 * entrance for a mascot that appears with its screen. `celebrate` adds a
 * pop and a wiggle, for the moments worth marking. `none` is the still
 * version, and is also what every pose falls back to when the device asks
 * for reduced motion.
 */
export type MascotMotion = 'idle' | 'enter' | 'celebrate' | 'none';

// Metro resolves each of these to a numeric asset id at build time. The
// cast is on the map rather than on each entry so there is one of them.
const SOURCES = {
  float: require('../../assets/mascots/float.png'),
  stand: require('../../assets/mascots/stand.png'),
  run: require('../../assets/mascots/run.png'),
  learn: require('../../assets/mascots/learn.png'),
  think: require('../../assets/mascots/think.png'),
  fuel: require('../../assets/mascots/fuel.png'),
  best: require('../../assets/mascots/best.png'),
  balloons: require('../../assets/mascots/balloons.png'),
} as Record<MascotPose, number>;

/** Width over height, as each pose was cut. Drives width from a given height. */
export const MASCOT_ASPECT: Record<MascotPose, number> = {
  float: 0.746,
  stand: 0.576,
  run: 0.731,
  learn: 0.855,
  think: 0.821,
  fuel: 0.785,
  best: 0.955,
  balloons: 1.472,
};

export type MascotProps = {
  pose: MascotPose;
  /** Rendered height in px. Width follows the pose's own aspect. */
  size?: number;
  motion?: MascotMotion;
  /**
   * What a screen reader should say. Left out, the mascot is marked
   * decorative and skipped -- which is right nearly everywhere, because
   * announcing "astronaut" between every section is noise rather than
   * information.
   */
  label?: string;
  testID?: string;
};

export function Mascot({
  pose,
  size = 120,
  motion: how = 'idle',
  label,
  testID,
}: MascotProps) {
  const reduceMotion = useReduceMotion();
  const still = how === 'none' || reduceMotion;

  const bob = useSharedValue(0);
  const scale = useSharedValue(still || how === 'idle' ? 1 : motion.enter.from);
  const opacity = useSharedValue(still || how === 'idle' ? 1 : 0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (still) {
      // Snap to the resting pose rather than animating to it, so a device
      // asking for reduced motion gets no movement at all.
      bob.value = 0;
      scale.value = 1;
      opacity.value = 1;
      spin.value = 0;
      return;
    }

    bob.value = withRepeat(
      withTiming(-motion.bob.offset, {
        duration: motion.bob.duration,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    if (how === 'enter' || how === 'celebrate') {
      opacity.value = withTiming(1, { duration: motion.enter.duration });
      scale.value = withSpring(1, motion.pop);
    }

    if (how === 'celebrate') {
      scale.value = withSequence(
        withSpring(motion.pop.overshoot, motion.pop),
        withSpring(1, motion.pop)
      );
      spin.value = withSequence(
        withTiming(-motion.wiggle.degrees, { duration: motion.wiggle.duration }),
        withTiming(motion.wiggle.degrees, { duration: motion.wiggle.duration }),
        withTiming(0, { duration: motion.wiggle.duration })
      );
    }
  }, [how, still, bob, scale, opacity, spin]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: bob.value },
      { scale: scale.value },
      { rotate: `${spin.value}deg` },
    ],
  }));

  const decorative = label === undefined;

  return (
    <View
      testID={testID}
      // A pose that says nothing a sighted reader does not already have from
      // the text beside it is decoration, and is hidden rather than described.
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      style={styles.frame}
    >
      <Animated.View style={style}>
        <Image
          source={SOURCES[pose]}
          contentFit="contain"
          style={{ height: size, width: size * MASCOT_ASPECT[pose] }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'flex-end' },
});
