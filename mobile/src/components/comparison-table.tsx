import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  COMPARISON_ROWS,
  delta,
  formatDelta,
  formatValue,
  type PairValues,
} from '@/lib/assessments';
import { useTheme } from '@/theme';

/**
 * The COMPARISON tab: Week 0, Week 4 and Δ for each measure, one column set
 * per athlete. Δ is Post minus Pre, as the sheet defines it, and is printed
 * with its sign. The table says which way is better only where the sheet
 * does: for sprint time, a negative Δ is faster.
 *
 * Wider than a phone once there is more than one athlete, so it scrolls
 * sideways with the measure names pinned in the first column.
 */

export type ComparisonColumn = { participantId: string; name: string; pairs: PairValues };

export type ComparisonTableProps = {
  columns: ComparisonColumn[];
  /** Print athlete names over the column sets. Off for an athlete's own table. */
  showNames?: boolean;
  testID?: string;
};

const LABEL_W = 136;
const CELL_W = 64;

export function ComparisonTable({ columns, showNames = true, testID = 'comparison' }: ComparisonTableProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const cell = (text: string, opts: { id?: string; strong?: boolean; tone?: 'muted' | 'delta' } = {}) => (
    <View style={[styles.cell, { width: CELL_W }]}>
      <Text
        testID={opts.id}
        style={[
          opts.strong ? typography.label : typography['body-s'],
          {
            color: opts.tone === 'muted' ? colors['ink-muted'] : colors.ink,
            textAlign: 'right',
            fontWeight: opts.tone === 'delta' ? '700' : undefined,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <View
      testID={testID}
      style={{ backgroundColor: colors['surface-raised'], borderRadius: radius['radius-lg'], overflow: 'hidden' }}
    >
      <View style={styles.row}>
        {/* Pinned measure names */}
        <View style={{ width: LABEL_W, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.hairline }}>
          {showNames && <View style={{ height: 28 }} />}
          <View style={[styles.labelCell, { paddingVertical: spacing['space-2'], paddingHorizontal: spacing['space-3'] }]}>
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>MEASURE</Text>
          </View>
          {COMPARISON_ROWS.map((row) => (
            <View
              key={row.key}
              style={[
                styles.labelCell,
                {
                  paddingVertical: spacing['space-2'],
                  paddingHorizontal: spacing['space-3'],
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.hairline,
                },
              ]}
            >
              <Text numberOfLines={3} style={[typography['body-s'], { color: colors.ink, fontSize: 13, lineHeight: 16 }]}>
                {row.label}
                {row.note !== undefined && <Text style={{ color: colors['ink-faint'] }}>{` · ${row.note}`}</Text>}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.row}>
            {columns.map((column) => (
              <View
                key={column.participantId}
                testID={`${testID}-${column.participantId}`}
                style={{ borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.hairline, paddingHorizontal: 4 }}
              >
                {showNames && (
                  <View style={{ height: 28, justifyContent: 'center', paddingHorizontal: spacing['space-2'] }}>
                    <Text numberOfLines={1} style={[typography.label, { color: colors.ink }]}>
                      {column.name.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={[styles.row, styles.dataRow]}>
                  {cell('WK 0', { strong: true, tone: 'muted' })}
                  {cell('WK 4', { strong: true, tone: 'muted' })}
                  {cell('Δ', { strong: true, tone: 'muted' })}
                </View>
                {COMPARISON_ROWS.map((row) => {
                  const pair = column.pairs[row.key] ?? { pre: null, post: null };
                  const id = `${testID}-${column.participantId}-${row.key}`;
                  return (
                    <View
                      key={row.key}
                      style={[styles.row, styles.dataRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline }]}
                    >
                      {cell(formatValue(pair.pre), { id: `${id}-pre` })}
                      {cell(formatValue(pair.post), { id: `${id}-post` })}
                      {cell(formatDelta(delta(pair.pre, pair.post)), { id: `${id}-delta`, tone: 'delta' })}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  // Fixed so the pinned column and the scrolling cells line up row for row.
  labelCell: { height: 52, justifyContent: 'center' },
  dataRow: { height: 52, alignItems: 'center' },
  cell: { justifyContent: 'center', paddingHorizontal: 4 },
});
