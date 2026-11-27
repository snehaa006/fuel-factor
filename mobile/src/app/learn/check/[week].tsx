import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { longDate, shortDate } from '@/components/calendar';
import { PushButton } from '@/components/push-button';
import { RatingScale } from '@/components/rating-scale';
import { ScaleGuide } from '@/components/scale-guide';
import { UrineScale } from '@/components/urine-scale';
import { useStrings } from '@/i18n';
import { useContent } from '@/i18n/content';
import { localised, messageOf } from '@/lib/errors';
import { useParticipantId } from '@/lib/use-foods';
import { useWeeks } from '@/lib/use-learn';
import { useProgramme } from '@/lib/use-programme';
import {
  BREAKFAST_OPTIONS,
  missing,
  parseMl,
  startingAnswers,
  toRow,
  useWeeklyCheckin,
  type WeeklyAnswers,
} from '@/lib/weekly-log';
import { checkInOpen, weekAccess, weekDates } from '@/lib/weekly';
import { useTheme } from '@/theme';

/**
 * A week's check-in: the WEEKLY LOG tab, answered by the athlete.
 *
 * Five questions, the tab's own columns, worded as Theo sent them on
 * WhatsApp every Sunday (see `lib/weekly-log.ts`). Saved to `weekly_logs`,
 * the research table that mirrors the tab, one row per athlete per week; a
 * second visit edits that row rather than adding one.
 *
 * Where the athlete logged the week day by day, the averages start from those
 * logs and say so. Breakfast is never pre-picked.
 */
export default function WeekCheckIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string }>();
  const week = Number(params.week);
  const valid = Number.isInteger(week) && week >= 1 && week <= 4;
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const content = useContent();
  const c = t.checkin;
  const participantId = useParticipantId();
  const programme = useProgramme();
  const weeks = useWeeks();

  const programmeState = programme.status === 'ready' ? programme.programme : null;
  const range =
    programmeState !== null && programmeState.status !== 'no-date' && valid
      ? weekDates(programmeState.startsOn, week)
      : null;
  const state = useWeeklyCheckin(participantId, valid ? week : 1, range);

  const [answers, setAnswers] = useState<WeeklyAnswers | null>(null);
  const [fluidText, setFluidText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);

  const frame = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="checkin-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
        </Pressable>
        <Text style={[typography['display-m'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {c.title(valid ? week : 0)}
        </Text>
        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-6'] }}>{children}</View>
      </ScrollView>
      {guide && <ScaleGuide scale="urine" onClose={() => setGuide(false)} />}
    </SafeAreaView>
  );

  if (!valid) {
    return frame(<Text style={[typography['body-m'], { color: colors.ink }]}>{t.learn.notAWeek}</Text>);
  }

  if (state.status === 'loading' || programme.status === 'loading' || weeks.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return frame(
      <Text testID="checkin-error" style={[typography['body-m'], { color: colors['cabai-deep'] }]}>
        {localised(state.message, t)}
      </Text>
    );
  }

  // A week the athlete has not reached cannot be reported on yet.
  if (programmeState !== null && programmeState.status !== 'no-date') {
    const access = weekAccess(week, programmeState);
    if (access.state === 'future' || !checkInOpen(week, programmeState)) {
      return frame(
        <Text testID="checkin-not-yet" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {access.state === 'future'
            ? t.weekly.lockedBody(shortDate(access.opensOn, t))
            : t.weekly.lockedTitle(week)}
        </Text>
      );
    }
  }

  const theme =
    weeks.status === 'ready' ? (weeks.weeks.find((w) => w.weekNumber === week)?.theme ?? null) : null;

  if (sent) {
    return frame(
      <>
        <Text testID="checkin-thanks" style={[typography['display-m'], { color: colors['daun-deep'] }]}>
          {c.thanks(week)}
        </Text>
        <Text style={[typography['body-l'], { color: colors.ink }]}>{c.thanksBody}</Text>
        <PushButton label={c.done} fullWidth testID="checkin-done" onPress={() => router.back()} />
      </>
    );
  }

  const { question, existing, logs } = state;
  const form = answers ?? startingAnswers(existing, logs);
  const set = (patch: Partial<WeeklyAnswers>) => setAnswers({ ...form, ...patch });
  const fluidShown = fluidText ?? (form.fluidMl === null ? '' : String(form.fluidMl));
  // Without a question row for the week, the fifth answer is not asked for.
  const gaps = missing(form).filter((k) => k !== 'behaviour' || question !== null);
  const prefilled = existing === null && logs !== null && logs.daysLogged > 0;

  async function send() {
    if (participantId === null) return;
    setSaving(true);
    setError(null);
    try {
      await state.save(toRow(participantId, week, theme, form));
      setSent(true);
    } catch (e) {
      setError(localised(messageOf(e), t));
    } finally {
      setSaving(false);
    }
  }

  const label = (text: string) => (
    <Text style={[typography['heading-m'], { color: colors.ink }]}>{text}</Text>
  );

  const chips = (
    options: readonly string[],
    selected: string | null,
    shown: (value: string) => string,
    onPick: (value: string) => void,
    testID: string
  ) => (
    <View style={styles.chips}>
      {options.map((value, i) => {
        const on = selected === value;
        return (
          <Pressable
            key={value}
            onPress={() => onPick(value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            testID={`${testID}-${i}`}
            style={{
              backgroundColor: on ? colors.pisang : colors['surface-sunken'],
              borderRadius: radius['radius-pill'],
              paddingVertical: spacing['space-2'],
              paddingHorizontal: spacing['space-4'],
            }}
          >
            <Text style={[typography['body-m'], { color: on ? colors['on-bright'] : colors.ink }]}>
              {shown(value)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const input = [
    typography['body-l'],
    {
      backgroundColor: colors['surface-sunken'],
      borderRadius: radius['radius-lg'],
      color: colors.ink,
      padding: spacing['space-4'],
    },
  ];

  return frame(
    <>
      <View style={{ gap: spacing['space-1'] }}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>{c.about(week, content(theme))}</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>{c.lead}</Text>
        {existing !== null && (
          <Text testID="checkin-already" style={[typography['body-s'], { color: colors['air-deep'] }]}>
            {c.alreadyIn(longDate(existing.updated_at.slice(0, 10), t))}
          </Text>
        )}
        {prefilled && logs !== null && (
          <Text testID="checkin-prefilled" style={[typography['body-s'], { color: colors['air-deep'] }]}>
            {c.fromLogs(logs.daysLogged)}
          </Text>
        )}
      </View>

      <RatingScale
        label={c.energy}
        value={form.energy}
        onChange={(energy) => set({ energy })}
        testID="checkin-energy"
      />

      <View style={{ gap: spacing['space-2'] }}>
        {label(c.urine)}
        <UrineScale
          value={form.urine}
          onChange={(urine) => set({ urine })}
          onShowGuide={() => setGuide(true)}
          testID="checkin-urine"
        />
      </View>

      <View style={{ gap: spacing['space-2'] }}>
        {label(c.water)}
        <TextInput
          value={fluidShown}
          onChangeText={(text) => {
            setFluidText(text);
            set({ fluidMl: parseMl(text) });
          }}
          keyboardType="number-pad"
          placeholder={c.waterPlaceholder}
          placeholderTextColor={colors['ink-faint']}
          accessibilityLabel={c.water}
          testID="checkin-water"
          style={input}
        />
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{c.waterHint}</Text>
      </View>

      <View style={{ gap: spacing['space-2'] }}>
        {label(c.breakfast)}
        {chips(
          BREAKFAST_OPTIONS,
          form.breakfast,
          (v) => c.breakfastOptions[v] ?? v,
          (breakfast) => set({ breakfast }),
          'checkin-breakfast'
        )}
        {logs !== null && logs.daysLogged > 0 && (
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {c.breakfastFromLogs(logs.breakfastDays, logs.daysLogged)}
          </Text>
        )}
      </View>

      {question === null ? (
        <Text testID="checkin-no-question" style={[typography['body-s'], { color: colors['ink-faint'] }]}>
          {c.noQuestion}
        </Text>
      ) : (
        <View style={{ gap: spacing['space-2'] }}>
          {label(c.questions[question.question] ?? question.question)}
          {question.draft && (
            <Text testID="checkin-draft" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
              {c.draft}
            </Text>
          )}
          {question.kind === 'choice' && question.options !== null ? (
            chips(
              question.options,
              form.behaviour,
              (v) => c.options[v] ?? v,
              (behaviour) => set({ behaviour }),
              'checkin-behaviour'
            )
          ) : (
            <TextInput
              value={form.behaviour ?? ''}
              onChangeText={(behaviour) => set({ behaviour })}
              keyboardType={question.kind === 'number' ? 'decimal-pad' : 'default'}
              multiline={question.kind === 'text'}
              placeholder={question.kind === 'number' ? c.hoursPlaceholder : c.answerPlaceholder}
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel={c.questions[question.question] ?? question.question}
              testID="checkin-behaviour"
              style={[...input, question.kind === 'text' && styles.multiline]}
            />
          )}
        </View>
      )}

      <View style={{ gap: spacing['space-2'] }}>
        {label(c.notes)}
        <TextInput
          value={form.notes ?? ''}
          onChangeText={(notes) => set({ notes })}
          multiline
          placeholder={t.common.optional}
          placeholderTextColor={colors['ink-faint']}
          accessibilityLabel={c.notes}
          testID="checkin-notes"
          style={[...input, styles.multiline]}
        />
      </View>

      {error !== null && (
        <Text testID="checkin-save-error" style={[typography['body-m'], { color: colors['cabai-deep'] }]}>
          {error}
        </Text>
      )}

      <View style={{ gap: spacing['space-2'] }}>
        {participantId === null ? (
          <Text testID="checkin-sign-in" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {c.signIn}
          </Text>
        ) : (
          gaps.length > 0 && (
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{c.stillNeeded}</Text>
          )
        )}
        <PushButton
          label={saving ? c.sending : existing !== null ? c.update : c.send}
          variant="success"
          fullWidth
          disabled={saving || gaps.length > 0 || participantId === null}
          testID="checkin-send"
          onPress={() => {
            send().catch((e: unknown) => setError(localised(messageOf(e), t)));
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
