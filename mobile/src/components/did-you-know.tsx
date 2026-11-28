import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { RichText } from '@/components/rich-text';
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

/**
 * The fact itself, as a card over the screen -- built to be read at a glance,
 * the way Duolingo teaches: a chunky 7-step bar for the week's lesson, the
 * picture with its one number, a short bold title, the fact with its key
 * words highlighted, and one thing to try. Drawn and tested on its own.
 */
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
  const inId = language === 'id';
  const pick = (en: string | null, id: string | null) => (inId && id ? id : en);
  const text = pick(fact.fact, fact.factId) ?? fact.fact;
  const title = pick(fact.title, fact.titleId);
  const tip = pick(fact.tip, fact.tipId);
  const headline = pick(fact.headline, fact.headlineId);
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
            { backgroundColor: colors['surface-raised'], borderRadius: radius['radius-xl'] },
          ]}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing['space-4'], gap: spacing['space-3'] }}
            showsVerticalScrollIndicator={false}
          >
            {/* The week's lesson as a 7-step bar: one step a day. */}
            <View
              style={styles.progressRow}
              accessible
              accessibilityLabel={w.partsCovered(fact.day)}
              testID={`${testID}-dots`}
            >
              <View style={styles.segments}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <View
                    key={d}
                    style={[
                      styles.segment,
                      { backgroundColor: d <= fact.day ? colors.pisang : colors['surface-sunken'] },
                    ]}
                  />
                ))}
              </View>
              <Text testID={`${testID}-day`} style={[typography.label, { color: colors['pisang-deep'] }]}>
                {w.progress(fact.day)}
              </Text>
            </View>

            {/* The picture: the mascot, the fact's own emoji, its number. */}
            <View
              style={[
                styles.picture,
                { backgroundColor: colors['langit-tint'], borderRadius: radius['radius-lg'] },
              ]}
            >
              <Mascot pose={fact.pose} size={120} motion={reduceMotion ? 'none' : 'enter'} />
              <View style={styles.pictureRight}>
                {fact.emoji !== null && (
                  <Text testID={`${testID}-emoji`} style={styles.emoji}>
                    {fact.emoji}
                  </Text>
                )}
                {headline !== null && (
                  <View
                    style={[
                      styles.headlinePill,
                      { backgroundColor: colors.pisang, borderColor: colors['pisang-deep'] },
                    ]}
                  >
                    <Text
                      testID={`${testID}-headline`}
                      style={[
                        longHeadline ? typography['heading-m'] : typography['display-m'],
                        { color: colors['on-bright'], textAlign: 'center' },
                      ]}
                    >
                      {headline}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ gap: spacing['space-1'] }}>
              <View style={styles.eyebrowRow}>
                <Text style={[typography.label, { color: colors['air-deep'] }]}>💡 {w.didYouKnow}</Text>
                <Text style={[typography.label, { color: colors['ink-muted'] }]}>
                  {w.weekShort(fact.week)}
                </Text>
              </View>
              {title !== null && (
                <Text
                  testID={`${testID}-title`}
                  style={[typography['heading-l'], styles.title, { color: colors.ink }]}
                >
                  {title}
                </Text>
              )}
            </View>

            <RichText
              testID={`${testID}-fact`}
              text={text}
              style={[typography['body-l'], { color: colors.ink }]}
              strongStyle={{
                fontFamily: typography['heading-m'].fontFamily,
                color: colors['pisang-deep'],
                backgroundColor: colors['pisang-tint'],
              }}
            />

            {tip !== null && (
              <View
                testID={`${testID}-tip`}
                style={[
                  styles.tip,
                  {
                    backgroundColor: colors['daun-tint'],
                    borderColor: colors.daun,
                    borderRadius: radius['radius-lg'],
                    padding: spacing['space-3'],
                  },
                ]}
              >
                <Text style={styles.tipIcon}>✅</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[typography.label, { color: colors['daun-deep'] }]}>{w.tryThis}</Text>
                  <Text style={[typography['heading-m'], { color: colors.ink }]}>{tip}</Text>
                </View>
              </View>
            )}

            <PushButton label={`${w.gotIt} 👍`} fullWidth onPress={onClose} testID={`${testID}-close`} />

            <Text style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}>
              {w.fromLesson(content(fact.topic) ?? fact.topic)}
            </Text>
          </ScrollView>
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
  card: { width: '92%', maxWidth: 420, maxHeight: '90%', overflow: 'hidden' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 10, borderRadius: 5 },
  picture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  pictureRight: { flex: 1, alignItems: 'center', gap: 8 },
  emoji: { fontSize: 56, lineHeight: 66 },
  headlinePill: { borderRadius: 999, borderWidth: 2, borderBottomWidth: 4, paddingHorizontal: 14, paddingVertical: 6 },
  title: { fontSize: 23, lineHeight: 29 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5 },
  tipIcon: { fontSize: 22 },
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
