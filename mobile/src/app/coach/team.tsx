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

import { DateField, longDate } from '@/components/calendar';
import { PushButton } from '@/components/push-button';
import { copyText } from '@/lib/clipboard';
import { messageOf } from '@/lib/errors';
import { inviteMessage, inviteUrl } from '@/lib/invite';
import { isIsoDate, PROGRAMME_WEEKS } from '@/lib/recall-window';
import { todayIso } from '@/lib/today';
import { useCoachTeam } from '@/lib/use-coach-team';
import { useStrings } from '@/i18n';
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
  const t = useStrings();
  const state = useCoachTeam();

  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  // Which thing was just copied, so the button can say so. 'failed' is a real
  // answer: the clipboard is refusable and a silent no-op is worse.
  const [copied, setCopied] = useState<'code' | 'message' | 'failed' | null>(null);

  function copy(what: 'code' | 'message', text: string) {
    copyText(text)
      .then((ok) => setCopied(ok ? what : 'failed'))
      .catch(() => setCopied('failed'));
  }

  const back = (
    <Pressable onPress={() => router.back()} accessibilityRole="button" testID="team-back">
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
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
        <Text style={[typography['display-l'], { color: colors.ink }]}>{t.coach.yourSquad}</Text>
        <PushButton
          label={t.coach.coachSignIn}
          fullWidth
          testID="team-sign-in"
          onPress={() => router.push('/coach/account')}
        />
      </View>
    );
  }

  if (state.status === 'no-team') {
    const dateTyped = startsOn.trim();
    const dateOk = isIsoDate(dateTyped);

    return frame(
      <View style={{ marginTop: spacing['space-2'], gap: spacing['space-4'] }}>
        <Text style={[typography['display-l'], { color: colors.ink }]}>{t.coach.createTeam}</Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          {t.coach.signedInAs(state.email ?? '')}
        </Text>

        <View style={{ gap: spacing['space-2'] }}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.coach.teamNameCaps}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.coach.teamNamePlaceholder}
            placeholderTextColor={colors['ink-faint']}
            accessibilityLabel={t.coach.teamNameLabel}
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
            {t.coach.firstDayCaps}
          </Text>
          {/* A calendar, not a typed date: this is the one field the whole
              app counts from, and a typo in it moved the follow-up recall. */}
          <DateField
            value={startsOn === '' ? null : startsOn}
            onChange={(date) => setStartsOn(date ?? '')}
            placeholder={t.coach.firstDayPlaceholder}
            openAt={todayIso()}
            today={todayIso()}
            title={t.coach.firstDayCaps}
            hint={t.coach.firstDayHint}
            accessibilityLabel={t.coach.firstDayLabel}
            testID="team-start"
          />
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {/* Asked once, and not optional, because the whole app is counted
                from it: the follow-up recall, and the day logging opens. */}
            {t.coach.untilThisDay(PROGRAMME_WEEKS)}
          </Text>
        </View>

        {state.actionError !== null && (
          <Text testID="team-create-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
            {state.actionError}
          </Text>
        )}

        <PushButton
          label={state.busy ? t.coach.creating : t.coach.createTheTeam}
          fullWidth
          disabled={name.trim() === '' || !dateOk || state.busy}
          testID="team-create"
          onPress={() => {
            state.create(name, dateTyped).catch(() => {
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
          {t.coach.teamCount(team.athletes, state.email)}
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
          {t.coach.teamCodeShare}
        </Text>
        <Text
          selectable
          testID="team-join-code"
          style={[typography['stat-hero'], { color: colors.ink }]}
        >
          {team.joinCode}
        </Text>
        <Text selectable style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {inviteUrl(team.joinCode)}
        </Text>

        {/* The paste half of handing out a code. "Send the invite" opens the
            share sheet, which is the better route when a coach has not
            already got WhatsApp open; this is for when they have. */}
        <View style={{ flexDirection: 'row', gap: spacing['space-2'] }}>
          <View style={{ flex: 1 }}>
            <PushButton
              label={copied === 'code' ? t.coach.copied : t.coach.copyCode}
              variant={copied === 'code' ? 'success' : 'ghost'}
              fullWidth
              testID="team-copy-code"
              onPress={() => copy('code', team.joinCode)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PushButton
              label={copied === 'message' ? t.coach.copied : t.coach.copyMessage}
              variant={copied === 'message' ? 'success' : 'ghost'}
              fullWidth
              testID="team-copy-message"
              onPress={() => copy('message', inviteMessage(team.name, team.joinCode, t))}
            />
          </View>
        </View>
        {copied === 'failed' && (
          <Text testID="team-copy-failed" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            {/* Said rather than faked: the code is selectable text above. */}
            {t.coach.noClipboard}
          </Text>
        )}

        <View style={{ marginTop: spacing['space-2'] }}>
          <PushButton
            label={t.coach.sendInvite}
            fullWidth
            testID="team-share"
            onPress={() => {
              // Share rejects when the sheet is dismissed on some platforms,
              // and an async onPress that swallows its rejection is a button
              // that silently does nothing.
              Share.share({ message: inviteMessage(team.name, team.joinCode, t) }).catch(
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
          {t.coach.linkOpens}
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
          {t.coach.coachCodeCaps}
        </Text>
        <Text testID="team-coach-code" style={[typography['heading-l'], { color: colors.ink }]}>
          {team.coachCode}
        </Text>
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          {t.coach.coachCodeNote}
        </Text>
      </View>

      <ProgrammeStart
        startsOn={team.programmeStartsOn}
        busy={state.busy}
        onSet={(date) => {
          state.setStart(date).catch(() => {
            // Reported through actionError by the hook.
          });
        }}
      />

      {state.actionError !== null && (
        <Text testID="team-action-error" style={[typography['body-s'], { color: colors['cabai-deep'] }]}>
          {state.actionError}
        </Text>
      )}

      <PushButton
        label={t.coach.openDashboard}
        variant="ghost"
        fullWidth
        testID="team-dashboard"
        onPress={() => router.push('/coach')}
      />
    </View>
  );
}

/**
 * Day one of the four weeks: set it, or move it.
 *
 * Clearing it is gone, and the database refuses it too. A squad mid-programme
 * whose start date vanished would be locked straight back out of logging,
 * with no screen anywhere able to put it back except this one.
 *
 * `startsOn` is still nullable because teams created before the date was
 * required exist and the app will not invent one for them. Those read as not
 * set, and their athletes see the baseline recall and nothing else until a
 * coach fills this in.
 */
function ProgrammeStart({
  startsOn,
  busy,
  onSet,
}: {
  startsOn: string | null;
  busy: boolean;
  onSet: (date: string) => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const t = useStrings();
  const [draft, setDraft] = useState(startsOn ?? '');
  const typed = draft.trim();
  const ok = isIsoDate(typed);

  return (
    <View style={{ gap: spacing['space-2'] }}>
      <Text style={[typography['heading-l'], { color: colors.ink }]}>{t.coach.fourWeeks}</Text>
      <Text testID="team-programme" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
        {startsOn === null
          ? t.coach.notSetYet
          : t.coach.dayOne(longDate(startsOn, t), PROGRAMME_WEEKS)}
      </Text>
      <DateField
        value={draft === '' ? null : draft}
        onChange={(date) => setDraft(date ?? '')}
        placeholder={t.coach.firstDayPlaceholder}
        openAt={startsOn ?? todayIso()}
        today={todayIso()}
        title={t.coach.firstDayCaps}
        accessibilityLabel={t.coach.firstDayLabel}
        testID="team-programme-input"
      />
      <View style={{ flexDirection: 'row', gap: spacing['space-2'] }}>
        <View style={{ flex: 1 }}>
          <PushButton
            label={busy ? t.common.saving : startsOn === null ? t.coach.setDate : t.coach.moveDate}
            fullWidth
            disabled={!ok || busy || typed === (startsOn ?? '')}
            testID="team-programme-save"
            onPress={() => onSet(typed)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PushButton
            label={t.coach.startToday}
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
