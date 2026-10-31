import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SparkleBurst } from '@/components/sparkle-burst';
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
 *
 * The movement is built on squash and stretch rather than on sliding the
 * image about: the character compresses before it leaves the ground and
 * stretches on the way up, which is what makes a jump read as weight. Every
 * motion has a still version, and the whole thing falls back to it when the
 * device asks for reduced motion -- a looping bob is charming and is also
 * exactly what somebody with vestibular sensitivity turned that setting on
 * to stop.
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
 * - `idle` rests: one slow bob, because the character is weightless and a
 *   still astronaut reads as a sticker.
 * - `enter` drops in and lands, for a mascot that arrives with its screen.
 * - `celebrate` jumps, wiggles, throws the board's own ticks outward and
 *   taps the device once. For the moments worth marking and no others.
 * - `nudge` hops every few seconds, to pull an eye back to something undone.
 * - `shake` wobbles, for something refused.
 * - `none` is the still version.
 */
export const MASCOT_MOTIONS = [
  'none',
  'idle',
  'enter',
  'celebrate',
  'nudge',
  'shake',
] as const;

export type MascotMotion = (typeof MASCOT_MOTIONS)[number];

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

  const lift = useSharedValue(0);
  const stretchY = useSharedValue(1);
  const stretchX = useSharedValue(1);
  const opacity = useSharedValue(1);
  const spin = useSharedValue(0);

  // The burst's own 0 to 1. A shared value rather than state, so a
  // celebration costs no render -- lint is right that setState in an effect
  // is nearly always a derived value in disguise.
  const burst = useSharedValue(0);

  useEffect(() => {
    if (still) {
      // Snap to rest rather than animating to it, so a device asking for
      // reduced motion gets no movement at all.
      lift.value = 0;
      stretchY.value = 1;
      stretchX.value = 1;
      opacity.value = 1;
      spin.value = 0;
      burst.value = 0;
      return;
    }

    const { crouch, launch, land } = motion.jump;

    // Cancel on unmount. `idle` and `nudge` repeat forever, so without this
    // they keep ticking after the screen is gone -- work nobody is watching
    // on a device, and a worker that will not exit in jest.
    const stop = () => {
      for (const value of [lift, stretchY, stretchX, opacity, spin, burst]) {
        cancelAnimation(value);
      }
    };

    /** Crouch, launch, land. The shape every hop here is built from. */
    const hop = () => {
      lift.value = withSequence(
        withTiming(crouch.drop, { duration: crouch.duration, easing: Easing.out(Easing.quad) }),
        withTiming(launch.rise, { duration: launch.duration, easing: Easing.out(Easing.quad) }),
        withSpring(0, land)
      );
      stretchY.value = withSequence(
        withTiming(crouch.scaleY, { duration: crouch.duration }),
        withTiming(launch.scaleY, { duration: launch.duration }),
        withSpring(1, land)
      );
      stretchX.value = withSequence(
        withTiming(crouch.scaleX, { duration: crouch.duration }),
        withTiming(launch.scaleX, { duration: launch.duration }),
        withSpring(1, land)
      );
    };

    if (how === 'idle') {
      lift.value = withRepeat(
        withTiming(-motion.bob.offset, {
          duration: motion.bob.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true
      );
      return stop;
    }

    if (how === 'enter') {
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: motion.enter.duration });
      lift.value = withSequence(
        withTiming(-motion.jump.launch.rise / 2, { duration: 0 }),
        withSpring(0, motion.jump.land)
      );
      stretchY.value = withSequence(
        withTiming(1.08, { duration: motion.enter.duration }),
        withSpring(1, motion.jump.land)
      );
      return stop;
    }

    if (how === 'celebrate') {
      hop();
      spin.value = withSequence(
        withTiming(-motion.wiggle.degrees, { duration: motion.wiggle.duration }),
        withTiming(motion.wiggle.degrees, { duration: motion.wiggle.duration }),
        withSpring(0, motion.jump.land)
      );
      burst.value = 0;
      burst.value = withTiming(1, {
        duration: motion.sparkle.duration,
        easing: Easing.out(Easing.cubic),
      });
      return stop;
    }

    if (how === 'nudge') {
      // One hop, a long wait, forever. The wait is the point: a mascot that
      // hops constantly stops being a nudge and becomes wallpaper.
      lift.value = withRepeat(
        withDelay(
          motion.nudge.every,
          withSequence(
            withTiming(crouch.drop, { duration: crouch.duration }),
            withTiming(launch.rise / 2, { duration: launch.duration }),
            withSpring(0, land)
          )
        ),
        -1,
        false
      );
      return stop;
    }

    if (how === 'shake') {
      spin.value = withRepeat(
        withSequence(
          withTiming(-motion.wobble.degrees, { duration: motion.wobble.duration }),
          withTiming(motion.wobble.degrees, { duration: motion.wobble.duration })
        ),
        motion.wobble.cycles,
        true,
        () => {
          spin.value = withSpring(0, motion.jump.land);
        }
      );
    }

    return stop;
  }, [how, still, pose, lift, stretchY, stretchX, opacity, spin, burst]);

  /**
   * The tap that goes with a celebration.
   *
   * Fired from an effect of its own rather than inside the animation, and
   * kept out of the reduced-motion branch on purpose: reduced motion is
   * about what moves on screen, and somebody who turned it on still deserves
   * to be told they finished the day.
   */
  useEffect(() => {
    if (how !== 'celebrate') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // No haptic engine on this device. Nothing to recover from.
    });
  }, [how, pose]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: lift.value },
      { scaleX: stretchX.value },
      { scaleY: stretchY.value },
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
      <SparkleBurst progress={burst} testID={testID ? `${testID}-sparkles` : undefined} />
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
  // The feet stay put while the body squashes, which is what a scale from the
  // bottom edge buys: a character that compresses into the ground rather than
  // shrinking towards its own middle.
  frame: { alignItems: 'center', justifyContent: 'flex-end' },
});
