import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayTypeSwitch } from '@/components/day-type-switch';
import { PushButton } from '@/components/push-button';
import { RatingScale } from '@/components/rating-scale';
import { UrineScale } from '@/components/urine-scale';
import { messageOf } from '@/lib/errors';
import {
  hasAnyAnswer,
  hasAnyMeal,
  parseFluid,
  parseSleepHours,
  parseText,
  RECALL_LIMITS,
  RECALL_MEALS,
  RECALL_RATINGS,
  type RecallEntry,
} from '@/lib/recall';
import { isComputed, MACROS, macroText, type RecallNutrition } from '@/lib/recall-nutrition';
import { DAY_CHOICE_GUIDANCE, ROUND_LABEL, positionInRound, roundOf } from '@/lib/recall-window';
import { todayIso } from '@/lib/today';
import { useRecallForm, type RecallFormController } from '@/lib/use-recall';
import { useTheme } from '@/theme';

/** The controller once the day has loaded, which is the only state Form sees. */
type LoadedForm = Extract<RecallFormController, { status: 'ready' }>;

/**
 * One recall day.
 *
 * Every field is a column of the RECALL sheet and the form carries all of them
 * bar `est_calories`, which the app computes rather than asks for: "the
 * calories is estimated and calculated based on our composition data that we
 * have ... This will be backend. This is not manual calculation."
 *
 * The meals are free text because that is what the instrument is. The tracker
 * records them that way -- "day one, he said, I haven't had my breakfast. And
 * with chicken, I've had 200 grams on day one" -- and turning that into grams
 * is the food database's job.
 *
 * Nothing on this screen judges an answer. No target sits beside the fluid
 * box, no adjective beside a rating, and the saved day gets no verdict: the
 * programme has set no recall targets and the app is not entitled to invent
 * one. The urine reading carries the tracker's own wording and nothing else.
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
  const { colors, radius, spacing, typography } = useTheme();

  // Lazy, and mounted with the answer already in hand, so there is no effect
  // and no render that shows an empty form over loaded data.
  const [entry, setEntry] = useState<RecallEntry>(() => initial);
  const [sleepText, setSleepText] = useState(() =>
    initial.sleep_hours === null ? '' : String(initial.sleep_hours)
  );
  const [fluidText, setFluidText] = useState(() =>
    initial.fluid_ml === null ? '' : String(initial.fluid_ml)
  );
  const [dateText, setDateText] = useState(() => initial.recall_date ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof RecallEntry>(key: K, value: RecallEntry[K]) =>
    setEntry((current) => ({ ...current, [key]: value }));

  // The three text-backed fields are parsed here rather than on every
  // keystroke, so "1.5" is not mangled into 1 while it is being typed.
  const draft: RecallEntry = {
    ...entry,
    recall_date: parseText(dateText),
    sleep_hours: parseSleepHours(sleepText),
    fluid_ml: parseFluid(fluidText),
  };

  async function submit() {
    setError(null);
    try {
      await controller.save(draft);
      setSaved(true);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  const label = (text: string) => (
    <Text style={[typography.label, { color: colors['ink-muted'] }]}>{text.toUpperCase()}</Text>
  );

  const inputStyle = [
    typography['body-l'],
    {
      backgroundColor: colors['surface-sunken'],
      borderRadius: radius['radius-lg'],
      color: colors.ink,
      padding: spacing['space-4'],
    },
  ];

  const section = (title: string, children: React.ReactNode) => (
    <View style={{ gap: spacing['space-3'] }}>
      <Text style={[typography['heading-l'], { color: colors.ink }]}>{title}</Text>
      {children}
    </View>
  );

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

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-8'] }}>
          {section(
            'The day',
            <>
              <View style={{ gap: spacing['space-2'] }}>
                {label('Which day was it')}
                <TextInput
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder={todayIso()}
                  placeholderTextColor={colors['ink-faint']}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Which day was it, as a date"
                  testID="recall-date"
                  style={inputStyle}
                />
              </View>
              <DayTypeSwitch
                value={entry.day_type}
                onChange={(value) => set('day_type', value)}
                testID="recall-day-type"
              />
              <View style={{ gap: spacing['space-2'] }}>
                {label(`Sleep, in hours (0–${RECALL_LIMITS.sleep_hours.max})`)}
                <TextInput
                  value={sleepText}
                  onChangeText={setSleepText}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors['ink-faint']}
                  accessibilityLabel="Sleep in hours"
                  testID="recall-sleep"
                  style={inputStyle}
                />
              </View>
            </>
          )}

          {section(
            'What you ate',
            <>
              {RECALL_MEALS.map((meal) => (
                <View key={meal.field} style={{ gap: spacing['space-2'] }}>
                  {label(meal.label)}
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                    {meal.hint}
                  </Text>
                  <TextInput
                    value={entry[meal.field] ?? ''}
                    onChangeText={(text) => set(meal.field, parseText(text))}
                    multiline
                    placeholder="—"
                    placeholderTextColor={colors['ink-faint']}
                    accessibilityLabel={meal.label}
                    testID={`recall-${meal.field}`}
                    style={[...inputStyle, styles.multiline]}
                  />
                </View>
              ))}
              {/* No food is called good or bad here, and none is suggested.
                  The athlete records what happened. */}
              <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
                Write it as you would say it. Nothing here is judged.
              </Text>
            </>
          )}

          {section(
            'The rest of the day',
            <>
              <View style={{ gap: spacing['space-2'] }}>
                {label('Training or activity')}
                <TextInput
                  value={entry.activities ?? ''}
                  onChangeText={(text) => set('activities', parseText(text))}
                  multiline
                  placeholder="—"
                  placeholderTextColor={colors['ink-faint']}
                  accessibilityLabel="Training or activity"
                  testID="recall-activities"
                  style={[...inputStyle, styles.multiline]}
                />
              </View>
              <View style={{ gap: spacing['space-2'] }}>
                {label('Supplements, if any')}
                <TextInput
                  value={entry.supplements ?? ''}
                  onChangeText={(text) => set('supplements', parseText(text))}
                  placeholder="—"
                  placeholderTextColor={colors['ink-faint']}
                  accessibilityLabel="Supplements, if any"
                  testID="recall-supplements"
                  style={inputStyle}
                />
              </View>
              <View style={{ gap: spacing['space-2'] }}>
                {/* A rough figure is what the instrument asks for: "fluids, a
                    tentative idea, say, I had my four liter of water today."
                    No daily goal sits beside it, because none has been set. */}
                {label('Fluid, in mL')}
                <TextInput
                  value={fluidText}
                  onChangeText={setFluidText}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors['ink-faint']}
                  accessibilityLabel="Fluid in millilitres"
                  testID="recall-fluid"
                  style={inputStyle}
                />
                <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                  A rough idea is fine. A large bottle is about 1500 mL.
                </Text>
              </View>
            </>
          )}

          {section(
            'How it felt',
            <>
              {RECALL_RATINGS.map((rating) => (
                <RatingScale
                  key={rating.field}
                  label={rating.label}
                  value={entry[rating.field]}
                  onChange={(value) => set(rating.field, value)}
                  testID={`recall-${rating.field}`}
                />
              ))}
              <View style={{ gap: spacing['space-2'] }}>
                {label('Hydration reading')}
                <UrineScale
                  value={entry.urine_colour}
                  onChange={(value) => set('urine_colour', value)}
                  testID="recall-urine"
                />
              </View>
            </>
          )}

          {section(
            'Anything else',
            <TextInput
              value={entry.notes ?? ''}
              onChangeText={(text) => set('notes', parseText(text))}
              multiline
              placeholder="—"
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel="Anything else"
              testID="recall-notes"
              style={[...inputStyle, styles.multiline]}
            />
          )}
        </View>

        {saved && <Computed nutrition={controller.nutrition} />}

        {!hasAnyMeal(draft) && hasAnyAnswer(draft) && (
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
              controller.saving ? 'Saving…' : saved ? 'Saved' : `Save day ${positionInRound(dayNumber)}`
            }
            variant="success"
            fullWidth
            // An empty recall is not saved: it would write a row of nulls into
            // a research table and count as one of the programme's three days.
            disabled={controller.saving || !hasAnyAnswer(draft)}
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
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  macro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
