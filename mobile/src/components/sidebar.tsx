import { useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/lib/use-reduce-motion';
import { useTheme } from '@/theme';

/**
 * The app's navigation drawer.
 *
 * Hand-built rather than `@react-navigation/drawer`. A drawer navigator means
 * replacing the root Stack, which every screen and every screen test is
 * written against, and the gain would be an edge-swipe the squad does not need
 * on a six-item menu. This also behaves the same in the single-page web build,
 * which is where the coach opens the dashboard.
 *
 * Today used to carry six stacked ghost buttons under the day's content, which
 * is where navigation goes when a screen has nowhere to put it. They live here
 * now, and Profile joins them at the top.
 *
 * It animates from the left and has a still version: the panel simply appears
 * under reduced motion, because a panel sliding across the screen is exactly
 * the kind of movement that setting exists to stop.
 */

export type SidebarItem = {
  key: string;
  label: string;
  /** A second line, where the item needs one. */
  detail?: string;
  onPress: () => void;
  /** Draws the item as the page you are already on. */
  current?: boolean;
};

export type SidebarProps = {
  open: boolean;
  onClose: () => void;
  /** The name at the top of the panel: the athlete, or the squad. */
  title: string;
  subtitle?: string;
  items: SidebarItem[];
  testID?: string;
};

const PANEL_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);
const SLIDE = { duration: 180, easing: Easing.out(Easing.cubic) };

export function Sidebar({ open, onClose, title, subtitle, items, testID }: SidebarProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const reduceMotion = useReduceMotion();

  // 0 closed, 1 open. One value drives both the panel and the scrim, so they
  // cannot disagree about how open the thing is.
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    const target = open ? 1 : 0;
    progress.value = reduceMotion ? target : withTiming(target, SLIDE);
  }, [open, progress, reduceMotion]);

  // Without this the timing keeps running after the screen is gone, which is
  // what left a jest worker refusing to exit when the mascot did the same.
  useEffect(() => () => cancelAnimation(progress), [progress]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -PANEL_WIDTH * (1 - progress.value) }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.5 }));

  // Unmounted when closed, so nothing offscreen can be reached by a swipe or
  // by the accessibility cursor.
  if (!open) return null;

  return (
    <View style={styles.host} testID={testID}>
      <Animated.View style={[styles.scrim, { backgroundColor: colors.langit }, scrimStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close the menu"
          testID={testID ? `${testID}-scrim` : undefined}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { width: PANEL_WIDTH, backgroundColor: colors['surface-raised'] },
          panelStyle,
        ]}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left']}>
          <ScrollView
            contentContainerStyle={{ padding: spacing['space-4'], gap: spacing['space-2'] }}
          >
            <View style={{ marginBottom: spacing['space-4'] }}>
              <Text style={[typography['display-m'], { color: colors.ink }]}>{title}</Text>
              {subtitle !== undefined && (
                <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                  {subtitle}
                </Text>
              )}
            </View>

            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(item.current) }}
                accessibilityLabel={item.label}
                testID={testID ? `${testID}-${item.key}` : undefined}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: item.current
                      ? colors['pisang-tint']
                      : pressed
                        ? colors['surface-sunken']
                        : 'transparent',
                    borderRadius: radius['radius-md'],
                    paddingVertical: spacing['space-3'],
                    paddingHorizontal: spacing['space-3'],
                  },
                ]}
              >
                <Text
                  style={[
                    typography['heading-m'],
                    { color: item.current ? colors['pisang-deep'] : colors.ink },
                  ]}
                >
                  {item.label}
                </Text>
                {item.detail !== undefined && (
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                    {item.detail}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

/** The button that opens the panel. Sits in a screen's header. */
export function SidebarButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open the menu"
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.burger,
        {
          backgroundColor: pressed ? colors['surface-sunken'] : colors['surface-raised'],
          borderRadius: radius['radius-md'],
          padding: spacing['space-2'],
        },
      ]}
    >
      {[0, 1, 2].map((line) => (
        <View key={line} style={[styles.line, { backgroundColor: colors.ink }]} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // react-native 0.88 dropped `absoluteFillObject`; the four edges spelled out
  // are what it was.
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  safe: { flex: 1 },
  item: { gap: 2 },
  burger: { gap: 4, width: 40, alignItems: 'center', justifyContent: 'center', height: 40 },
  line: { width: 18, height: 2, borderRadius: 1 },
});
