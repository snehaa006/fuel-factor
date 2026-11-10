import { StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/components/calendar';
import {
  gapHeadline,
  NUTRIENT_LABEL,
  NUTRIENT_SOURCE,
  UNJUDGED_REASON,
  type NutrientGap,
} from '@/lib/gaps';
import { useTheme } from '@/theme';

/**
 * One nutrient's days as bars, against the programme's band.
 *
 * The band is drawn as a band -- a shaded horizontal zone across the whole
 * chart -- and not as a line, because the decks set ranges and a single line
 * would be the app inventing a midpoint. A bar that stops under the zone is
 * the gap, and it is the only thing on this chart that needs explaining.
 *
 * `ProteinBar` already draws one day this way, horizontally, on Today. This is
 * the same idea turned through ninety degrees so a fortnight fits side by
 * side: the question Today answers is "where am I now", and the question here
 * is "where does this keep happening".
 *
 * Built from Views rather than a chart library. The app has no charting
 * dependency and this needs rectangles; adding one for two bar charts would
 * put a native module in the way of the next over-the-air update, which is a
 * real cost in this project (see `lib/clipboard.ts`).
 *
 * **A day that could not be judged is drawn, hollow, and labelled.** Dropping
 * it would make the chart read as a complete fortnight when it is not, and
 * filling it in as zero would be a false accusation. It is the one piece of
 * honesty this screen cannot do without.
 */

export type GapBarsProps = {
  gap: NutrientGap;
  /** Drawn under the bars so a coach can check whose number the band is. */
  showSource?: boolean;
  testID?: string;
};

/** Tall enough to read a shortfall off, short enough for two on one screen. */
const CHART_HEIGHT = 136;

export function GapBars({ gap, showSource = true, testID }: GapBarsProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const label = NUTRIENT_LABEL[gap.nutrient];
  const headline = gapHeadline(gap);

  // The scale has to hold the tallest bar and every band, with a little room
  // above so a day above the band is visibly above it rather than clipped.
  const highest = Math.max(
    1,
    ...gap.days.map((d) => d.eaten),
    ...gap.days.map((d) => d.band?.max ?? 0)
  );
  const scaleMax = highest * 1.15;
  const height = (grams: number) => Math.max(2, (grams / scaleMax) * CHART_HEIGHT);

  // Every judged day shares a band only when the day types do. Carbohydrate's
  // band moves with the day type, so the shaded zone is drawn per bar in that
  // case and once across the chart when it is the same for all of them.
  const shared = gap.typicalBand;

  const reasons = Array.from(
    new Set(gap.days.map((d) => d.unjudged).filter((r): r is NonNullable<typeof r> => r !== null))
  );

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
      <View style={styles.head}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>
          {label.toUpperCase()}
        </Text>
        {gap.meanEaten !== null && (
          <Text
            testID={testID ? `${testID}-mean` : undefined}
            style={[typography['heading-m'], { color: colors.ink }]}
          >
            {gap.meanEaten} g average
          </Text>
        )}
      </View>

      {shared !== null && (
        <Text
          testID={testID ? `${testID}-band` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'] }]}
        >
          The programme asks for {shared.min}–{shared.max} g a day
        </Text>
      )}

      {gap.days.length === 0 ? (
        <Text
          testID={testID ? `${testID}-empty` : undefined}
          style={[typography['body-m'], { color: colors['ink-muted'] }]}
        >
          Nothing logged in this window yet.
        </Text>
      ) : (
        <View
          style={[styles.chart, { height: CHART_HEIGHT }]}
          accessibilityRole="image"
          accessibilityLabel={
            headline ??
            `${label} for ${gap.days.length} days. None of them could be measured against the programme's band.`
          }
        >
          {/* The band across the whole chart, where every day shares one. */}
          {shared !== null && (
            <View
              pointerEvents="none"
              style={[
                styles.zone,
                {
                  bottom: height(shared.min),
                  height: height(shared.max) - height(shared.min),
                  backgroundColor: colors['daun-tint'],
                  borderColor: colors['daun-deep'],
                },
              ]}
            />
          )}

          {gap.days.map((day) => {
            const judged = day.position !== null;
            const fill =
              day.position === 'below'
                ? colors.cabai
                : day.position === 'above'
                  ? colors.pisang
                  : day.position === 'inside'
                    ? colors.daun
                    : 'transparent';

            return (
              <View key={day.date} style={styles.column} testID={testID ? `${testID}-${day.date}` : undefined}>
                {/* Each day's own band, when they differ across the window. */}
                {shared === null && day.band !== null && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.perDayZone,
                      {
                        bottom: height(day.band.min),
                        height: height(day.band.max) - height(day.band.min),
                        backgroundColor: colors['daun-tint'],
                        borderColor: colors['daun-deep'],
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: height(day.eaten),
                      backgroundColor: fill,
                      // A day that could not be judged is an outline, so it
                      // is visibly present and visibly not counted.
                      borderWidth: judged ? 0 : 1.5,
                      borderColor: colors['ink-faint'],
                      borderStyle: judged ? 'solid' : 'dashed',
                      borderRadius: radius['radius-sm'],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      )}

      {gap.days.length > 0 && (
        <View style={styles.axis}>
          {/* First and last only: fourteen rotated dates is unreadable at
              phone width and the chart is about the shape, not the dates. */}
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            {shortDate(gap.days[0].date)}
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            {shortDate(gap.days[gap.days.length - 1].date)}
          </Text>
        </View>
      )}

      {headline !== null && (
        <Text
          testID={testID ? `${testID}-headline` : undefined}
          style={[typography['body-m'], { color: colors.ink }]}
        >
          {headline}
        </Text>
      )}

      {gap.judged === 0 && gap.days.length > 0 && (
        <Text
          testID={testID ? `${testID}-unjudged` : undefined}
          style={[typography['body-m'], { color: colors['ink-muted'] }]}
        >
          None of these days can be measured against the programme&apos;s band yet.
        </Text>
      )}

      {/* Why, named rather than left as a hollow bar nobody can explain. */}
      {reasons.map((reason) => (
        <Text
          key={reason}
          testID={testID ? `${testID}-reason-${reason}` : undefined}
          style={[typography['body-s'], { color: colors['ink-faint'] }]}
        >
          {UNJUDGED_REASON[reason]}
        </Text>
      ))}

      {showSource && (
        <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
          {NUTRIENT_SOURCE[gap.nutrient]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, position: 'relative' },
  zone: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderBottomWidth: 1 },
  perDayZone: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderBottomWidth: 1 },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', position: 'relative' },
  bar: { width: '100%' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
