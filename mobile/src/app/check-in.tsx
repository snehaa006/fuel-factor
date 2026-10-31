import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { RatingScale } from '@/components/rating-scale';
import { Stepper } from '@/components/stepper';
import { UrineScale } from '@/components/urine-scale';
import {
  COUNTERS,
  LIMITS,
  RATINGS,
  hasAnyAnswer,
  parseFluid,
  saveCheckIn,
  type CheckIn,
} from '@/lib/check-in';
import { messageOf } from '@/lib/errors';
import { ensureDailyLog } from '@/lib/logger';
import { todayIso } from '@/lib/today';
import { useParticipantId } from '@/lib/use-foods';
import { useTheme } from '@/theme';

/**
 * The evening check-in: the DAILY LOG sheet turned into a form.
 *
 * It carries every one of that sheet's columns, because they are the research
 * instrument. Two of them — fluid and the five self-ratings — have never been
 * collected for any athlete on any day, which is the largest hole in the
 * study's data and the reason this screen exists.
 *
 * Every field can be left blank. Not answered is stored as null, never as
 * zero, so a blank never reads as a measurement of nothing.
 */
export default function CheckInScreen() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const participantId = useParticipantId();

  const [checkIn, setCheckIn] = useState<CheckIn>({});
  const [fluidText, setFluidText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CheckIn>(field: K, value: CheckIn[K]) {
    setCheckIn((current) => ({ ...current, [field]: value }));
  }

  const answered = hasAnyAnswer({ ...checkIn, fluid_ml: parseFluid(fluidText) });

  async function submit() {
    if (participantId === null) return;
    setSaving(true);
    setError(null);
    try {
      const dailyLogId = await ensureDailyLog(participantId, todayIso());
      await saveCheckIn(dailyLogId, { ...checkIn, fluid_ml: parseFluid(fluidText) });
      router.back();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  const section = (title: string, note: string | null, children: React.ReactNode) => (
    <View style={{ gap: spacing['space-3'], marginTop: spacing['space-8'] }}>
      <Text style={[typography['heading-l'], { color: colors.ink }]}>{title}</Text>
      {note && <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{note}</Text>}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>THIS EVENING</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            testID="cancel"
            hitSlop={12}
          >
            <Text style={[typography.label, { color: colors['air-deep'] }]}>CANCEL</Text>
          </Pressable>
        </View>
        <Text style={[typography['display-l'], { color: colors.ink }]}>How was today?</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}>
          Anything you skip stays blank. Nothing here is a score.
        </Text>

        {section(
          'Servings',
          'A count of what you had. There is no target.',
          <View style={{ gap: spacing['space-2'] }}>
            {COUNTERS.map(({ field, label }) => (
              <Stepper
                key={field}
                label={label}
                value={checkIn[field] ?? null}
                onChange={(v) => set(field, v)}
                testID={`counter-${field}`}
              />
            ))}
          </View>
        )}

        {section(
          'Fluid',
          'Millilitres across the whole day.',
          <TextInput
            value={fluidText}
            onChangeText={setFluidText}
            keyboardType="number-pad"
            placeholder="e.g. 2000"
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel="Fluid in millilitres"
            testID="fluid"
            style={[
              typography['heading-m'],
              {
                backgroundColor: colors['surface-sunken'],
                borderRadius: radius['radius-lg'],
                color: colors.ink,
                padding: spacing['space-4'],
              },
            ]}
          />
        )}

        {section(
          'Hydration',
          null,
          <UrineScale
            value={checkIn.urine_colour ?? null}
            onChange={(v) => set('urine_colour', v)}
            testID="urine"
          />
        )}

        {section(
          'How you felt',
          `1 to ${LIMITS.rating.max}.`,
          <View style={{ gap: spacing['space-4'] }}>
            {RATINGS.map(({ field, label }) => (
              <RatingScale
                key={field}
                label={label}
                value={checkIn[field] ?? null}
                onChange={(v) => set(field, v)}
                testID={`rating-${field}`}
              />
            ))}
          </View>
        )}

        {section(
          'Anything else',
          null,
          <TextInput
            value={checkIn.notes ?? ''}
            onChangeText={(t) => set('notes', t)}
            multiline
            placeholder="Illness, a hard session, anything worth noting."
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel="Notes"
            testID="notes"
            style={[
              typography['body-m'],
              {
                backgroundColor: colors['surface-sunken'],
                borderRadius: radius['radius-lg'],
                color: colors.ink,
                minHeight: 96,
                padding: spacing['space-4'],
                textAlignVertical: 'top',
              },
            ]}
          />
        )}

        {/* The sheet names a DQ Score /12 and states no formula, so the
            check-in does not compute one and the streak runs off submission. */}
        <Text style={[typography['body-s'], { color: colors['ink-muted'], marginTop: spacing['space-6'] }]}>
          Your diet quality score is set by the programme, not by this form.
        </Text>

        {error && (
          <Text testID="save-error" style={[typography['body-m'], { color: colors['cabai-deep'], marginTop: spacing['space-4'] }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={{ padding: spacing['space-4'], gap: spacing['space-2'] }}>
        {participantId === null && (
          <Text testID="cannot-save" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            Nothing to save to: this device has not claimed an athlete.
          </Text>
        )}
        <PushButton
          label={saving ? 'Saving…' : 'Finish today'}
          fullWidth
          variant="success"
          disabled={!answered || saving || participantId === null}
          testID="submit"
          onPress={submit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 24 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
