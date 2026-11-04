import { StyleSheet, Text, View } from 'react-native';

import type { CarbBand } from '@/lib/targets';
import { useTheme } from '@/theme';

export type ProteinBarProps = {
  eaten: number;
  /** The Week 2 deck's 1.6–2.2 g/kg, or null without a weight. */
  band: CarbBand | null;
  /** Items logged that carry no protein figure, so the total is a floor. */
  itemsWithoutFigures: number;
  testID?: string;
};

/**
 * Today's protein against the Week 2 deck's daily band.
 *
 * A bar rather than a second ring: the ring is the day's main figure and has
 * been since week 1, and two rings side by side read as two equal goals. The
 * band is drawn as a band, exactly as the carb ring draws one -- the deck set
 * a range, not a midpoint.
 *
 * It says nothing about whether the athlete is short. Below the band is
 * visible on the bar; turning it into a verdict is what the advice cards do,
 * and they only say the deck's own sentences.
 */
export function ProteinBar({ eaten, band, itemsWithoutFigures, testID }: ProteinBarProps) {
  const { colors, radius, spacing, typography } = useTheme();

  // The scale runs a little past the band's top so the band sits inside it.
  const scaleMax = band ? band.max * 1.25 : Math.max(eaten, 1);
  const pct = (g: number) => `${Math.min(100, (g / scaleMax) * 100)}%` as const;

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>PROTEIN TODAY</Text>
        <Text testID={testID ? `${testID}-eaten` : undefined} style={[typography['heading-m'], { color: colors.ink }]}>
          {Math.round(eaten)} g
        </Text>
      </View>

      <View
        style={[styles.track, { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-pill'] }]}
        accessibilityRole="progressbar"
        accessibilityLabel={
          band
            ? `${Math.round(eaten)} grams of protein. The programme's band is ${band.min} to ${band.max} grams.`
            : `${Math.round(eaten)} grams of protein.`
        }
      >
        {band && (
          <View
            testID={testID ? `${testID}-band` : undefined}
            style={[
              styles.band,
              {
                left: pct(band.min),
                width: `${((band.max - band.min) / scaleMax) * 100}%`,
                backgroundColor: colors['daun-tint'],
                borderColor: colors['daun-deep'],
              },
            ]}
          />
        )}
        <View
          style={[
            styles.fill,
            { width: pct(eaten), backgroundColor: colors.air, borderRadius: radius['radius-pill'] },
          ]}
        />
      </View>

      <Text testID={testID ? `${testID}-band-text` : undefined} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
        {band
          ? `Target ${band.min}–${band.max} g a day`
          : 'Add your weight to see a target.'}
      </Text>
      {itemsWithoutFigures > 0 && (
        <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
          +{itemsWithoutFigures} {itemsWithoutFigures === 1 ? 'item' : 'items'} without a figure
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 14, overflow: 'hidden', position: 'relative' },
  band: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 2, borderRightWidth: 2 },
  fill: { position: 'absolute', left: 0, top: 3, bottom: 3 },
});
