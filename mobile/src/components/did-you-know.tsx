import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import type { ProgrammeState } from '@/lib/programme';
import { useCards } from '@/lib/use-learn';
import { factFor, factsFrom, weekOfProgramme, type Fact } from '@/lib/weekly';
import { useTheme } from '@/theme';

/**
 * "Did you know?" -- one fact a day, folded until tapped.
 *
 * Sofia, 25 November: "maybe it could be a toggle that they can click in, did
 * you know, or fact for the day." Theo wanted the fun facts "on the side, so
 * it's not too overwhelming", which is why it starts folded: it costs a line
 * of Today until somebody wants it.
 *
 * The fact is one of the current week's statistic cards, figure and caption
 * as the deck prints them, with the week it came from. Not the mascot's to
 * say: a figure about food in the character's mouth is the thing
 * `mascot-copy.ts` exists to prevent. Once the programme is over, the facts
 * of all four weeks take turns.
 */

export type DidYouKnowProps = {
  programme: ProgrammeState | null;
  onOpenLesson?: (week: number) => void;
  testID?: string;
};

export function DidYouKnow({ programme, onOpenLesson, testID = 'did-you-know' }: DidYouKnowProps) {
  const week = weekOfProgramme(programme);
  const weeksKey = week === null || week < 1 ? '' : week > 4 ? '1,2,3,4' : String(week);
  const cards = useCards(weeksKey);

  if (weeksKey === '' || programme === null || programme.status !== 'open') return null;
  if (cards.status !== 'ready') return null;

  const facts = Object.entries(cards.cards).flatMap(([w, list]) => factsFrom(list, Number(w)));
  const fact = factFor(facts, programme.day);
  if (fact === null) return null;

  return <FactCard fact={fact} onOpenLesson={onOpenLesson} testID={testID} />;
}

/** The card itself, separate so it can be drawn and tested without a network. */
export function FactCard({
  fact,
  onOpenLesson,
  testID = 'did-you-know',
}: {
  fact: Fact;
  onOpenLesson?: (week: number) => void;
  testID?: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const w = t.weekly;
  const [open, setOpen] = useState(false);

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
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: colors['air-deep'] }]}>{w.didYouKnow}</Text>
          {!open && (
            <Text style={[typography['body-m'], { color: colors.ink }]}>{w.tapToSee}</Text>
          )}
        </View>
        <Text style={[typography['heading-m'], { color: colors['air-deep'] }]}>{open ? '−' : '+'}</Text>
      </Pressable>

      {open && (
        <View testID={`${testID}-fact`} style={{ gap: spacing['space-1'] }}>
          <Text style={[typography['display-m'], { color: colors.ink }]}>{fact.value}</Text>
          <Text style={[typography['body-l'], { color: colors.ink }]}>{fact.label}</Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'], marginTop: spacing['space-1'] }]}>
            {w.fromWeek(fact.week, fact.heading)}
          </Text>
          {w.deckWords !== '' && (
            <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>{w.deckWords}</Text>
          )}
          {onOpenLesson !== undefined && (
            <Pressable
              onPress={() => onOpenLesson(fact.week)}
              accessibilityRole="link"
              testID={`${testID}-lesson`}
              style={{ paddingTop: spacing['space-2'] }}
            >
              <Text style={[typography['body-m'], { color: colors['air-deep'] }]}>{w.readLesson}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
