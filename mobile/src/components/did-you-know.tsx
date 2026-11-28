import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Mascot } from '@/components/mascot';
import { PushButton } from '@/components/push-button';
import { useStrings } from '@/i18n';
import { useContent } from '@/i18n/content';
import { useDailyFact, useFactSeen, type DailyFact } from '@/lib/daily-facts';
import { useLanguage } from '@/lib/preferences';
import type { ProgrammeState } from '@/lib/programme';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { useTheme } from '@/theme';

/**
 * "Did you know?" -- the fun fact of the day, behind a bulb.
 *
 * Sofia, 25 November: "a toggle that they can click in, did you know, or fact
 * for the day." Theo: "on the side, so it's not too overwhelming." Sneha, 28
 * November: the week's lesson a part a day; make it fun, with pictures and the
 * mascot, so it is easy to remember -- and out of the scroll.
 *
 * So Today carries a small 💡 in its top-right corner. It glows and pulses
 * until today's fact has been opened. Tapping it opens the fact as a card:
 * the mascot in the pose picked for that fact, the fact's own picture, its one
 * number drawn big, the fact, and a dot for each part of the week's lesson so
 * far (`lib/daily-facts.ts`, seeds 0019 and 0020). The astronaut is the
 * illustration: the fact sits on the card, never in its speech bubble
 * (`mascot-copy.ts`). Nothing shows before day one or after day 28.
 */

export function FactButton({
  programme,
  testID = 'fact-button',
}: {
  programme: ProgrammeState | null;
  testID?: string;
}) {
  const { colors } = useTheme();
  const t = useStrings();
  const state = useDailyFact(programme);
  const fact = state.status === 'ready' ? state.fact : null;
  const [seen, markSeen] = useFactSeen(fact ? `${fact.week}-${fact.day}` : null);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const glow = fact !== null && !seen;

  useEffect(() => {
    if (glow && !reduceMotion) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.14, { duration: 520 }), withTiming(1, { duration: 520 })),
        -1
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [glow, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (fact === null) return null;

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
          markSeen();
        }}
        accessibilityRole="button"
        accessibilityLabel={glow ? t.weekly.newFact : t.weekly.funFact}
        testID={testID}
        hitSlop={6}
      >
        <Animated.View
          style={[
            styles.bulb,
            {
              backgroundColor: glow ? colors.pisang : colors['pisang-tint'],
              borderColor: colors['pisang-deep'],
            },
            pulseStyle,
          ]}
        >
          <Text style={styles.bulbIcon}>💡</Text>
          {glow && (
            <View
              testID={`${testID}-new`}
              style={[styles.newDot, { backgroundColor: colors.cabai, borderColor: colors.surface }]}
            />
          )}
        </Animated.View>
      </Pressable>
      {open && <FactSheet fact={fact} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The fact itself, as a card over the screen. Drawn and tested on its own. */
export function FactSheet({
  fact,
  onClose,
  testID = 'fact-sheet',
}: {
  fact: DailyFact;
  onClose: () => void;
  testID?: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const content = useContent();
  const language = useLanguage();
  const reduceMotion = useReduceMotion();
  const w = t.weekly;
  const text = language === 'id' && fact.factId ? fact.factId : fact.fact;
  const headline = language === 'id' && fact.headlineId ? fact.headlineId : fact.headline;
  const longHeadline = (headline ?? '').length > 10;

  return (
    <Modal visible transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.host} accessibilityViewIsModal testID={testID}>
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.langit, opacity: 0.55 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={w.gotIt}
          testID={`${testID}-scrim`}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-raised'],
              borderRadius: radius['radius-xl'],
              padding: spacing['space-4'],
              gap: spacing['space-3'],
            },
          ]}
        >
          {/* The picture: the mascot, the fact's own emoji, its number. */}
          <View
            style={[
              styles.picture,
              { backgroundColor: colors['langit-tint'], borderRadius: radius['radius-lg'] },
            ]}
          >
            <Mascot pose={fact.pose} size={132} motion={reduceMotion ? 'none' : 'enter'} />
            <View style={styles.pictureRight}>
              {fact.emoji !== null && (
                <Text testID={`${testID}-emoji`} style={styles.emoji}>
                  {fact.emoji}
                </Text>
              )}
              {headline !== null && (
                <Text
                  testID={`${testID}-headline`}
                  style={[
                    longHeadline ? typography['heading-l'] : typography['display-m'],
                    { color: colors['pisang-deep'], textAlign: 'center' },
                  ]}
                >
                  {headline}
                </Text>
              )}
            </View>
          </View>

          <View style={{ gap: 2 }}>
            <Text style={[typography.label, { color: colors['air-deep'] }]}>💡 {w.didYouKnow}</Text>
            <Text testID={`${testID}-day`} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
              {w.dayOf(fact.day, fact.week)}
            </Text>
          </View>

          <Text testID={`${testID}-fact`} style={[typography['body-l'], { color: colors.ink }]}>
            {text}
          </Text>

          <View style={{ gap: 6 }}>
            <View
              style={styles.dots}
              accessible
              accessibilityLabel={w.partsCovered(fact.day)}
              testID={`${testID}-dots`}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <View
                  key={d}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: d <= fact.day ? colors['air-deep'] : 'transparent',
                      borderColor: colors['air-deep'],
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
              {w.fromLesson(content(fact.topic) ?? fact.topic)}
            </Text>
          </View>

          <PushButton label={`${w.gotIt} 👍`} fullWidth onPress={onClose} testID={`${testID}-close`} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bulb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbIcon: { fontSize: 22, lineHeight: 26 },
  newDot: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  card: { width: '90%', maxWidth: 420 },
  picture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  pictureRight: { flex: 1, alignItems: 'center', gap: 4 },
  emoji: { fontSize: 52, lineHeight: 62 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
