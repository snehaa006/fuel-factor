import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgrammeGate } from '@/components/programme-gate';
import { ScaleGuide, ScaleGuideLink, type Scale } from '@/components/scale-guide';
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
import { localised, messageOf } from '@/lib/errors';
import { ensureDailyLog } from '@/lib/logger';
import { todayIso } from '@/lib/today';
import { useParticipantId } from '@/lib/use-foods';
import { useStrings } from '@/i18n';
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
function CheckInForm() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const participantId = useParticipantId();

  const [checkIn, setCheckIn] = useState<CheckIn>({});
  const [fluidText, setFluidText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState<Scale | null>(null);

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
      setError(localised(messageOf(e), t));
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
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.checkIn.thisEvening}</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t.logger.cancel}
            testID="cancel"
            hitSlop={12}
          >
            <Text style={[typography.label, { color: colors['air-deep'] }]}>{t.logger.cancelCaps}</Text>
          </Pressable>
        </View>
        <Text style={[typography['display-l'], { color: colors.ink }]}>{t.checkIn.howWasToday}</Text>

        {section(
          t.checkIn.servings,
          t.checkIn.servingsNote,
          <View style={{ gap: spacing['space-2'] }}>
            {COUNTERS.map(({ field, label }) => (
              <Stepper
                key={field}
                label={t.checkIn.fields[field] ?? label}
                value={checkIn[field] ?? null}
                onChange={(v) => set(field, v)}
                testID={`counter-${field}`}
              />
            ))}
          </View>
        )}

        {section(
          t.checkIn.fluid,
          t.checkIn.fluidNote,
          <TextInput
            value={fluidText}
            onChangeText={setFluidText}
            keyboardType="number-pad"
            placeholder={t.checkIn.fluidPlaceholder}
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel={t.checkIn.fluidLabel}
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
          t.checkIn.hydration,
          null,
          <UrineScale
            value={checkIn.urine_colour ?? null}
            onChange={(v) => set('urine_colour', v)}
            onShowGuide={() => setGuide('urine')}
            testID="urine"
          />
        )}

        {section(
          t.checkIn.howYouFelt,
          t.checkIn.ratingRange(LIMITS.rating.max),
          <View style={{ gap: spacing['space-4'] }}>
            {/* One link for all five, because the workbook states a single
                1-10 scale and every rating here is read off it. */}
            <ScaleGuideLink
              scale="rating"
              onPress={() => setGuide('rating')}
              testID="rating-guide"
            />
            {RATINGS.map(({ field, label }) => (
              <RatingScale
                key={field}
                label={t.checkIn.fields[field] ?? label}
                value={checkIn[field] ?? null}
                onChange={(v) => set(field, v)}
                testID={`rating-${field}`}
              />
            ))}
          </View>
        )}

        {section(
          t.checkIn.anythingElse,
          null,
          <TextInput
            value={checkIn.notes ?? ''}
            onChangeText={(text) => set('notes', text)}
            multiline
            placeholder={t.checkIn.notesPlaceholder}
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel={t.checkIn.notesLabel}
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


        {error && (
          <Text testID="save-error" style={[typography['body-m'], { color: colors['cabai-deep'], marginTop: spacing['space-4'] }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={{ padding: spacing['space-4'], gap: spacing['space-2'] }}>
        {participantId === null && (
          <Text testID="cannot-save" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {t.logger.signInToSave}
          </Text>
        )}
        <PushButton
          label={saving ? t.common.saving : t.checkIn.finish}
          fullWidth
          variant="success"
          disabled={!answered || saving || participantId === null}
          testID="submit"
          onPress={submit}
        />
      </View>

      <ScaleGuide scale={guide} onClose={() => setGuide(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 24 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

/**
 * The evening check-in writes a DAILY LOG row, and a DAILY LOG row is a
 * day of the intervention. There are none before day one.
 */
export default function CheckInScreen() {
  return (
    <ProgrammeGate daily>
      <CheckInForm />
    </ProgrammeGate>
  );
}
