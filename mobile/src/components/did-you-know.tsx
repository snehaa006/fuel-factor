import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
 * So Today carries a small bulb in its top-right corner, with a dot until
 * today's fact has been opened. Tapping it opens the fact as a card: a thin
 * 7-step bar for the week's lesson, the mascot in the pose picked for that
 * fact beside its one number, a plain title, the fact with its key point in
 * bold, and one thing to try (`lib/daily-facts.ts`, seeds 0019-0021). Kept
 * quiet on purpose -- Sneha, 28 November: "make it subtle". The astronaut is the
 * illustration: the fact sits on the card, never in its speech bubble
 * (`mascot-copy.ts`). Nothing shows before day one or after day 28.
 */

/** A plain line-drawn bulb, sized for the 44px button. */
function BulbIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1.1 1.4 1.1 2.3v.1h5.8v-.1c0-.9.4-1.7 1.1-2.3A6.5 6.5 0 0 0 12 2.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
  const glow = fact !== null && !seen;

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
        <View
          style={[
            styles.bulb,
            { backgroundColor: colors['surface-raised'], borderColor: colors.hairline },
          ]}
        >
          <BulbIcon color={glow ? colors['pisang-deep'] : colors['ink-muted']} />
          {glow && (
            <View
              testID={`${testID}-new`}
              style={[styles.newDot, { backgroundColor: colors.pisang, borderColor: colors.surface }]}
            />
          )}
        </View>
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
                      { backgroundColor: d <= fact.day ? colors['pisang-deep'] : colors.hairline },
                    ]}
                  />
                ))}
              </View>
              <Text testID={`${testID}-day`} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                {w.dayOf(fact.day, fact.week)}
              </Text>
            </View>

            {/* The picture: the mascot, the fact's own emoji, its number. */}
            <View
              style={[
                styles.picture,
                { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-lg'] },
              ]}
            >
              <Mascot pose={fact.pose} size={104} motion={reduceMotion ? 'none' : 'enter'} />
              {headline !== null && (
                <Text
                  testID={`${testID}-headline`}
                  style={[
                    longHeadline ? typography['heading-l'] : typography['display-m'],
                    styles.headline,
                    { color: colors['pisang-deep'] },
                  ]}
                >
                  {headline}
                </Text>
              )}
            </View>

            <View style={{ gap: spacing['space-1'] }}>
              <Text style={[typography.label, { color: colors['air-deep'] }]}>{w.didYouKnow}</Text>
              {title !== null && (
                <Text
                  testID={`${testID}-title`}
                  style={[typography['heading-l'], { color: colors.ink }]}
                >
                  {title}
                </Text>
              )}
            </View>

            <RichText
              testID={`${testID}-fact`}
              text={text}
              style={[typography['body-l'], { color: colors.ink }]}
              strongStyle={{ fontFamily: typography['heading-m'].fontFamily }}
            />

            {tip !== null && (
              <View
                testID={`${testID}-tip`}
                style={[styles.tip, { borderLeftColor: colors.daun, paddingLeft: spacing['space-3'] }]}
              >
                <Text style={[typography.label, { color: colors['daun-deep'] }]}>{w.tryThis}</Text>
                <Text style={[typography['body-m'], { color: colors.ink }]}>{tip}</Text>
              </View>
            )}

            <PushButton label={w.gotIt} fullWidth onPress={onClose} testID={`${testID}-close`} />

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
  newDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  card: { width: '92%', maxWidth: 420, maxHeight: '90%', overflow: 'hidden' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  picture: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 12 },
  headline: { flex: 1, textAlign: 'center' },
  tip: { borderLeftWidth: 3, gap: 2 },
});
