import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PushButton } from '@/components/push-button';
import {
  derive,
  DOMAINS,
  formatValue,
  parseEntry,
  PHASE_LABEL,
  type MeasureDef,
  type Phase,
} from '@/lib/assessments';
import { messageOf } from '@/lib/errors';
import { useTheme } from '@/theme';

/**
 * One phase of the ASSESSMENTS tab for one athlete: every measure the sheet
 * lists, grouped by its domain, with the averages and the best jump worked
 * out as the attempts are typed.
 *
 * Every field may be left empty. An empty field is "not measured", saved as
 * null, and never read as zero.
 */

export type AssessmentFormProps = {
  phase: Phase;
  /** The saved values for this phase, by measure key. */
  initial: Record<string, number | null>;
  onSave: (values: Record<string, number | null>) => Promise<void>;
  testID?: string;
};

export function AssessmentForm({ phase, initial, onSave, testID = 'assessment-form' }: AssessmentFormProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      DOMAINS.flatMap((d) => d.measures)
        .filter((def) => !def.derived)
        .map((def) => [def.key, initial[def.key] === null || initial[def.key] === undefined ? '' : `${initial[def.key]}`])
    )
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);

  const parsed = useMemo(() => {
    const values: Record<string, number | null> = {};
    const errors: Record<string, string> = {};
    for (const def of DOMAINS.flatMap((d) => d.measures)) {
      if (def.derived) continue;
      const result = parseEntry(drafts[def.key] ?? '', def);
      if (result.ok) values[def.key] = result.value;
      else errors[def.key] = result.error;
    }
    return { values, errors };
  }, [drafts]);

  const hasErrors = Object.keys(parsed.errors).length > 0;

  function derivedValue(def: MeasureDef): number | null {
    if (!def.derived) return null;
    return derive(def.derived.how, def.derived.from.map((k) => parsed.values[k] ?? null));
  }

  async function save() {
    if (hasErrors || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      await onSave(parsed.values);
      setStatus({ kind: 'saved', text: `${PHASE_LABEL[phase]} saved.` });
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View testID={testID} style={{ gap: spacing['space-6'] }}>
      {DOMAINS.map((domain) => (
        <View key={domain.domain} style={{ gap: spacing['space-2'] }}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>
            {domain.label.toUpperCase()}
          </Text>
          <View
            style={{
              backgroundColor: colors['surface-raised'],
              borderRadius: radius['radius-lg'],
              paddingHorizontal: spacing['space-4'],
              paddingVertical: spacing['space-2'],
            }}
          >
            {domain.measures.map((def, index) => (
              <View
                key={def.key}
                style={[
                  styles.row,
                  {
                    paddingVertical: spacing['space-2'],
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.hairline,
                  },
                ]}
              >
                <View style={styles.labelCol}>
                  <Text style={[typography['body-m'], { color: colors.ink }]}>{def.label}</Text>
                  {def.unit !== null && (
                    <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>{def.unit}</Text>
                  )}
                  {parsed.errors[def.key] !== undefined && (
                    <Text
                      testID={`${testID}-${def.key}-error`}
                      style={[typography['body-s'], { color: colors['cabai-deep'] }]}
                    >
                      {parsed.errors[def.key]}
                    </Text>
                  )}
                </View>

                {def.derived ? (
                  <View style={[styles.input, { justifyContent: 'center', paddingHorizontal: spacing['space-3'] }]}>
                    <Text
                      testID={`${testID}-${def.key}`}
                      style={[typography['heading-m'], { color: colors['ink-muted'], textAlign: 'right' }]}
                    >
                      {formatValue(derivedValue(def))}
                    </Text>
                    <Text style={[typography['body-s'], { color: colors['ink-faint'], textAlign: 'right' }]}>
                      {def.derived.how === 'max' ? 'auto: best' : 'auto: average'}
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    testID={`${testID}-${def.key}`}
                    value={drafts[def.key] ?? ''}
                    onChangeText={(text) => {
                      setStatus(null);
                      setDrafts((d) => ({ ...d, [def.key]: text }));
                    }}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="—"
                    placeholderTextColor={colors['ink-faint']}
                    accessibilityLabel={`${def.label}, ${PHASE_LABEL[phase]}`}
                    style={[
                      styles.input,
                      typography['heading-m'],
                      {
                        color: colors.ink,
                        backgroundColor: colors['surface-sunken'],
                        borderRadius: radius['radius-md'],
                        paddingHorizontal: spacing['space-3'],
                        textAlign: 'right',
                        borderWidth: parsed.errors[def.key] ? 2 : 0,
                        borderColor: colors['cabai-deep'],
                      },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      {status !== null && (
        <Text
          testID={`${testID}-status`}
          style={[
            typography['body-m'],
            { color: status.kind === 'saved' ? colors['daun-deep'] : colors['cabai-deep'], textAlign: 'center' },
          ]}
        >
          {status.text}
        </Text>
      )}

      <PushButton
        label={saving ? 'Saving…' : `Save ${PHASE_LABEL[phase]}`}
        fullWidth
        disabled={hasErrors || saving}
        onPress={save}
        testID={`${testID}-save`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelCol: { flex: 1, gap: 2 },
  input: { width: 110, minHeight: 48 },
});
