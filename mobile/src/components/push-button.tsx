import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EDGE_HEIGHT, motion, useTheme, type ColorToken } from '@/theme';

export type PushButtonVariant = 'primary' | 'success' | 'alert' | 'ghost';

type VariantSpec = {
  fill: ColorToken;
  label: ColorToken;
  edge: ColorToken;
  border?: ColorToken;
};

/**
 * Straight from the design system's PushButton guidelines. pisang and daun stay
 * bright in both themes, so their label is on-bright, which is dark in both — using
 * ink would flip it to cream in dark mode and drop the contrast to 1.6:1.
 */
const VARIANTS: Record<PushButtonVariant, VariantSpec> = {
  primary: { fill: 'pisang', label: 'on-bright', edge: 'pisang-edge' },
  success: { fill: 'daun', label: 'on-bright', edge: 'daun-edge' },
  alert: { fill: 'fill-alert', label: 'on-fill', edge: 'cabai-edge' },
  ghost: { fill: 'surface', label: 'ink', edge: 'hairline', border: 'hairline' },
};

export type PushButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: PushButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The app's signature control: a solid slab sitting on an under-edge in its own
 * darker shade, which it drops onto when pressed.
 *
 * React Native has no offset box-shadow, so the edge is a sibling View behind
 * the slab. Only the slab moves; the edge stays put and is progressively
 * covered, which is the physical effect the design system describes.
 */
export function PushButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
  testID,
}: PushButtonProps) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        // Not available on every platform; the animation is a progressive enhancement.
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  // Not wrapped in useCallback: the React Compiler memoises these already, and
  // passing a shared value into a hook's dependency list then mutating it trips
  // the compiler's immutability rule.
  function handlePressIn() {
    if (disabled) return;
    translateY.value = reduceMotion ? EDGE_HEIGHT : withTiming(EDGE_HEIGHT, motion.pressIn);
    if (Platform.OS !== 'web') {
      // Fire and forget: a device without a taptic engine must not break the press.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  function handlePressOut() {
    if (disabled) return;
    translateY.value = reduceMotion ? 0 : withSpring(0, motion.pressOut);
  }

  const slabAnimation = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const spec = VARIANTS[variant];
  const { colors, radius, typography } = theme;
  const cornerRadius = radius['radius-lg'];

  // The ghost slab is filled with the page colour rather than left transparent:
  // the under-edge sits behind the whole slab, so a see-through fill shows it as
  // a solid block instead of an outline.
  const fillColor = disabled ? colors.locked : colors[spec.fill];
  const labelColor = disabled ? colors['ink-faint'] : colors[spec.label];
  const borderColor = spec.border ? colors[spec.border] : undefined;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <View
        style={[
          styles.wrapper,
          fullWidth && styles.fullWidth,
          { paddingBottom: disabled ? 0 : EDGE_HEIGHT },
          style,
        ]}
      >
        {!disabled && (
          <View
            testID={testID ? `${testID}-edge` : undefined}
            style={[
              styles.edge,
              { top: EDGE_HEIGHT, backgroundColor: colors[spec.edge], borderRadius: cornerRadius },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.slab,
            {
              backgroundColor: fillColor,
              borderRadius: cornerRadius,
              paddingHorizontal: theme.spacing['space-5'],
            },
            borderColor ? { borderWidth: 2, borderColor } : null,
            slabAnimation,
          ]}
        >
          <Text numberOfLines={1} style={[typography.button, { color: labelColor }]}>
            {label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  slab: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
