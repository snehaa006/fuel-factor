import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Mascot } from '@/components/mascot';
import { RichText } from '@/components/rich-text';
import { StackCard } from '@/components/stack-card';
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

/** A bulb with three rays, drawn flat, for the top of the fact card. */
function BulbRays({ color, ink }: { color: string; ink: string }) {
  return (
    <Svg width={46} height={46} viewBox="0 0 48 48" fill="none">
      <Path d="M24 4v5M9 11l3.5 3.5M39 11l-3.5 3.5M4 25h5M44 25h-5" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path
        d="M24 13a10 10 0 0 0-6 18c1 .8 1.5 1.8 1.5 3v1h9v-1c0-1.2.5-2.2 1.5-3a10 10 0 0 0-6-18Z"
        fill={color}
        stroke={ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M20 39h8M21 43h6" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * The fact itself, as a card over the screen: the printed "did you know?"
 * card -- a cream card with a dark outline lying on a teal one, a bulb, the
 * heading in the chunky display face, a plain title, the fact with its key
 * point in bold, one thing to try, and the mascot at the foot beside which
 * day of the week's lesson this is. Drawn and tested on its own.
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
  const { colors, spacing, typography } = useTheme();
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

  return (
    <Modal visible transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.host} accessibilityViewIsModal testID={testID}>
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.langit, opacity: 0.6 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={w.gotIt}
          testID={`${testID}-scrim`}
        />
        <StackCard
          color={colors['surface-raised']}
          shadow={colors.air}
          border={colors.ink}
          style={styles.card}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing['space-5'], gap: spacing['space-3'] }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topRow}>
              <BulbRays color={colors.pisang} ink={colors.ink} />
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={w.gotIt}
                testID={`${testID}-x`}
                hitSlop={8}
                style={[styles.closeX, { backgroundColor: colors.ink }]}
              >
                <Text style={[styles.closeXText, { color: colors['surface-raised'] }]}>✕</Text>
              </Pressable>
            </View>

            <Text style={[typography['display-l'], { color: colors.pisang }]}>{w.didYouKnow}</Text>

            {title !== null && (
              <Text testID={`${testID}-title`} style={[typography['heading-l'], { color: colors.ink }]}>
                {title}
              </Text>
            )}

            <RichText
              testID={`${testID}-fact`}
              text={text}
              style={[typography['body-l'], { color: colors.ink }]}
              strongStyle={{ fontFamily: typography['heading-m'].fontFamily }}
            />

            {tip !== null && (
              <Text testID={`${testID}-tip`} style={[typography['body-m'], { color: colors.ink }]}>
                <Text style={{ fontFamily: typography['heading-m'].fontFamily }}>{w.tryThisInline} </Text>
                {tip}
              </Text>
            )}

            <View style={[styles.foot, { marginTop: spacing['space-2'] }]}>
              <Mascot pose={fact.pose} size={64} motion={reduceMotion ? 'none' : 'enter'} />
              <View style={{ flex: 1 }} accessible accessibilityLabel={w.partsCovered(fact.day)} testID={`${testID}-dots`}>
                <Text testID={`${testID}-day`} style={[typography['body-s'], { color: colors.ink }]}>
                  {w.dayOf(fact.day, fact.week)}
                </Text>
                <Text numberOfLines={2} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                  {content(fact.topic) ?? fact.topic}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                testID={`${testID}-close`}
                style={({ pressed }) => [
                  styles.gotIt,
                  { backgroundColor: colors.ink, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[typography.button, { color: colors['surface-raised'] }]}>{w.gotIt}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </StackCard>
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
  card: { width: '90%', maxWidth: 400, maxHeight: '88%' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  closeX: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeXText: { fontSize: 16, lineHeight: 18, fontWeight: '700' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gotIt: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
});
