import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { RecallFields } from '@/components/recall-fields';
import { ScaleGuide, type Scale } from '@/components/scale-guide';
import { messageOf } from '@/lib/errors';
import {
  blankDraft,
  draftOf,
  entryOf,
  hasAnyAnswer,
  hasAnyMeal,
  type RecallDraft,
  type RecallEntry,
} from '@/lib/recall';
import {
  BASELINE_DAYS,
  DAY_CHOICE_GUIDANCE,
  FOLLOW_UP_DAYS,
  ROUND_LABEL,
  positionInRound,
  type RecallRound,
} from '@/lib/recall-window';
import { useRecallRound, useRecallStatus, type RecallRoundController } from '@/lib/use-recall';
import { useTheme } from '@/theme';

/** The controller once the round has loaded, which is all Round sees. */
type LoadedRound = Extract<RecallRoundController, { status: 'ready' }>;

/**
 * All three days of a round, in one sitting.
 *
 * The day-at-a-time screen is still there and is still the one the prompts
 * point at. This is the other way round the same instrument: an athlete who
 * sits down on a Sunday with three days to remember should not have to walk
 * back out to a list and in again between each one.
 *
 * **It is three rows and three saves, not one.** A day is written as it is
 * finished, so a refused write costs the day being typed and not the two
 * already in. Holding all three until the end would mean a network blip after
 * twenty minutes of typing loses all of it, and three upserts have no
 * transaction across them to make that trade worth anything.
 *
 * Which round it is comes from the window rather than the route: the baseline
 * is what is being asked for until it is in, and the follow-up only once the
 * four weeks are up. A route parameter would let a link ask an athlete for
 * the follow-up in week one.
 */
export default function RecallAll() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const status = useRecallStatus();

  // The round is decided before the days load, and `useRecallRound` is a hook
  // -- so it is called every render with whatever the window currently says.
  // Baseline until the window says otherwise, which is also what it says
  // while the status is still loading.
  const round: RecallRound =
    status.status === 'ready' && status.window.status === 'due' ? status.window.round : 'baseline';
  const days = round === 'baseline' ? BASELINE_DAYS : FOLLOW_UP_DAYS;
  const state = useRecallRound(days);

  if (status.status === 'needs-onboarding' || state.status === 'needs-onboarding') {
    return <Redirect href="/welcome" />;
  }

  if (status.status === 'loading' || state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  const failed = status.status === 'error' ? status.message : null;
  const loadError = state.status === 'error' ? state.message : failed;
  if (loadError !== null) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text
          testID="all-load-error"
          style={[
            typography['body-m'],
            { color: colors['cabai-deep'], padding: spacing['space-6'], textAlign: 'center' },
          ]}
        >
          {loadError}
        </Text>
      </SafeAreaView>
    );
  }

  if (state.status !== 'ready') return null;

  return (
    <Round
      round={round}
      days={days}
      controller={state}
      onDone={() => router.replace('/recall')}
      onBack={() => router.back()}
    />
  );
}

function Round({
  round,
  days,
  controller,
  onDone,
  onBack,
}: {
  round: RecallRound;
  days: readonly number[];
  controller: LoadedRound;
  onDone: () => void;
  onBack: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  // Lazy and mounted with every answer already in hand, so no effect copies
  // loaded data into a draft and no render shows an empty form over one.
  const [drafts, setDrafts] = useState<Record<number, RecallDraft>>(() =>
    Object.fromEntries(
      days.map((day) => [
        day,
        controller.entries[day] === undefined ? blankDraft() : draftOf(controller.entries[day]),
      ])
    )
  );
  // Open on the first day that has nothing on record, so somebody coming back
  // to finish a round lands where they left off.
  const [active, setActive] = useState<number>(
    () => days.find((day) => controller.entries[day] === undefined) ?? days[0]
  );
  const [guide, setGuide] = useState<Scale | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = drafts[active] ?? blankDraft();
  const entry: RecallEntry = entryOf(draft);
  const saving = controller.savingDay !== null;
  const remaining = days.filter((day) => !controller.savedDays.includes(day));
  // The day after this one that still has nothing in it, if there is one.
  const next = days.find((day) => day > active && !controller.savedDays.includes(day));
  const allIn = remaining.length === 0;

  async function saveActive() {
    setError(null);
    try {
      await controller.save(active, entry);
      if (next !== undefined) setActive(next);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable onPress={onBack} accessibilityRole="button" testID="all-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
        </Pressable>

        <Text
          style={[typography.label, { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}
        >
          {ROUND_LABEL[round].toUpperCase()}
        </Text>
        <Text style={[typography['display-l'], { color: colors.ink }]}>All three days</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          Fill them in one sitting, or leave and come back — each day is saved as you finish it.{' '}
          {DAY_CHOICE_GUIDANCE}
        </Text>

        {/* Three tabs rather than three stacked forms. The instrument is five
            sections long; three of them down one scroll on a phone is a form
            nobody reaches the bottom of. */}
        <View
          testID="all-tabs"
          accessibilityRole="tablist"
          style={[styles.tabs, { marginTop: spacing['space-6'], gap: spacing['space-2'] }]}
        >
          {days.map((day) => {
            const saved = controller.savedDays.includes(day);
            const selected = day === active;
            return (
              <Pressable
                key={day}
                onPress={() => setActive(day)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`Day ${positionInRound(day)}${saved ? ', saved' : ', not saved yet'}`}
                testID={`all-tab-${day}`}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: selected
                      ? colors.pisang
                      : pressed
                        ? colors['surface-sunken']
                        : saved
                          ? colors['daun-tint']
                          : colors['surface-raised'],
                    borderColor: selected ? colors.pisang : colors.hairline,
                    borderRadius: radius['radius-md'],
                    paddingVertical: spacing['space-3'],
                  },
                ]}
              >
                <Text
                  style={[
                    typography.label,
                    { color: selected ? colors['on-bright'] : colors.ink },
                  ]}
                >
                  DAY {positionInRound(day)}
                </Text>
                <Text
                  testID={`all-tab-${day}-state`}
                  style={[
                    typography['body-s'],
                    { color: selected ? colors['on-bright'] : colors['ink-muted'] },
                  ]}
                >
                  {saved ? 'Saved' : 'Not yet'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing['space-8'] }}>
          <RecallFields
            // Remounted per day so each day's controls start from that day's
            // draft rather than carrying the last one's cursor and scroll.
            key={active}
            draft={draft}
            onChange={(next) => setDrafts((all) => ({ ...all, [active]: next }))}
            onShowGuide={setGuide}
          />
        </View>

        {!hasAnyMeal(entry) && hasAnyAnswer(entry) && (
          <Text
            testID="all-no-meals"
            style={[
              typography['body-s'],
              { color: colors['ink-muted'], marginTop: spacing['space-6'] },
            ]}
          >
            No meals written in yet. The day will still be saved, but it cannot go through the food
            database without them.
          </Text>
        )}

        {(error ?? controller.saveError) !== null && (
          <Text
            testID="all-save-error"
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
              controller.savingDay === active
                ? 'Saving…'
                : next === undefined
                  ? `Save day ${positionInRound(active)}`
                  : `Save and go to day ${positionInRound(next)}`
            }
            variant="success"
            fullWidth
            // An empty day is not saved: it would write a row of nulls into a
            // research table and count as one of the programme's three days.
            disabled={saving || !hasAnyAnswer(entry)}
            testID="all-save"
            onPress={() => {
              // An async onPress swallows its own rejection, and a save button
              // that silently does nothing is the worst version of this screen.
              saveActive().catch((e: unknown) => setError(messageOf(e)));
            }}
          />

          {allIn ? (
            <View
              testID="all-done"
              style={{
                backgroundColor: colors['daun-tint'],
                borderRadius: radius['radius-lg'],
                padding: spacing['space-4'],
                gap: spacing['space-2'],
              }}
            >
              <Text style={[typography['heading-m'], { color: colors['daun-deep'] }]}>
                All three days are in.
              </Text>
              <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                You can still open any of them above and change what you wrote.
              </Text>
              <PushButton label="Done" fullWidth testID="all-finish" onPress={onDone} />
            </View>
          ) : (
            <Text
              testID="all-remaining"
              style={[typography['body-s'], { color: colors['ink-muted'], textAlign: 'center' }]}
            >
              {remaining.length} of {days.length}{' '}
              {remaining.length === 1 ? 'day still to go' : 'days still to go'}.
            </Text>
          )}
        </View>
      </ScrollView>

      <ScaleGuide scale={guide} onClose={() => setGuide(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', borderWidth: 1, gap: 2 },
});
