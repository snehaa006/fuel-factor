import { useRouter } from 'expo-router';
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

import { PushButton } from '@/components/push-button';
import { RatingScale } from '@/components/rating-scale';
import { useStrings } from '@/i18n';
import { localised, messageOf } from '@/lib/errors';
import {
  LIKED,
  fromRow,
  reflectionOpen,
  reflectionReady,
  toReflectionRow,
  useReflection,
  type ReflectionAnswers,
} from '@/lib/reflection';
import { useParticipantId } from '@/lib/use-foods';
import { useProgramme } from '@/lib/use-programme';
import { useTheme } from '@/theme';

/**
 * The end-of-programme reflection.
 *
 * Sofia's three questions -- how was the programme, did you like it, what was
 * your best takeaway -- and an optional fourth for the feedback Theo named.
 * Saved to `programme_reflections`, one row per athlete; a second visit edits
 * it. See `lib/reflection.ts`.
 */
export default function ReflectionScreen() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const r = t.reflection;
  const participantId = useParticipantId();
  const programme = useProgramme();
  const state = useReflection(participantId);

  const [answers, setAnswers] = useState<ReflectionAnswers | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frame = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="reflection-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
        </Pressable>
        <Text style={[typography['display-m'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {r.title}
        </Text>
        <View style={{ marginTop: spacing['space-4'], gap: spacing['space-6'] }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );

  if (state.status === 'loading' || programme.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return frame(
      <Text testID="reflection-error" style={[typography['body-m'], { color: colors['cabai-deep'] }]}>
        {localised(state.message, t)}
      </Text>
    );
  }

  // Before the last days of week 4 there is nothing to look back on yet. With
  // no programme date set, the athlete is not kept out.
  const programmeState = programme.status === 'ready' ? programme.programme : null;
  if (programmeState !== null && programmeState.status !== 'no-date' && !reflectionOpen(programmeState)) {
    return frame(
      <Text testID="reflection-not-yet" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
        {r.notYet}
      </Text>
    );
  }

  if (sent) {
    return frame(
      <>
        <Text testID="reflection-thanks" style={[typography['display-m'], { color: colors['daun-deep'] }]}>
          {r.thanks}
        </Text>
        <Text style={[typography['body-l'], { color: colors.ink }]}>{r.thanksBody}</Text>
        <PushButton label={r.done} fullWidth testID="reflection-done" onPress={() => router.back()} />
      </>
    );
  }

  const existing = state.reflection;
  const form = answers ?? fromRow(existing);
  const set = (patch: Partial<ReflectionAnswers>) => setAnswers({ ...form, ...patch });
  const ready = reflectionReady(form);

  async function send() {
    if (participantId === null) return;
    setSaving(true);
    setError(null);
    try {
      await state.save(toReflectionRow(participantId, form));
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

  const input = [
    typography['body-l'],
    styles.multiline,
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
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>{r.lead}</Text>
        {existing !== null && (
          <Text testID="reflection-already" style={[typography['body-s'], { color: colors['air-deep'] }]}>
            {r.alreadyIn}
          </Text>
        )}
      </View>

      <RatingScale
        label={r.rating}
        value={form.rating}
        onChange={(rating) => set({ rating })}
        testID="reflection-rating"
      />

      <View style={{ gap: spacing['space-2'] }}>
        {label(r.liked)}
        <View style={styles.chips}>
          {LIKED.map((value, i) => {
            const on = form.liked === value;
            return (
              <Pressable
                key={value}
                onPress={() => set({ liked: value })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                testID={`reflection-liked-${i}`}
                style={{
                  backgroundColor: on ? colors.pisang : colors['surface-sunken'],
                  borderRadius: radius['radius-pill'],
                  paddingVertical: spacing['space-2'],
                  paddingHorizontal: spacing['space-4'],
                }}
              >
                <Text style={[typography['body-m'], { color: on ? colors['on-bright'] : colors.ink }]}>
                  {r.likedOptions[value] ?? value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: spacing['space-2'] }}>
        {label(r.takeaway)}
        <TextInput
          value={form.bestTakeaway}
          onChangeText={(bestTakeaway) => set({ bestTakeaway })}
          multiline
          placeholder={r.takeawayPlaceholder}
          placeholderTextColor={colors['ink-faint']}
          accessibilityLabel={r.takeaway}
          testID="reflection-takeaway"
          style={input}
        />
      </View>

      <View style={{ gap: spacing['space-2'] }}>
        {label(r.feedback)}
        <TextInput
          value={form.feedback}
          onChangeText={(feedback) => set({ feedback })}
          multiline
          placeholder={t.common.optional}
          placeholderTextColor={colors['ink-faint']}
          accessibilityLabel={r.feedback}
          testID="reflection-feedback"
          style={input}
        />
      </View>

      {error !== null && (
        <Text testID="reflection-save-error" style={[typography['body-m'], { color: colors['cabai-deep'] }]}>
          {error}
        </Text>
      )}

      <View style={{ gap: spacing['space-2'] }}>
        {participantId === null ? (
          <Text testID="reflection-sign-in" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {r.signIn}
          </Text>
        ) : (
          !ready && <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{r.needed}</Text>
        )}
        <PushButton
          label={saving ? r.sending : existing !== null ? r.update : r.send}
          variant="success"
          fullWidth
          disabled={saving || !ready || participantId === null}
          testID="reflection-send"
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
