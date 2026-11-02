import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { RecallFields } from '@/components/recall-fields';
import { ScaleGuide, type Scale } from '@/components/scale-guide';
import { messageOf } from '@/lib/errors';
import {
  draftOf,
  entryOf,
  hasAnyAnswer,
  hasAnyMeal,
  type RecallDraft,
  type RecallEntry,
} from '@/lib/recall';
import { isComputed, MACROS, macroText, type RecallNutrition } from '@/lib/recall-nutrition';
import { DAY_CHOICE_GUIDANCE, ROUND_LABEL, positionInRound, roundOf } from '@/lib/recall-window';
import { useRecallForm, type RecallFormController } from '@/lib/use-recall';
import { useTheme } from '@/theme';

/** The controller once the day has loaded, which is the only state Form sees. */
type LoadedForm = Extract<RecallFormController, { status: 'ready' }>;

/**
 * One recall day.
 *
 * The questions themselves live in `RecallFields`, shared with the screen
 * that fills all three days in one sitting. What is here is the one day's
 * frame: which day it is, saving it, and what the food database made of it.
 *
 * The loading and the form are two components on purpose. A single one has to
 * copy the loaded answer into its draft from an effect, which lint rejects and
 * is right to -- the fix every time in this codebase has been lazy initial
 * state, which is what `Form` gets by mounting only once there is something to
 * mount it with.
 */
export default function RecallDay() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { colors, spacing, typography } = useTheme();

  const dayNumber = Number(day);
  const valid = Number.isInteger(dayNumber) && dayNumber > 0;
  const state = useRecallForm(valid ? dayNumber : 1);

  if (!valid) return <Redirect href="/recall" />;
  if (state.status === 'needs-onboarding') return <Redirect href="/welcome" />;

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text
          testID="recall-load-error"
          style={[
            typography['body-m'],
            { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' },
          ]}
        >
          {state.message}
        </Text>
      </SafeAreaView>
    );
  }

  return <Form dayNumber={dayNumber} initial={state.entry} controller={state} />;
}

function Form({
  dayNumber,
  initial,
  controller,
}: {
  dayNumber: number;
  initial: RecallEntry;
  controller: LoadedForm;
}) {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();

  // Lazy, and mounted with the answer already in hand, so there is no effect
  // and no render that shows an empty form over loaded data.
  const [draft, setDraft] = useState<RecallDraft>(() => draftOf(initial));
  const [guide, setGuide] = useState<Scale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Parsed here rather than on every keystroke, so "1.5" is not mangled into
  // 1 while it is being typed.
  const entry = entryOf(draft);

  async function submit() {
    setError(null);
    try {
      await controller.save(entry);
      setSaved(true);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  const round = roundOf(dayNumber);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="day-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
        </Pressable>

        <Text
          style={[typography.label, { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}
        >
          {ROUND_LABEL[round].toUpperCase()}
        </Text>
        <Text style={[typography['display-l'], { color: colors.ink }]}>
          Day {positionInRound(dayNumber)}
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          Tell us about one whole day of eating. {DAY_CHOICE_GUIDANCE}
        </Text>

        <View style={{ marginTop: spacing['space-8'] }}>
          <RecallFields draft={draft} onChange={setDraft} onShowGuide={setGuide} />
        </View>

        {saved && <Computed nutrition={controller.nutrition} />}

        {!hasAnyMeal(entry) && hasAnyAnswer(entry) && (
          <Text
            testID="recall-no-meals"
            style={[
              typography['body-s'],
              { color: colors['ink-muted'], marginTop: spacing['space-6'] },
            ]}
          >
            {/* Saved anyway: the baseline's nine days hold exactly this and
                they are real data. The athlete is told what it costs. */}
            No meals written in yet. The day will still be saved, but it cannot go through the food
            database without them.
          </Text>
        )}

        {(error ?? controller.saveError) !== null && (
          <Text
            testID="recall-save-error"
            style={[
              typography['body-m'],
              { color: colors['cabai-deep'], marginTop: spacing['space-4'] },
            ]}
          >
            {error ?? controller.saveError}
          </Text>
        )}

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
          <PushButton
            label={
              controller.saving
                ? 'Saving…'
                : saved
                  ? 'Saved'
                  : `Save day ${positionInRound(dayNumber)}`
            }
            variant="success"
            fullWidth
            // An empty recall is not saved: it would write a row of nulls into
            // a research table and count as one of the programme's three days.
            disabled={controller.saving || !hasAnyAnswer(entry)}
            testID="recall-save"
            onPress={() => {
              // An async onPress swallows its own rejection, and a save button
              // that silently does nothing is the worst version of this screen.
              submit().catch((e: unknown) => setError(messageOf(e)));
            }}
          />
          {saved && (
            <PushButton
              label="Back to the recall"
              variant="ghost"
              fullWidth
              testID="recall-done"
              onPress={() => router.back()}
            />
          )}
        </View>
      </ScrollView>

      <ScaleGuide scale={guide} onClose={() => setGuide(null)} />
    </SafeAreaView>
  );
}

/**
 * What the food database made of the day just saved.
 *
 * Today says "Not scored yet" for the DQ score for the same reason this says
 * "Not computed yet": the figure belongs to the programme and the programme
 * has not supplied what it takes to produce one. A zero here would assert
 * that an athlete ate no carbohydrate on a day nobody has analysed.
 */
function Computed({ nutrition }: { nutrition: RecallNutrition | null }) {
  const { colors, radius, spacing, typography } = useTheme();
  const computed = isComputed(nutrition);

  return (
    <View
      testID="recall-nutrition"
      style={{
        backgroundColor: colors['kecap-tint'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-4'],
        marginTop: spacing['space-8'],
        gap: spacing['space-2'],
      }}
    >
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>FROM THE FOOD DATABASE</Text>
      {MACROS.map((macro) => {
        const value = nutrition?.[macro.field] ?? null;
        return (
          <View key={macro.field} style={styles.macro}>
            <Text style={[typography['body-m'], { color: colors.ink }]}>{macro.label}</Text>
            <Text
              testID={`macro-${macro.field}`}
              style={[
                typography['body-m'],
                { color: value === null ? colors['ink-faint'] : colors['kecap-deep'] },
              ]}
            >
              {macroText(value, macro.unit)}
            </Text>
          </View>
        );
      })}
      {!computed && (
        <Text
          testID="recall-nutrition-note"
          style={[typography['body-s'], { color: colors['ink-muted'] }]}
        >
          {nutrition?.note ??
            'Your day is saved. The figures arrive once the programme’s food composition tables are loaded.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  macro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
