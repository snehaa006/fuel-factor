import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useContent } from '@/i18n/content';
import { useDailyFact, type DailyFact } from '@/lib/daily-facts';
import { useLanguage } from '@/lib/preferences';
import type { ProgrammeState } from '@/lib/programme';
import { useTheme } from '@/theme';

/**
 * "Did you know?" -- the fact of the day.
 *
 * Sofia, 25 November: "maybe it could be a toggle that they can click in, did
 * you know, or fact for the day." Theo wanted the facts "on the side, so it's
 * not too overwhelming". Sneha, 28 November: the week's lesson taught over its
 * seven days, a part a day.
 *
 * So each day of a programme week shows one short fact from that week's
 * lesson, in the lesson's order (`lib/daily-facts.ts`, seed 0019): by day 7
 * the athlete has had the whole lesson in seven small pieces. The dots show
 * how far through the week's lesson today is. The fact is shown, not hidden;
 * the toggle folds it away for an athlete who would rather not see it.
 * Nothing shows before day one or after day 28.
 */

export type DidYouKnowProps = {
  programme: ProgrammeState | null;
  testID?: string;
};

export function DidYouKnow({ programme, testID = 'did-you-know' }: DidYouKnowProps) {
  const state = useDailyFact(programme);
  if (state.status !== 'ready') return null;
  return <FactCard fact={state.fact} testID={testID} />;
}

/** The card itself, separate so it can be drawn and tested without a network. */
export function FactCard({ fact, testID = 'did-you-know' }: { fact: DailyFact; testID?: string }) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const content = useContent();
  const language = useLanguage();
  const w = t.weekly;
  const [open, setOpen] = useState(true);
  const text = language === 'id' && fact.factId ? fact.factId : fact.fact;

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['langit-tint'],
          borderColor: colors.hairline,
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        },
      ]}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? w.hideFact : w.showFact}
        testID={`${testID}-toggle`}
        hitSlop={8}
        style={styles.head}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typography.label, { color: colors['air-deep'] }]}>{w.didYouKnow}</Text>
          <Text testID={`${testID}-day`} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {w.dayOf(fact.day, fact.week)}
          </Text>
        </View>
        <Text style={[typography['heading-m'], { color: colors['air-deep'] }]}>{open ? '−' : '+'}</Text>
      </Pressable>

      {open && (
        <View style={{ gap: spacing['space-2'] }}>
          <Text testID={`${testID}-fact`} style={[typography['body-l'], { color: colors.ink }]}>
            {text}
          </Text>
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
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            {w.fromLesson(content(fact.topic) ?? fact.topic)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
