import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AssessmentForm } from '@/components/assessment-form';
import { ComparisonTable, type ComparisonColumn } from '@/components/comparison-table';
import {
  PHASE_LABEL,
  phaseValues,
  type PairValues,
  type Phase,
  type PhaseAccess,
  type RecallFill,
} from '@/lib/assessments';
import { useTheme } from '@/theme';

/**
 * Week 0, Week 4 and the comparison, as three tabs over one athlete's
 * figures. Shared by the athlete's own screen and the coach's, which differ
 * only in whose figures and how many columns the comparison has.
 */

export type PanelTab = Phase | 'compare';

export type AssessmentPanelProps = {
  participantId: string;
  pairs: PairValues;
  access: Record<Phase, PhaseAccess>;
  onSave: (phase: Phase, values: Record<string, number | null>) => Promise<void>;
  comparison: ComparisonColumn[];
  /** The recall's averages, for the hints under each field. */
  fill?: RecallFill;
  showNames?: boolean;
  initialTab?: PanelTab;
  testID?: string;
};

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'pre', label: PHASE_LABEL.pre },
  { key: 'post', label: PHASE_LABEL.post },
  { key: 'compare', label: 'Compare' },
];

export function AssessmentPanel({
  participantId,
  pairs,
  access,
  onSave,
  comparison,
  fill,
  showNames = false,
  initialTab = 'pre',
  testID = 'assessments',
}: AssessmentPanelProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [tab, setTab] = useState<PanelTab>(initialTab);

  return (
    <View testID={testID} style={{ gap: spacing['space-4'] }}>
      <View
        accessibilityRole="tablist"
        style={[styles.tabs, { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-pill'], padding: 4 }]}
      >
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              testID={`${testID}-tab-${t.key}`}
              style={[
                styles.tab,
                {
                  backgroundColor: selected ? colors.pisang : 'transparent',
                  borderRadius: radius['radius-pill'],
                  paddingVertical: spacing['space-2'],
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[typography.label, { color: selected ? colors['on-bright'] : colors['ink-muted'] }]}
              >
                {t.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'compare' ? (
        <View style={{ gap: spacing['space-2'] }}>
          <ComparisonTable columns={comparison} showNames={showNames} testID={`${testID}-comparison`} />
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            Δ = Week 4 minus Week 0. For sprint time a negative Δ means faster. A dash means not
            measured yet. Diet, fluid, morning energy, recovery and urine colour not entered by hand
            are the recall’s averages for that week.
          </Text>
        </View>
      ) : (() => {
        const phase = tab;
        const gate = access[phase];
        if (!gate.open) {
          return (
            <Text
              testID={`${testID}-${phase}-closed`}
              style={[typography['body-m'], { color: colors['ink-muted'] }]}
            >
              {gate.reason}
            </Text>
          );
        }
        return (
          <AssessmentForm
            // A fresh form per athlete and phase, so drafts never leak across.
            key={`${participantId}-${phase}`}
            phase={phase}
            initial={phaseValues(pairs, phase)}
            onSave={(values) => onSave(phase, values)}
            fromRecall={fill?.[phase]}
            testID={`${testID}-${phase}`}
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
