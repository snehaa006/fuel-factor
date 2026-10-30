import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme';
import type { CarbBand } from '@/lib/targets';

const SIZE = 220;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type FuelRingProps = {
  /** Carbohydrate logged so far, in grams. */
  eaten: number;
  /** The programme's band for today, or null when it cannot be computed. */
  band: CarbBand | null;
  /** Logged items whose portion carries no carbohydrate figure yet. */
  itemsWithoutFigures?: number;
  testID?: string;
};

/** Fraction of the ring an amount occupies, clamped to the track. */
function fraction(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.max(0, Math.min(1, value / scaleMax));
}

export type RingGeometry = {
  /** Where the shaded band starts, as a fraction of the ring. */
  bandStart: number;
  /** How far the fill reaches, as a fraction of the ring. */
  eatenFraction: number;
  circumference: number;
};

/**
 * The ring's arcs, as plain numbers.
 *
 * Separated from the drawing so the clamping can be tested: react-native-svg
 * does not surface a testID on a Circle, so an assertion against the rendered
 * element would pass whatever the component drew.
 */
export function ringGeometry(eaten: number, band: CarbBand | null): RingGeometry {
  // The top of the band is a full ring. Without a band there is nothing to
  // scale against, so the track stays empty rather than inventing an endpoint.
  if (!band) return { bandStart: 0, eatenFraction: 0, circumference: CIRCUMFERENCE };
  return {
    bandStart: fraction(band.min, band.max),
    eatenFraction: fraction(eaten, band.max),
    circumference: CIRCUMFERENCE,
  };
}

/**
 * The circular gap metric Sofia asked for: "this is ideal, this is where you
 * stand."
 *
 * The band is drawn as a band. The Week 1 deck gives 5-7 g/kg and 3-4 g/kg, and
 * collapsing either to a single number would invent a target the programme
 * never set, so the ring carries a shaded zone from the bottom of the band to
 * the top of it and the fill runs underneath.
 */
export function FuelRing({ eaten, band, itemsWithoutFigures = 0, testID }: FuelRingProps) {
  const { colors, typography } = useTheme();

  const { bandStart, eatenFraction } = ringGeometry(eaten, band);

  const dash = (from: number, to: number) => {
    const length = Math.max(0, to - from) * CIRCUMFERENCE;
    return {
      strokeDasharray: [length, CIRCUMFERENCE] as [number, number],
      strokeDashoffset: -from * CIRCUMFERENCE,
    };
  };

  const bandArc = dash(bandStart, 1);
  const fillArc = dash(0, eatenFraction);

  return (
    <View style={styles.wrapper} testID={testID}>
      <View style={styles.dial}>
      <Svg width={SIZE} height={SIZE} accessibilityElementsHidden importantForAccessibility="no">
        {/* Rotated so zero sits at the top and the ring fills clockwise. */}
        <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors['surface-sunken']}
            strokeWidth={STROKE}
            fill="none"
          />
          {band && (
            <Circle
              testID={testID ? `${testID}-band` : undefined}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors['pisang-tint']}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={bandArc.strokeDasharray}
              strokeDashoffset={bandArc.strokeDashoffset}
            />
          )}
          {eatenFraction > 0 && (
            <Circle
              testID={testID ? `${testID}-fill` : undefined}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.pisang}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={fillArc.strokeDasharray}
              strokeDashoffset={fillArc.strokeDashoffset}
            />
          )}
        </G>
      </Svg>

      <View style={styles.centre} pointerEvents="none">
        <Text
          testID={testID ? `${testID}-value` : undefined}
          style={[typography['stat-hero'], { color: colors.ink }]}
        >
          {Math.round(eaten)}
        </Text>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>G CARBS</Text>
        <Text
          testID={testID ? `${testID}-band-label` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'], marginTop: 2 }]}
        >
          {band ? `of ${band.min}–${band.max} g` : 'no target set'}
        </Text>
      </View>
      </View>

      {itemsWithoutFigures > 0 && (
        <Text
          testID={testID ? `${testID}-unknown` : undefined}
          style={[typography['body-s'], styles.footnote, { color: colors['ink-muted'] }]}
        >
          {`plus ${itemsWithoutFigures} item${itemsWithoutFigures === 1 ? '' : 's'} with no figure yet`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  dial: { width: SIZE, height: SIZE },
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { marginTop: 8, textAlign: 'center' },
});
