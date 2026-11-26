import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { LanguageSwitch } from '@/components/preference-switches';
import { PushButton } from '@/components/push-button';
import { useStrings } from '@/i18n';
import { localised, messageOf } from '@/lib/errors';
import { normaliseCode } from '@/lib/invite';
import { useAccount } from '@/lib/use-account';
import {
  AGE_BANDS,
  EMPTY_QUESTIONNAIRE,
  joinTeam,
  MEASUREMENTS,
  measurementCopy,
  parseMeasurement,
  problemsWith,
  teamByCode,
  type MeasurementField,
  type Questionnaire,
} from '@/lib/join';
import { useTheme } from '@/theme';

/**
 * The squad's questionnaire: an athlete the research team has not typed in yet.
 *
 * **No checkbox of any kind lives here.** Consent is taken once, at the start,
 * on `/welcome` -- the "Before you start" screen every athlete passes before
 * the app will take a team code. This screen used to show that same text and
 * tick a second time, then ask a second consent question about the paper form
 * on top of it, so one sitting asked a 14 year old to tick "consent" twice.
 * Feedback from the people running the programme: it is a duplicate, remove it.
 *
 * So there are two ways in, and both have already passed the gate:
 *
 * - From `/welcome`, which sends `consented=1` along with the code.
 * - From an invite link. That one has passed no gate, so it is sent to
 *   `/welcome` with its code, takes the tick there, and comes straight back
 *   here without retyping anything.
 *
 * `join_team` still takes consent as an argument and refuses a false one, so
 * the gate is enforced in the database whichever way somebody arrives.
 *
 * The paper form (`consent_signed` on the PARTICIPANTS sheet) is no longer
 * asked of the athlete at all. It is a fact about a piece of paper, which the
 * research team records in its tracker; a 14 year old's guess about it was
 * never better data than the team's own record. It defaults to false, which
 * reads "not recorded as signed" on the profile -- the truth.
 *
 * Every question left is a column of the PARTICIPANTS sheet, which is what
 * the dietitian described: "if a participant gets into the app, he'll have to
 * fill in his height, weight, and certain parameters." Only the name is
 * required -- a 14 year old guessing at their calf circumference is worse data
 * than a blank, and the research team measures these properly.
 */
export default function Join() {
  const router = useRouter();
  // `consented` is set by `/welcome`, the one consent gate, which has shown
  // the text and taken the tick before sending anybody here.
  const { code, consented: carried } = useLocalSearchParams<{
    code: string;
    consented?: string;
  }>();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();

  const joinCode = normaliseCode(code ?? '');
  const consented = carried === '1';

  const [teamName, setTeamName] = useState<string | null>(
    null
  );
  const [form, setForm] = useState<Questionnaire>(EMPTY_QUESTIONNAIRE);
  const [measurementText, setMeasurementText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useAccount();

  // A session has to exist before the code can be resolved: `team_by_code` is
  // granted to `authenticated` and nothing else, which is what stops a
  // stranger probing codes against a roster of named minors. The session is
  // an account now rather than an anonymous device, so an invite link opened
  // by somebody with no account goes to the door first and comes back here
  // with the code intact -- see the redirect below.
  const signedIn = account.status === 'ready' && account.account.role !== 'signed-out';

  useEffect(() => {
    // Nothing is asked of the database for a visitor about to be sent to the
    // gate: they come back with the tick and this runs then.
    if (!signedIn || !consented) return;
    let active = true;

    async function start() {
      try {
        const team = await teamByCode(joinCode);
        if (!active) return;
        if (team === null) {
          setError(t.join.noTeam);
          return;
        }
        setTeamName(team.name);
      } catch (e) {
        if (active) setError(localised(messageOf(e), t));
      } finally {
        if (active) setLoading(false);
      }
    }

    start();
    return () => {
      active = false;
    };
  }, [joinCode, signedIn, consented, t]);

  function setMeasurement(field: MeasurementField, text: string) {
    setMeasurementText((current) => ({ ...current, [field]: text }));
    setForm((current) => ({
      ...current,
      measurements: { ...current.measurements, [field]: parseMeasurement(text) },
    }));
  }

  async function submit() {
    const problems = problemsWith(form, t);
    if (problems.length > 0) {
      setError(problems.join(' '));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await joinTeam(joinCode, form, consented);
      router.replace('/');
    } catch (e) {
      setError(localised(messageOf(e), t));
    } finally {
      setBusy(false);
    }
  }

  const heading = (text: string) => (
    <Text style={[typography['display-l'], { color: colors.ink }]}>{text}</Text>
  );

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

  // An invite link opened by somebody with no account. The code travels with
  // them, so they come back here after signing in rather than being dropped
  // at a team-code box with a link they have already used.
  if (account.status === 'ready' && account.account.role === 'signed-out') {
    return <Redirect href={{ pathname: '/sign-in', params: { joinCode } }} />;
  }

  // An invite link opened by somebody who has not been through the gate.
  // Consent is asked in one place, at the start, so they go there with the
  // code and `/welcome` brings them back here once it is ticked.
  if (account.status === 'ready' && !consented) {
    return <Redirect href={{ pathname: '/welcome', params: { code: joinCode } }} />;
  }

  if (loading || !signedIn) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-6'] }]}>
        <LanguageSwitch compact testID="join-language" />
        <View style={{ gap: spacing['space-6'] }}>
          {heading(t.join.heading)}
          {/* Which squad they are joining, said before anything is asked. */}
          {teamName !== null && (
            <Text
              testID="join-team-name"
              style={[typography['heading-m'], { color: colors['pisang-deep'] }]}
            >
              {t.join.invitedTo(teamName)}
            </Text>
          )}
          <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
            {t.join.onlyName}
          </Text>

          <View style={{ gap: spacing['space-2'] }}>
            {label(t.join.name)}
            <TextInput
              value={form.name}
              onChangeText={(name) => setForm((c) => ({ ...c, name }))}
              placeholder={t.join.namePlaceholder}
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel={t.join.name}
              testID="join-name"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: spacing['space-2'] }}>
            {label(t.join.sport)}
            <TextInput
              value={form.sport}
              onChangeText={(sport) => setForm((c) => ({ ...c, sport }))}
              placeholder={t.join.sportPlaceholder}
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel={t.join.sport}
              testID="join-sport"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: spacing['space-2'] }}>
            {label(t.join.age)}
            <View style={styles.bands}>
              {AGE_BANDS.map((band) => {
                const selected = form.ageBand === band;
                return (
                  <Pressable
                    key={band}
                    onPress={() => setForm((c) => ({ ...c, ageBand: selected ? null : band }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t.join.ageLabel(t.ageBands[band] ?? band)}
                    testID={`join-age-${band}`}
                    style={{
                      backgroundColor: selected ? colors.pisang : colors['surface-sunken'],
                      borderRadius: radius['radius-pill'],
                      paddingVertical: spacing['space-2'],
                      paddingHorizontal: spacing['space-4'],
                    }}
                  >
                    <Text
                      style={[
                        typography['body-s'],
                        { color: selected ? colors['on-bright'] : colors['ink-muted'] },
                      ]}
                    >
                      {t.ageBands[band] ?? band}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: spacing['space-3'] }}>
            {label(t.join.measurements)}
            {MEASUREMENTS.map((m) => {
              const text = measurementCopy(m.field, t);
              return (
              <View key={m.field} style={{ gap: spacing['space-1'] }}>
                <Text style={[typography['body-m'], { color: colors.ink }]}>
                  {text.label} ({m.unit})
                </Text>
                {text.hint !== undefined && (
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                    {text.hint}
                  </Text>
                )}
                <TextInput
                  value={measurementText[m.field] ?? ''}
                  onChangeText={(text) => setMeasurement(m.field, text)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors['ink-faint']}
                  accessibilityLabel={t.join.measurementLabel(text.label, m.unit)}
                  testID={`join-${m.field}`}
                  style={inputStyle}
                />
              </View>
              );
            })}
          </View>

          <View style={{ gap: spacing['space-2'] }}>
            {label(t.join.parentContact)}
            <TextInput
              value={form.parentContact}
              onChangeText={(parentContact) => setForm((c) => ({ ...c, parentContact }))}
              placeholder={t.common.optional}
              placeholderTextColor={colors['ink-faint']}
              autoCapitalize="none"
              accessibilityLabel={t.join.parentContact}
              testID="join-parent-contact"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: spacing['space-2'] }}>
            {label(t.join.anythingElse)}
            <TextInput
              value={form.notes}
              onChangeText={(notes) => setForm((c) => ({ ...c, notes }))}
              placeholder={t.common.optional}
              placeholderTextColor={colors['ink-faint']}
              multiline
              accessibilityLabel={t.join.anythingElse}
              testID="join-notes"
              style={[...inputStyle, styles.multiline]}
            />
          </View>

          <PushButton
            label={busy ? t.join.joining : t.join.join(teamName)}
            fullWidth
            disabled={busy || form.name.trim() === ''}
            testID="join-submit"
            onPress={() => {
              submit().catch((e: unknown) => setError(localised(messageOf(e), t)));
            }}
          />
        </View>

        {error !== null && (
          <Text
            testID="join-error"
            style={[
              typography['body-m'],
              { color: colors['cabai-deep'], marginTop: spacing['space-4'] },
            ]}
          >
            {error}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48, gap: 24 },
  bands: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
