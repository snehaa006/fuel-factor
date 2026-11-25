import { StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/components/calendar';
import { GapBars } from '@/components/gap-bars';
import type { GapAnalysis } from '@/lib/gaps';
import { useTheme } from '@/theme';

export type GapReportProps = {
  analysis: GapAnalysis;
  /**
   * Who is reading. The charts are the same; the one sentence that tells the
   * reader what to do about a missing weight is not -- an athlete asks their
   * coach, a coach is the one who adds it.
   */
  reader: 'athlete' | 'coach';
  testID?: string;
};

/**
 * The gap analysis itself: the window, one bar chart per nutrient against the
 * programme's band, and the legend.
 *
 * Shared by the athlete's own screen and the coach's view of one athlete, so
 * the two can never draw the same fortnight differently. The athlete's screen
 * and the coach's differ only in what is around this -- the header, the
 * mascot, the way back.
 */
export function GapReport({ analysis, reader, testID = 'gaps' }: GapReportProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const logged = analysis.days.length;
  // Read as dates, not as `2026-11-01`: nobody should have to parse ISO.
  const span = `${shortDate(analysis.from)} and ${shortDate(analysis.to)}`;

  return (
    <View testID={testID}>
      <Text
        testID={`${testID}-window`}
        style={[typography['body-s'], { color: colors['ink-muted'], marginTop: spacing['space-4'] }]}
      >
        {logged === 0
          ? `No days logged between ${span}.`
          : `${logged} ${logged === 1 ? 'day' : 'days'} logged between ${span}.`}
      </Text>

      <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
        {analysis.gaps.map((gap) => (
          <GapBars key={gap.nutrient} gap={gap} testID={`gap-${gap.nutrient}`} />
        ))}
      </View>

      {analysis.weightKg === null && (
        <Text
          testID={`${testID}-no-weight`}
          style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-4'] }]}
        >
          {/* Both bands are per kilogram, so without a weight there is no
              band to compare anything against. Said once, here, rather than
              under each chart. */}
          {reader === 'athlete'
            ? 'Both of the programme’s bands are set per kilogram of body weight, and yours is not recorded yet. Ask your coach to add it and these charts fill in.'
            : 'Both of the programme’s bands are set per kilogram of body weight, and this athlete’s is not recorded yet. Add it to their profile and these charts fill in.'}
        </Text>
      )}

      {/* The legend, because three fills and a hollow bar is three things to
          learn and the charts are worth nothing if they are misread. */}
      <View
        style={{
          marginTop: spacing['space-6'],
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        }}
      >
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>READING THE CHARTS</Text>
        <Key colour={colors.daun} text="Inside the programme’s band" />
        <Key colour={colors.cabai} text="Below it" />
        <Key colour={colors.pisang} text="Above it" />
        <Key colour={null} text="Not enough recorded to say" />
      </View>
    </View>
  );
}

/** One row of the legend. A hollow swatch for the unjudged days. */
function Key({ colour, text }: { colour: string | null; text: string }) {
  const { colors, radius, typography } = useTheme();
  return (
    <View style={styles.key}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: radius['radius-sm'],
          backgroundColor: colour ?? 'transparent',
          borderWidth: colour === null ? 1.5 : 0,
          borderColor: colors['ink-faint'],
          borderStyle: colour === null ? 'dashed' : 'solid',
        }}
      />
      <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  key: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
