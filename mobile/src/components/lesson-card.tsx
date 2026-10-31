import { StyleSheet, Text, View } from 'react-native';

import { GUIDANCE_LABEL, type FoodWithPortions } from '@/lib/food';
import type { LessonCard as Card, LessonPoint } from '@/lib/learn';
import { useTheme, type Theme } from '@/theme';

export type LessonCardProps = {
  card: Card;
  /** The food database, for the deck's Jakarta food table. */
  foods: FoodWithPortions[];
  testID?: string;
};

/**
 * One card of the week's material.
 *
 * Every string drawn here came out of the programme's deck. The component
 * chooses a layout for each kind and nothing else: it writes no copy, rounds
 * no figure and adds no interpretation. Where the deck prints a citation, the
 * citation is drawn with it.
 */
export function LessonCard({ card, foods, testID }: LessonCardProps) {
  const theme = useTheme();
  const { colors, radius, spacing, typography } = theme;

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        },
      ]}
    >
      {card.heading !== null && (
        <Text
          testID={testID ? `${testID}-heading` : undefined}
          style={[typography['heading-l'], { color: colors.ink }]}
        >
          {card.heading}
        </Text>
      )}

      {card.body !== null && (
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>{card.body}</Text>
      )}

      {body(card, foods, theme)}

      {card.sourceNote !== null && (
        <Text
          testID={testID ? `${testID}-source` : undefined}
          style={[typography['body-s'], { color: colors['ink-faint'] }]}
        >
          Source: {card.sourceNote}
        </Text>
      )}
    </View>
  );
}

function body(card: Card, foods: FoodWithPortions[], theme: Theme) {
  switch (card.kind) {
    case 'stats':
      return <Stats points={card.points} theme={theme} />;
    case 'myth_fact':
      return <MythFact points={card.points} theme={theme} />;
    case 'process':
      return <Process points={card.points} theme={theme} />;
    case 'timeline':
      return <Timeline points={card.points} theme={theme} />;
    case 'timing':
    case 'targets':
      return <Blocks points={card.points} theme={theme} />;
    case 'foods':
      return <Foods foods={foods} theme={theme} />;
    case 'references':
      return <References points={card.points} theme={theme} />;
    // intro and challenge are their heading and body, already drawn above.
    default:
      return null;
  }
}

function Stats({ points, theme }: { points: LessonPoint[]; theme: Theme }) {
  const { colors, radius, spacing, typography } = theme;
  return (
    <View style={[styles.grid, { gap: spacing['space-2'] }]}>
      {points.map((p) => (
        <View
          key={p.id}
          style={[
            styles.stat,
            {
              backgroundColor: colors['pisang-tint'],
              borderRadius: radius['radius-md'],
              padding: spacing['space-3'],
            },
          ]}
        >
          <Text style={[typography['display-m'], { color: colors['pisang-deep'] }]}>{p.value}</Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

function MythFact({ points, theme }: { points: LessonPoint[]; theme: Theme }) {
  const { colors, radius, spacing, typography } = theme;
  return (
    <View style={{ gap: spacing['space-3'] }}>
      {points.map((p, i) => {
        // The deck puts the myth first and the fact second, and marks them
        // apart. First is the myth.
        const myth = i === 0;
        return (
          <View
            key={p.id}
            style={{
              backgroundColor: myth ? colors['cabai-tint'] : colors['daun-tint'],
              borderRadius: radius['radius-md'],
              padding: spacing['space-3'],
              gap: spacing['space-1'],
            }}
          >
            <Text
              style={[
                typography.label,
                { color: myth ? colors['cabai-deep'] : colors['daun-deep'] },
              ]}
            >
              {myth ? '✗ ' : '✓ '}
              {p.label}
            </Text>
            <Text style={[typography['body-m'], { color: colors.ink }]}>{p.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Process({ points, theme }: { points: LessonPoint[]; theme: Theme }) {
  const { colors, radius, spacing, typography } = theme;
  return (
    <View style={{ gap: spacing['space-2'] }}>
      {points.map((p, i) => (
        <View key={p.id} style={[styles.step, { gap: spacing['space-3'] }]}>
          <View
            style={[
              styles.stepNumber,
              { backgroundColor: colors['pisang-tint'], borderRadius: radius['radius-pill'] },
            ]}
          >
            <Text style={[typography.label, { color: colors['pisang-deep'] }]}>{i + 1}</Text>
          </View>
          <View style={styles.stepText}>
            <Text style={[typography['body-m'], { color: colors.ink }]}>{p.label}</Text>
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{p.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The glycogen timeline.
 *
 * The bar is drawn from the deck's own percentage, parsed off the value it
 * prints. A value the deck writes some other way gets no bar rather than a
 * bar at a length the app chose.
 */
function Timeline({ points, theme }: { points: LessonPoint[]; theme: Theme }) {
  const { colors, radius, spacing, typography } = theme;
  return (
    <View style={{ gap: spacing['space-2'] }}>
      {points.map((p) => {
        const percent = percentOf(p.value);
        return (
          <View key={p.id} style={{ gap: spacing['space-1'] }}>
            <View style={styles.timelineRow}>
              <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{p.label}</Text>
              <Text style={[typography['body-m'], { color: colors.ink }]}>{p.value}</Text>
            </View>
            <View
              style={[
                styles.track,
                { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-pill'] },
              ]}
            >
              {percent !== null && (
                <View
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor: colors.pisang,
                    borderRadius: radius['radius-pill'],
                  }}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A percentage the deck printed, or null if it printed something else. */
export function percentOf(value: string | null): number | null {
  if (value === null) return null;
  const match = /^~?(\d{1,3})%$/.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 0 && n <= 100 ? n : null;
}

/** Timing and targets: a labelled block, a figure where there is one, a detail. */
function Blocks({ points, theme }: { points: LessonPoint[]; theme: Theme }) {
  const { colors, radius, spacing, typography } = theme;
  return (
    <View style={{ gap: spacing['space-3'] }}>
      {points.map((p) => (
        <View
          key={p.id}
          style={{
            backgroundColor: colors['kecap-tint'],
            borderRadius: radius['radius-md'],
            padding: spacing['space-3'],
            gap: spacing['space-1'],
          }}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{p.label}</Text>
          {p.value !== null && (
            <Text style={[typography['display-m'], { color: colors['kecap-deep'] }]}>
              {p.value}
            </Text>
          )}
          <Text style={[typography['body-s'], { color: colors.ink }]}>{p.detail}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The deck's Jakarta food table, read from the food database.
 *
 * Not copied into the lesson rows: these are the same figures the logger uses,
 * and two copies of a carbohydrate number is one copy too many. A food the
 * deck gives no figure for says so, exactly as it does in the logger.
 */
function Foods({ foods, theme }: { foods: FoodWithPortions[]; theme: Theme }) {
  const { colors, radius, spacing, typography } = theme;
  const registers = ['eat_daily', 'not_the_priority'] as const;

  return (
    <View style={{ gap: spacing['space-4'] }}>
      {registers.map((register) => {
        const inRegister = foods.filter((f) => f.guidance === register);
        if (inRegister.length === 0) return null;

        return (
          <View key={register} style={{ gap: spacing['space-2'] }}>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>
              {GUIDANCE_LABEL[register].toUpperCase()}
            </Text>
            {inRegister.map((food) => {
              const portion = food.food_portions.find((p) => p.is_default) ?? food.food_portions[0];
              const carbs = portion?.carbs_g;
              return (
                <View
                  key={food.id}
                  style={[
                    styles.foodRow,
                    {
                      backgroundColor: colors['surface-sunken'],
                      borderRadius: radius['radius-sm'],
                      padding: spacing['space-2'],
                    },
                  ]}
                >
                  <View style={styles.stepText}>
                    <Text style={[typography['body-m'], { color: colors.ink }]}>
                      {food.name_id}
                      {portion ? ` (${portion.label})` : ''}
                    </Text>
                    {food.guidance_note !== null && (
                      <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                        {food.guidance_note}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      typography['body-s'],
                      { color: carbs === null || carbs === undefined ? colors['ink-faint'] : colors['pisang-deep'] },
                    ]}
                  >
                    {carbs === null || carbs === undefined ? 'No figure yet' : `${carbs}g carbs`}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function References({ points, theme }: { points: LessonPoint[]; theme: Theme }) {
  const { colors, spacing, typography } = theme;
  return (
    <View style={{ gap: spacing['space-2'] }}>
      {points.map((p) => (
        <Text key={p.id} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {p.detail}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { flexGrow: 1, flexBasis: '45%', gap: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNumber: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: 2 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, width: '100%', overflow: 'hidden' },
  foodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
