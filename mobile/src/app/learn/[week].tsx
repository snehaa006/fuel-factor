import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarbChallengeCard } from '@/components/carb-challenge-card';
import { ChallengePhoto } from '@/components/challenge-photo';
import { LessonCard } from '@/components/lesson-card';
import { PushButton } from '@/components/push-button';
import { todayIso } from '@/lib/today';
import { CARB_CHALLENGE_WEEK } from '@/lib/carb-challenge';
import { useCarbChallenge } from '@/lib/use-carb-challenge';
import { useParticipantId } from '@/lib/use-foods';
import { useWeek } from '@/lib/use-learn';
import { useTheme } from '@/theme';

/**
 * One week of the programme, as the deck lays it out.
 *
 * The cards are rows and the order is the deck's. The only thing on this
 * screen the app owns is the challenge button: marking it done is engagement,
 * it records what the athlete says they did, and it grades nothing.
 */
export default function Week() {
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string }>();
  const weekNumber = Number(params.week);
  const participantId = useParticipantId();
  const { colors, spacing, typography } = useTheme();

  const state = useWeek(weekNumber, participantId);
  const carb = useCarbChallenge();
  const today = todayIso();

  // Derived, not stored: a route param that is not a number is known at
  // render, and setting state for it inside an effect only costs a second
  // render to say so.
  if (!Number.isInteger(weekNumber)) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text style={[typography['heading-l'], { color: colors.ink, padding: spacing['space-6'] }]}>
          That is not a week of the programme.
        </Text>
      </SafeAreaView>
    );
  }

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
        <View style={{ padding: spacing['space-6'], gap: spacing['space-2'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>
            Could not open this week
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { detail, foods } = state;
  const done = detail.completedOn === today;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to the programme"
          testID="week-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← LEARN</Text>
        </Pressable>

        <Text
          style={[typography.label, { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}
        >
          WEEK {detail.week.weekNumber}
        </Text>
        <Text style={[typography['display-l'], { color: colors.ink }]}>
          {/* No theme invented for a week the programme has not written. */}
          {detail.week.theme ?? 'Not written yet'}
        </Text>

        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-3'] }}>
          {detail.cards.map((card) => (
            <LessonCard key={card.id} card={card} foods={foods} testID={`card-${card.kind}`} />
          ))}
        </View>

        {/* Week 1's challenge is checkable from the log, so it is checked
            here, beside the tap that records what the athlete says. */}
        {weekNumber === CARB_CHALLENGE_WEEK && carb.status === 'ready' && (
          <View style={{ marginTop: spacing['space-6'] }}>
            <CarbChallengeCard
              week={carb.week}
              challenge={detail.week.challenge}
              testID="carb-challenge"
            />
          </View>
        )}

        {detail.week.challengeId !== null && (
          <View style={{ marginTop: spacing['space-6'], gap: spacing['space-2'] }}>
            <PushButton
              label={done ? 'Done today ✓' : 'Mark the challenge done'}
              variant={done ? 'success' : 'primary'}
              fullWidth
              testID="challenge-toggle"
              onPress={state.toggleChallenge}
            />
            {detail.completedOn !== null && !done && (
              <Text
                style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}
              >
                Last done {detail.completedOn}
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
});
