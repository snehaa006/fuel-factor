import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealChallengeCard } from '@/components/meal-challenge-card';
import { ChallengePhoto } from '@/components/challenge-photo';
import { LessonCard } from '@/components/lesson-card';
import { PushButton } from '@/components/push-button';
import { todayIso } from '@/lib/today';
import { deckWeek } from '@/lib/food';
import { useMealChallenge } from '@/lib/use-meal-challenge';
import { useParticipantId } from '@/lib/use-foods';
import { useWeek } from '@/lib/use-learn';
import { useProgramme } from '@/lib/use-programme';
import { canRead, weekAccess } from '@/lib/weekly';
import { shortDate } from '@/components/calendar';
import { useStrings } from '@/i18n';
import { useContent } from '@/i18n/content';
import { useTheme } from '@/theme';

/**
 * One week of the programme, as the deck lays it out.
 *
 * The cards are rows and the order is the deck's. The only thing on this
 * screen the app owns is the challenge button: marking it done is engagement,
 * it records what the athlete says they did, and it grades nothing.
 *
 * **One card at a time.** Theo, 25 November, scrolling a week: "is it quite
 * long, do you think?" Ten to twelve cards in one column is a lot for a
 * 15 year old on a phone, so the lesson is a run of cards with a progress
 * bar, Back and Next -- the way the apps the squad already uses teach. "Show the whole lesson" puts the column back for
 * anyone looking something up. The challenge stays under the card, because
 * ticking it is a daily thing and should not mean paging through the lesson.
 *
 * **Not before its week.** Learn follows the athlete's programme week, so a
 * week that has not opened says when it will rather than showing early.
 */
export default function Week() {
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string }>();
  const weekNumber = Number(params.week);
  const participantId = useParticipantId();
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const content = useContent();

  const state = useWeek(weekNumber, participantId);
  const checked = useMealChallenge(Number.isInteger(weekNumber) ? weekNumber : undefined);
  const programme = useProgramme();
  const today = todayIso();
  const [step, setStep] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Derived, not stored: a route param that is not a number is known at
  // render, and setting state for it inside an effect only costs a second
  // render to say so.
  if (!Number.isInteger(weekNumber)) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text style={[typography['heading-l'], { color: colors.ink, padding: spacing['space-6'] }]}>
          {t.learn.notAWeek}
        </Text>
      </SafeAreaView>
    );
  }

  if (state.status === 'loading' || programme.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <View style={{ padding: spacing['space-6'], gap: spacing['space-2'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>
            {t.learn.couldNotOpen}
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const access = weekAccess(weekNumber, programme.status === 'ready' ? programme.programme : null);
  if (!canRead(access)) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" testID="week-back">
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.learn.learnCaps}</Text>
          </Pressable>
          <Text
            testID="week-locked"
            style={[typography['heading-l'], { color: colors.ink, marginTop: spacing['space-4'] }]}
          >
            {t.weekly.lockedTitle(weekNumber)}
          </Text>
          {access.state === 'future' && (
            <Text style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}>
              {t.weekly.lockedBody(shortDate(access.opensOn, t))}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { detail } = state;
  // Each week's food card is that week's deck's table, not the whole database.
  const foods = state.foods.filter((f) => deckWeek(f.source) === weekNumber);
  const done = detail.completedOn === today;
  const total = detail.cards.length;
  const at = Math.min(step, Math.max(total - 1, 0));
  const last = at === total - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.learn.backToProgramme}
          testID="week-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.learn.learnCaps}</Text>
        </Pressable>

        <Text
          style={[typography.label, { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}
        >
          {t.learn.weekCaps(detail.week.weekNumber)}
        </Text>
        <Text style={[typography['display-l'], { color: colors.ink }]}>
          {/* No theme invented for a week the programme has not written. */}
          {content(detail.week.theme) ?? t.learn.notWrittenYet}
        </Text>

        {showAll ? (
          <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
            {detail.cards.map((card) => (
              <LessonCard key={card.id} card={card} foods={foods} testID={`card-${card.kind}`} />
            ))}
          </View>
        ) : (
          total > 0 && (
            <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
              {/* How far through, as a bar and in words. */}
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 1, max: total, now: at + 1 }}
                style={[styles.track, { backgroundColor: colors['surface-sunken'] }]}
              >
                <View
                  testID="lesson-progress"
                  style={[
                    styles.fill,
                    { backgroundColor: colors.pisang, width: `${((at + 1) / total) * 100}%` },
                  ]}
                />
              </View>
              <Text testID="lesson-position" style={[typography.label, { color: colors['ink-muted'] }]}>
                {t.weekly.cardOf(at + 1, total)}
              </Text>

              <LessonCard
                key={detail.cards[at].id}
                card={detail.cards[at]}
                foods={foods}
                testID={`card-${detail.cards[at].kind}`}
              />

              {last && (
                <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
                  {t.weekly.lessonDone}
                </Text>
              )}

              <View style={styles.stepRow}>
                <View style={{ flex: 1 }}>
                  <PushButton
                    label={t.weekly.previous}
                    variant="ghost"
                    fullWidth
                    disabled={at === 0}
                    testID="lesson-previous"
                    onPress={() => setStep(at - 1)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {last ? (
                    <PushButton
                      label={t.weekly.backToLearn}
                      fullWidth
                      testID="lesson-finish"
                      onPress={() => router.back()}
                    />
                  ) : (
                    <PushButton
                      label={t.weekly.next}
                      fullWidth
                      testID="lesson-next"
                      onPress={() => setStep(at + 1)}
                    />
                  )}
                </View>
              </View>
            </View>
          )
        )}

        <Pressable
          onPress={() => setShowAll((v) => !v)}
          accessibilityRole="button"
          testID="lesson-show-all"
          style={{ paddingVertical: spacing['space-3'] }}
        >
          <Text style={[typography['body-s'], { color: colors['air-deep'], textAlign: 'center' }]}>
            {showAll ? t.weekly.showOne : t.weekly.showAll}
          </Text>
        </Pressable>

        {/* A challenge the log can answer is checked here, beside the tap
            that records what the athlete says. */}
        {checked.status === 'ready' && checked.week !== null && (
          <View style={{ marginTop: spacing['space-6'] }}>
            <MealChallengeCard
              week={checked.week}
              challenge={content(detail.week.challenge)}
              testID="meal-challenge"
            />
          </View>
        )}

        {detail.week.challengeId !== null && (
          <View style={{ marginTop: spacing['space-6'], gap: spacing['space-2'] }}>
            <PushButton
              label={done ? t.learn.doneToday : t.learn.markDone}
              variant={done ? 'success' : 'primary'}
              fullWidth
              testID="challenge-toggle"
              onPress={state.toggleChallenge}
            />
            {detail.completedOn !== null && !done && (
              <Text
                style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}
              >
                {t.learn.lastDone(shortDate(detail.completedOn, t))}
              </Text>
            )}

            {/* The photo is optional and comes after the tick, because the
                challenge is adding a carbohydrate and not proving it. */}
            <ChallengePhoto
              url={state.photoUrl}
              uploading={state.uploading}
              error={state.photoError}
              onPick={state.attachPhoto}
              onClear={state.clearPhoto}
              onPickError={state.reportPhotoError}
              testID="challenge-photo"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  fill: { height: 6, borderRadius: 3 },
  stepRow: { flexDirection: 'row', gap: 12 },
});
