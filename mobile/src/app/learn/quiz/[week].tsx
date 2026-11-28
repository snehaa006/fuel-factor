import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { shortDate } from '@/components/calendar';
import { Mascot, type MascotPose } from '@/components/mascot';
import { PushButton } from '@/components/push-button';
import { StackCard } from '@/components/stack-card';
import { useStrings } from '@/i18n';
import { localised, messageOf } from '@/lib/errors';
import { fetchBadges, newlyEarned, NO_STATS, quizStats, type Badge } from '@/lib/badges';
import { fetchWeekFacts } from '@/lib/daily-facts';
import { useLanguage } from '@/lib/preferences';
import { letter, missedDays, quizOpen, quizOpensOn, scoreOf, useQuiz, useQuizResults } from '@/lib/quiz';
import { useParticipantId } from '@/lib/use-foods';
import { useProgramme } from '@/lib/use-programme';
import { useTheme } from '@/theme';
import { palette } from '@/theme/tokens';

/**
 * The mini quiz: one question for each day of the week's fun facts.
 *
 * Drawn as a printed card in both themes -- teal on a darker teal, cream
 * answer pills -- the way Sneha's references were. Tap an answer and it says
 * at once whether it was right, and which day's fact it came from; at the end,
 * the score, the days worth another look, and a try-again. The latest attempt
 * is saved for the coach (`lib/quiz.ts`).
 */

// A printed card keeps its colours whatever the theme.
const CARD = palette.light.air;
const CARD_SHADOW = palette.light['air-deep'];
const CARD_EDGE = palette.light.langit;
const CREAM = palette.light['surface-raised'];
const INK = palette.light.ink;
const RIGHT = palette.light.daun;
const WRONG = palette.light.cabai;
const GOLD = palette.light.pisang;
const GOLD_DEEP = palette.light['pisang-deep'];

/** One flat five-point star: filled for a right answer, an outline for a miss. */
function Star({ filled }: { filled: boolean }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Path
        d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L2.9 9.4l6.3-.9L12 2.8z"
        fill={filled ? GOLD : 'none'}
        stroke={filled ? GOLD_DEEP : CREAM}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function Quiz() {
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string }>();
  const week = Number(params.week);
  const valid = Number.isInteger(week) && week >= 1 && week <= 4;
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const q = t.quiz;
  const language = useLanguage();
  const participantId = useParticipantId();
  const programme = useProgramme();
  const quiz = useQuiz(valid ? week : 1);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earned, setEarned] = useState<Badge[]>([]);
  const results = useQuizResults(participantId);

  // The badges, so finishing can say which one this attempt has just earned.
  useEffect(() => {
    let active = true;
    fetchBadges()
      .then((all) => active && setBadges(all))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Each question names the day's fact it checks, so a miss says what to reread.
  useEffect(() => {
    if (!valid) return;
    let active = true;
    fetchWeekFacts(week)
      .then((facts) => {
        if (!active) return;
        const byDay: Record<number, string> = {};
        for (const f of facts) {
          const title = language === 'id' && f.titleId ? f.titleId : f.title;
          if (title) byDay[f.day] = title;
        }
        setTitles(byDay);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [week, valid, language]);

  const frame = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="quiz-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
        </Pressable>
        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-4'] }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );

  if (!valid) {
    return frame(<Text style={[typography['body-m'], { color: colors.ink }]}>{t.learn.notAWeek}</Text>);
  }
  if (quiz.status === 'loading' || programme.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }
  if (quiz.status === 'error') {
    return frame(
      <Text testID="quiz-error" style={[typography['body-m'], { color: colors['cabai-deep'] }]}>
        {localised(quiz.message, t)}
      </Text>
    );
  }

  const state = programme.status === 'ready' ? programme.programme : null;
  if (state !== null && state.status !== 'no-date' && !quizOpen(week, state)) {
    return frame(
      <Text testID="quiz-not-yet" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
        {q.notYet(shortDate(quizOpensOn(state.startsOn, week), t))}
      </Text>
    );
  }

  const questions = quiz.questions;
  const total = questions.length;
  const cardHead = (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={[typography.label, styles.eyebrow, { color: CREAM, borderBottomColor: CREAM }]}>
        {q.eyebrow}
      </Text>
      <Text style={[typography['display-l'], { color: CREAM }]}>{q.title(week)}</Text>
    </View>
  );

  if (finished) {
    const score = scoreOf(questions, answers);
    const missed = missedDays(questions, answers);
    const pose: MascotPose = score >= total - 1 ? 'best' : score >= total / 2 ? 'think' : 'learn';
    const line = score >= total - 1 ? q.great : score >= total / 2 ? q.good : q.again;
    return frame(
      <>
        <StackCard color={CARD} shadow={CARD_SHADOW} border={CARD_EDGE} testID="quiz-result">
          <View style={[styles.cardBody, { alignItems: 'center' }]}>
            {cardHead}
            <Mascot pose={pose} size={110} motion="celebrate" />
            <Text testID="quiz-score" style={[typography['stat-hero'], { color: CREAM }]}>
              {score}/{total}
            </Text>
            <View
              style={styles.stars}
              accessible
              accessibilityLabel={q.stars(score, total)}
              testID="quiz-stars"
            >
              {questions.map((question, i) => (
                <Star key={question.position} filled={answers[i] === question.answer} />
              ))}
            </View>
            <Text style={[typography['body-l'], { color: CREAM, textAlign: 'center' }]}>{line}</Text>
          </View>
        </StackCard>
        {earned.map((badge) => {
          const words = t.badges.names[badge.code] ?? { name: badge.name, description: badge.description };
          return (
            <StackCard
              key={badge.code}
              color={GOLD}
              shadow={GOLD_DEEP}
              border={INK}
              radius={20}
              testID={`quiz-badge-${badge.code}`}
            >
              <View style={[styles.badgeBody, { padding: spacing['space-4'] }]}>
                <Mascot pose="balloons" size={64} motion="celebrate" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[typography.label, { color: INK }]}>{q.newBadge}</Text>
                  <Text style={[typography['display-m'], { color: INK }]}>{words.name}</Text>
                  <Text style={[typography['body-s'], { color: INK }]}>{words.description}</Text>
                </View>
              </View>
            </StackCard>
          );
        })}
        {earned.length > 0 && (
          <Pressable onPress={() => router.push('/team')} accessibilityRole="link" testID="quiz-see-badges">
            <Text style={[typography.label, { color: colors['air-deep'] }]}>{q.seeBadges} ›</Text>
          </Pressable>
        )}
        {missed.length > 0 && (
          <View style={{ gap: spacing['space-2'] }} testID="quiz-review">
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>{q.review}</Text>
            {missed.map((day) => (
              <Text key={day} style={[typography['body-m'], { color: colors.ink }]}>
                {q.fromDay(day, titles[day] ?? '')}
              </Text>
            ))}
          </View>
        )}
        {saveError !== null && (
          <Text testID="quiz-save-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
            {saveError}
          </Text>
        )}
        <View style={{ gap: spacing['space-3'] }}>
          <PushButton label={q.done} fullWidth testID="quiz-done" onPress={() => router.back()} />
          <PushButton
            label={q.retry}
            variant="ghost"
            fullWidth
            testID="quiz-retry"
            onPress={() => {
              setAnswers([]);
              setIndex(0);
              setFinished(false);
              setSaveError(null);
              setEarned([]);
            }}
          />
        </View>
      </>
    );
  }

  const question = questions[index];
  if (!question) return frame(null);
  const chosen = answers[index] ?? null;
  const revealed = chosen !== null;
  const options = language === 'id' && question.optionsId ? question.optionsId : question.options;
  const text = language === 'id' && question.questionId ? question.questionId : question.question;
  const last = index === total - 1;

  function choose(option: number) {
    if (revealed) return;
    const next = [...answers];
    next[index] = option;
    setAnswers(next);
  }

  async function finish() {
    // The reward: any quiz badge this attempt takes over its threshold.
    const prior = results.status === 'ready' ? results.results.filter((r) => r.week !== week) : [];
    const before = { ...NO_STATS, ...quizStats(results.status === 'ready' ? results.results : []) };
    const after = { ...NO_STATS, ...quizStats([...prior, { score: scoreOf(questions, answers), total }]) };
    setEarned(newlyEarned(badges, before, after));
    setFinished(true);
    if (participantId === null) return;
    try {
      await quiz.save({
        participant_id: participantId,
        week,
        answers: answers.map((a) => a ?? -1),
        score: scoreOf(questions, answers),
        total,
      });
    } catch (e) {
      setSaveError(localised(messageOf(e), t));
    }
  }

  return frame(
    <>
      <StackCard color={CARD} shadow={CARD_SHADOW} border={CARD_EDGE} testID="quiz-card">
        <View style={styles.cardBody}>
          {cardHead}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text testID="quiz-progress" style={[typography['body-m'], { color: CREAM }]}>
              {q.question(index + 1, total)}
            </Text>
            <Text
              testID="quiz-question"
              style={[typography['heading-l'], { color: CREAM, textAlign: 'center' }]}
            >
              {text}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {options.map((option, i) => {
              const isRight = i === question.answer;
              const isChosen = i === chosen;
              const fill = !revealed ? CREAM : isRight ? RIGHT : isChosen ? WRONG : CREAM;
              const ink = revealed && isChosen && !isRight ? CREAM : INK;
              return (
                <Pressable
                  key={i}
                  onPress={() => choose(i)}
                  disabled={revealed}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isChosen, disabled: revealed }}
                  testID={`quiz-option-${i}`}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: fill,
                      borderColor: CARD_EDGE,
                      opacity: revealed && !isRight && !isChosen ? 0.55 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[typography.button, styles.optionText, { color: ink }]}>
                    {letter(i)}. {option.toUpperCase()}
                  </Text>
                  {revealed && (isRight || isChosen) && (
                    <Text style={[typography.button, { color: ink }]}>{isRight ? '✓' : '✗'}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </StackCard>

      {revealed && (
        <View style={{ gap: spacing['space-2'] }}>
          <Text
            testID="quiz-feedback"
            style={[
              typography['heading-m'],
              { color: chosen === question.answer ? colors['daun-deep'] : colors['cabai-deep'] },
            ]}
          >
            {chosen === question.answer
              ? q.right
              : q.answerWas(letter(question.answer), options[question.answer])}
          </Text>
          {titles[question.position] !== undefined && (
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
              {q.fromDay(question.position, titles[question.position])}
            </Text>
          )}
          <PushButton
            label={last ? q.seeScore : q.next}
            fullWidth
            testID="quiz-next"
            onPress={() => {
              if (last) {
                finish().catch(() => {});
              } else {
                setIndex(index + 1);
              }
            }}
          />
        </View>
      )}
      {participantId === null && (
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{q.signIn}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  cardBody: { padding: 20, gap: 16 },
  eyebrow: { borderBottomWidth: 1.5, paddingBottom: 3 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: { flex: 1, letterSpacing: 1.2 },
  stars: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  badgeBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
