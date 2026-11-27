import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { useStrings } from '@/i18n';
import { todayIso } from '@/lib/today';
import { useParticipantId } from '@/lib/use-foods';
import { useCards } from '@/lib/use-learn';
import { useProgramme } from '@/lib/use-programme';
import { saveCheck } from '@/lib/week-check';
import { canRead, isRight, quizFor, weekAccess, type Question } from '@/lib/weekly';
import { useTheme } from '@/theme';

/**
 * A week's check: a handful of questions from that week's lesson.
 *
 * Every question and every answer is the deck's (see `lib/weekly.ts`). After
 * each answer the deck's own figure or fact is shown, right or wrong, so the
 * check teaches on the way through rather than only marking. The score stays
 * on the phone; a retake replaces it.
 */
export default function WeekCheck() {
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string }>();
  const week = Number(params.week);
  const valid = Number.isInteger(week) && week >= 1 && week <= 4;
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const w = t.weekly;
  const participantId = useParticipantId();
  const programme = useProgramme();
  const cards = useCards(valid ? String(week) : '');

  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const frame = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="check-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.learn.learnCaps}</Text>
        </Pressable>
        <Text style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {w.checkTitle(valid ? week : 0)}
        </Text>
        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-4'] }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );

  if (!valid) {
    return frame(<Text style={[typography['body-m'], { color: colors.ink }]}>{t.learn.notAWeek}</Text>);
  }

  if (cards.status === 'loading' || programme.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (cards.status === 'error') {
    return frame(
      <Text testID="check-error" style={[typography['body-m'], { color: colors['cabai-deep'] }]}>
        {cards.message}
      </Text>
    );
  }

  // A week that has not opened has nothing to check yet.
  const access = weekAccess(week, programme.status === 'ready' ? programme.programme : null);
  if (!canRead(access)) {
    return frame(
      <Text testID="check-locked" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
        {w.lockedTitle(week)}
      </Text>
    );
  }

  const questions = quizFor(cards.cards[week] ?? [], week);
  if (questions.length === 0) {
    return frame(
      <Text testID="check-empty" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
        {w.noQuestions}
      </Text>
    );
  }

  const right = questions.filter((q) => answers[q.id] !== undefined && isRight(q, answers[q.id])).length;

  function finish() {
    setFinished(true);
    if (participantId !== null) {
      saveCheck(participantId, week, { right, total: questions.length, on: todayIso() });
    }
  }

  if (step < 0) {
    return frame(
      <>
        <Text style={[typography['body-l'], { color: colors.ink }]}>{w.checkLead(questions.length)}</Text>
        <PushButton label={w.start} fullWidth testID="check-start" onPress={() => setStep(0)} />
      </>
    );
  }

  if (finished) {
    return frame(
      <>
        <Text testID="check-score" style={[typography['display-m'], { color: colors.ink }]}>
          {w.score(right, questions.length)}
        </Text>
        {right === questions.length && (
          <Text style={[typography['body-l'], { color: colors['daun-deep'] }]}>{w.allRight}</Text>
        )}
        <PushButton label={w.finish} fullWidth testID="check-done" onPress={() => router.back()} />
        <PushButton
          label={w.retake}
          variant="ghost"
          fullWidth
          testID="check-retake"
          onPress={() => {
            setAnswers({});
            setFinished(false);
            setStep(0);
          }}
        />
      </>
    );
  }

  const question = questions[step];
  const answered = answers[question.id];
  const last = step === questions.length - 1;
  const choices =
    question.kind === 'myth'
      ? [
          { value: 'myth', label: w.myth },
          { value: 'fact', label: w.fact },
        ]
      : question.choices.map((c) => ({ value: c, label: c }));

  return frame(
    <>
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>
        {w.questionOf(step + 1, questions.length)}
      </Text>
      <Text style={[typography.label, { color: colors['air-deep'] }]}>
        {question.kind === 'myth' ? w.mythOrFact : w.whichFigure}
      </Text>
      <Text testID="check-prompt" style={[typography['heading-l'], { color: colors.ink }]}>
        {question.kind === 'myth' ? `“${question.prompt}”` : question.prompt}
      </Text>

      <View style={{ gap: spacing['space-2'] }}>
        {choices.map((choice, i) => {
          const picked = answered === choice.value;
          const correct = choice.value === question.answer;
          const reveal = answered !== undefined;
          const fill = !reveal
            ? colors['surface-raised']
            : correct
              ? colors['daun-tint']
              : picked
                ? colors['cabai-tint']
                : colors['surface-raised'];
          return (
            <Pressable
              key={choice.value}
              onPress={() =>
                answered === undefined &&
                setAnswers((current) => ({ ...current, [question.id]: choice.value }))
              }
              disabled={reveal}
              accessibilityRole="button"
              accessibilityState={{ selected: picked, disabled: reveal }}
              testID={`check-choice-${i}`}
              style={{
                backgroundColor: fill,
                borderRadius: radius['radius-lg'],
                borderWidth: reveal && (correct || picked) ? 2 : 0,
                borderColor: correct ? colors['daun-deep'] : colors['cabai-deep'],
                padding: spacing['space-4'],
              }}
            >
              <Text style={[typography['heading-m'], { color: colors.ink }]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {answered !== undefined && (
        <Feedback question={question} right={isRight(question, answered)} />
      )}

      {answered !== undefined && (
        <PushButton
          label={last ? w.seeScore : w.nextQuestion}
          fullWidth
          testID="check-next"
          onPress={() => (last ? finish() : setStep(step + 1))}
        />
      )}
    </>
  );
}

/** Right or not, then the deck's own answer. */
function Feedback({ question, right }: { question: Question; right: boolean }) {
  const { colors, radius, spacing, typography } = useTheme();
  const w = useStrings().weekly;

  return (
    <View
      testID="check-feedback"
      style={{
        backgroundColor: colors['surface-raised'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-4'],
        gap: spacing['space-1'],
      }}
    >
      <Text style={[typography['heading-m'], { color: right ? colors['daun-deep'] : colors['cabai-deep'] }]}>
        {right ? w.right : w.notQuite}
      </Text>
      {question.kind === 'myth' ? (
        <>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{w.itsAMyth}</Text>
          <Text style={[typography['body-m'], { color: colors.ink }]}>{question.explanation}</Text>
        </>
      ) : (
        <Text style={[typography['body-m'], { color: colors.ink }]}>
          {w.itIs(question.answer)} {question.prompt}
        </Text>
      )}
      {question.heading !== null && (
        <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>{question.heading}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
