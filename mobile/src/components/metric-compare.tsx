import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import { change, type Metric } from '@/lib/progress';

export type MetricCompareProps = {
  metric: Metric;
  testID?: string;
};

/** The number, or the word for not having one. */
function reading(value: number | null, unit: string | null): string {
  if (value === null) return '—';
  return unit === '% of days' ? `${value}%` : `${value}`;
}

/**
 * One measure, baseline against now.
 *
 * Deliberately verdict-free. There is no green, no red, no arrow and no word
 * like "improved": which direction is better is a nutrition judgement the
 * programme has not made for any of these, and a colour would make it anyway.
 * The row prints both figures, the arithmetic between them, and how many
 * readings each came from -- so a single day never reads as a trend.
 *
 * A measure with no baseline says why, which on this screen is the finding
 * rather than an error: fluid has never been collected, and the recall's meal
 * text has not been exported.
 */
export function MetricCompare({ metric, testID }: MetricCompareProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const delta = change(metric);
  const missing = metric.baseline.value === null;

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors['surface-raised'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-4'],
        gap: spacing['space-3'],
      }}
    >
      <View style={styles.header}>
        <Text style={[typography['heading-m'], { color: colors.ink }]}>{metric.label}</Text>
        {metric.unit !== null && (
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>{metric.unit}</Text>
        )}
      </View>

      <View style={[styles.pair, { gap: spacing['space-4'] }]}>
        <View style={styles.side}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>BASELINE</Text>
          <Text
            testID={testID ? `${testID}-baseline` : undefined}
            style={[typography['display-m'], { color: missing ? colors['ink-faint'] : colors.ink }]}
          >
            {reading(metric.baseline.value, metric.unit)}
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            {metric.baseline.days === 0 ? 'not measured' : `${metric.baseline.days} days`}
          </Text>
        </View>

        <View style={styles.side}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>NOW</Text>
          <Text
            testID={testID ? `${testID}-current` : undefined}
            style={[
              typography['display-m'],
              { color: metric.current.value === null ? colors['ink-faint'] : colors.ink },
            ]}
          >
            {reading(metric.current.value, metric.unit)}
          </Text>
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            {metric.current.days === 0 ? 'not measured' : `${metric.current.days} days`}
          </Text>
        </View>
      </View>

      {/* Signed arithmetic and nothing more. No colour, because a colour is a
          verdict and nobody has supplied one. */}
      {delta !== null && (
        <Text
          testID={testID ? `${testID}-change` : undefined}
          style={[typography['body-m'], { color: colors['ink-muted'] }]}
        >
          Change: {delta > 0 ? '+' : ''}
          {reading(delta, metric.unit)}
        </Text>
      )}

      {metric.note !== null && (
        <Text
          testID={testID ? `${testID}-note` : undefined}
          style={[typography['body-s'], { color: colors['ink-muted'] }]}
        >
          {/* The tracker's own wording for this level. Theirs, not ours. */}
          The tracker calls this: {metric.note}
        </Text>
      )}

      {missing && metric.missingNote !== null && (
        <Text
          testID={testID ? `${testID}-missing` : undefined}
          style={[typography['body-s'], { color: colors['ink-faint'] }]}
        >
          {metric.missingNote}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pair: { flexDirection: 'row' },
  side: { flex: 1, gap: 2 },
});
