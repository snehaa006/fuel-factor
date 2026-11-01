import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { messageOf } from '@/lib/errors';
import { inviteMessage, inviteUrl } from '@/lib/invite';
import { isIsoDate, PROGRAMME_WEEKS } from '@/lib/recall-window';
import { todayIso } from '@/lib/today';
import { useCoachTeam } from '@/lib/use-coach-team';
import { useTheme } from '@/theme';

/**
 * Create a team, and hand out the link.
 *
 * The two codes are generated in the database and shown here with a line about
 * which is which, because the whole point of there being two is lost if a
 * coach pastes the wrong one into a group chat. The join code is big and meant
 * to be shared; the coach code is set apart and labelled as the one that is
 * not.
 */
export default function CoachTeamScreen() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const state = useCoachTeam();

  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" testID="team-back">
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>← BACK</Text>
    </Pressable>
  );

  const frame = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        {back}
        {children}
      </ScrollView>
    </SafeAreaView>
  );

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return frame(
      <Text
        testID="team-error"
        style={[typography['body-m'], { color: colors['cabai-deep'], marginTop: spacing['space-6'] }]}
      >
        {state.message}
      </Text>
    );
  }

  if (state.status === 'needs-account') {
    return frame(
      <View style={{ marginTop: spacing['space-2'], gap: spacing['space-4'] }}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>Your squad</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          Creating a team needs a coach account with an email. The squad still joins from a link
          with no password.
        </Text>
        <PushButton
          label="Coach sign-in"
          fullWidth
          testID="team-sign-in"
          onPress={() => router.push('/coach/account')}
        />
      </View>
    );
  }

  if (state.status === 'no-team') {
    const dateTyped = startsOn.trim();
    const dateOk = dateTyped === '' || isIsoDate(dateTyped);

    return frame(
      <View style={{ marginTop: spacing['space-2'], gap: spacing['space-4'] }}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>Create a team</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          Signed in as {state.email}. You get a link to send the squad as soon as the team exists.
        </Text>

        <View style={{ gap: spacing['space-2'] }}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>TEAM NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Jakarta U16"
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel="Team name"
            testID="team-name"
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
        </View>

        <View style={{ gap: spacing['space-2'] }}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>
            FIRST DAY OF THE PROGRAMME — OPTIONAL
          </Text>
          <TextInput
            value={startsOn}
            onChangeText={setStartsOn}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors['ink-faint']}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="First day of the programme"
            testID="team-start"
            style={[
              typography['body-l'],
              {
                backgroundColor: colors['surface-sunken'],
                borderRadius: radius['radius-lg'],
                color: colors.ink,
                padding: spacing['space-4'],
              },
            ]}
          />
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {/* Said here because every recall prompt is counted from it. */}
            The squad fills their three baseline recall days before this date, and the app asks
            again {PROGRAMME_WEEKS} weeks after it. You can set it later.
          </Text>
          {!dateOk && (
            <Text testID="team-start-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
              That is not a date. Use YYYY-MM-DD, like {todayIso()}.
            </Text>
          )}
        </View>

        {state.actionError !== null && (
          <Text testID="team-create-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
            {state.actionError}
          </Text>
        )}

        <PushButton
          label={state.busy ? 'Creating…' : 'Create the team'}
          fullWidth
          disabled={name.trim() === '' || !dateOk || state.busy}
          testID="team-create"
          onPress={() => {
            state.create(name, dateTyped === '' ? null : dateTyped).catch(() => {
              // Reported through actionError by the hook.
            });
          }}
        />
      </View>
    );
  }

  const { team } = state;

  return frame(
    <View style={{ marginTop: spacing['space-2'], gap: spacing['space-6'] }}>
      <View>
        <Text style={[typography['display-l'], { color: colors.ink }]}>{team.name}</Text>
        <Text testID="team-count" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {team.athletes} {team.athletes === 1 ? 'athlete' : 'athletes'} · signed in as{' '}
          {state.email}
        </Text>
      </View>

      {/* The join code, large, because a coach reads it out across a pitch as
          often as they paste it. */}
      <View
        style={{
          backgroundColor: colors['pisang-tint'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-2'],
        }}
      >
        <Text style={[typography.label, { color: colors['pisang-deep'] }]}>
          TEAM CODE — SHARE THIS
        </Text>
        <Text testID="team-join-code" style={[typography['stat-hero'], { color: colors.ink }]}>
          {team.joinCode}
        </Text>
        <Text selectable style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {inviteUrl(team.joinCode)}
        </Text>
        <View style={{ marginTop: spacing['space-2'] }}>
          <PushButton
            label="Send the invite"
            fullWidth
            testID="team-share"
            onPress={() => {
              // Share rejects when the sheet is dismissed on some platforms,
              // and an async onPress that swallows its rejection is a button
              // that silently does nothing.
              Share.share({ message: inviteMessage(team.name, team.joinCode) }).catch(
                (e: unknown) => setShareError(messageOf(e))
              );
            }}
          />
        </View>
        {shareError !== null && (
          <Text testID="team-share-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
            {shareError}
          </Text>
        )}
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {/* The honest limit of a custom-scheme link, said rather than
              discovered by a parent on a phone without the app. */}
          The link only opens if Fuel Factor is already installed, so the message carries the code
          as well.
        </Text>
      </View>

      {/* Set apart and labelled, because the two codes do very different
          things and a coach must never paste this one into a group chat. */}
      <View
        style={{
          backgroundColor: colors['surface-raised'],
          borderColor: colors.hairline,
          borderWidth: 1,
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-1'],
        }}
      >
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>
          COACH CODE — DO NOT SHARE
        </Text>
        <Text testID="team-coach-code" style={[typography['heading-l'], { color: colors.ink }]}>
          {team.coachCode}
        </Text>
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          This one lets another coach open the dashboard and read every athlete&apos;s logs. The
          team code above does not.
        </Text>
      </View>

      <ProgrammeStart
        startsOn={team.programmeStartsOn}
        busy={state.busy}
        onSet={(date) => {
          state.setStart(date).catch(() => {});
        }}
      />

      <PushButton
        label="Open the dashboard"
        variant="ghost"
        fullWidth
        testID="team-dashboard"
        onPress={() => router.push('/coach')}
      />
    </View>
  );
}

/** Day one of the four weeks: set it, move it, or clear it. */
function ProgrammeStart({
  startsOn,
  busy,
  onSet,
}: {
  startsOn: string | null;
  busy: boolean;
  onSet: (date: string | null) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [draft, setDraft] = useState(startsOn ?? '');
  const typed = draft.trim();
  const ok = typed === '' || isIsoDate(typed);

  return (
    <View style={{ gap: spacing['space-2'] }}>
      <Text style={[typography['heading-l'], { color: colors.ink }]}>The four weeks</Text>
      <Text testID="team-programme" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
        {startsOn === null
          ? 'Not set. The squad can still fill their baseline recall; the follow-up needs a date to count from.'
          : `Day one is ${startsOn}. The follow-up recall opens ${PROGRAMME_WEEKS} weeks later.`}
      </Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors['ink-faint']}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="First day of the programme"
        testID="team-programme-input"
        style={[
          typography['body-l'],
          {
            backgroundColor: colors['surface-sunken'],
            borderRadius: radius['radius-lg'],
            color: colors.ink,
            padding: spacing['space-4'],
          },
        ]}
      />
      <View style={{ flexDirection: 'row', gap: spacing['space-2'] }}>
        <View style={{ flex: 1 }}>
          <PushButton
            label={busy ? 'Saving…' : 'Save the date'}
            fullWidth
            disabled={!ok || busy || typed === (startsOn ?? '')}
            testID="team-programme-save"
            onPress={() => onSet(typed === '' ? null : typed)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PushButton
            label="Start today"
            variant="ghost"
            fullWidth
            disabled={busy}
            testID="team-programme-today"
            onPress={() => {
              const today = todayIso();
              setDraft(today);
              onSet(today);
            }}
          />
        </View>
      </View>
      {!ok && (
        <Text testID="team-programme-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
          That is not a date. Use YYYY-MM-DD.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
