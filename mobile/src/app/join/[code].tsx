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

import { CheckBox } from '@/components/check-box';
import { Mascot } from '@/components/mascot';
import { PushButton } from '@/components/push-button';

import {
  CONSENT_CHECKBOX,
  CONSENT_FORM_NOTE,
  CONSENT_FORM_QUESTION,
  CONSENT_HEADING,
  CONSENT_WHAT_IT_IS,
  CONSENT_WHAT_IT_IS_NOT,
} from '@/lib/consent';
import { messageOf } from '@/lib/errors';
import { normaliseCode } from '@/lib/invite';
import { useAccount } from '@/lib/use-account';
import {
  AGE_BANDS,
  EMPTY_QUESTIONNAIRE,
  joinTeam,
  MEASUREMENTS,
  parseMeasurement,
  problemsWith,
  teamByCode,
  type MeasurementField,
  type Questionnaire,
} from '@/lib/join';
import { WELCOME_CUE } from '@/lib/mascot-copy';
import { useTheme } from '@/theme';

type Step = 'consent' | 'about-you';

/**
 * The invite link's landing screen.
 *
 * A coach creates a team and sends a link; this is where it lands. Consent
 * first and always, the same words the roster gate shows, because decision 8
 * of the brief makes it blocking on every route in and `join_team` refuses
 * without it.
 *
 * **Asked once per athlete, not once per screen.** There are two ways here and
 * only one of them starts here. An athlete who came through `/welcome` has
 * already read this text and ticked the box -- the roster gate shows it before
 * it will even take a team code -- so being asked again on the next screen was
 * the same question twice in one sitting, which teaches a 14 year old that the
 * tick is paperwork. `/welcome` therefore sends its tick along and this screen
 * opens on the questionnaire. An invite link opened cold has passed no gate,
 * so it still gets one; `join_team` refuses a false answer either way, so the
 * skip can never widen into a route in without consent.
 *
 * Then the questionnaire. Every question is a column of the PARTICIPANTS
 * sheet, which is what the dietitian described: "if a participant gets into
 * the app, he'll have to fill in his height, weight, and certain parameters."
 * Only the name is required -- a 14 year old guessing at their calf
 * circumference is worse data than a blank, and the research team measures
 * these properly.
 *
 * An athlete already on the squad's roster goes the other way, to `/welcome`,
 * where they claim the row the research team already typed. That path keeps
 * the three seeded footballers' measured heights and weights intact instead of
 * overwriting them with a self-report.
 */
export default function Join() {
  const router = useRouter();
  // `consented` is set by `/welcome`, which has already shown this exact
  // text and taken the tick two steps earlier. An invite link opened cold
  // arrives without it and gets the gate, because for that athlete this
  // screen is the start.
  const { code, consented: carried } = useLocalSearchParams<{
    code: string;
    consented?: string;
  }>();
  const { colors, radius, spacing, typography } = useTheme();

  const joinCode = normaliseCode(code ?? '');
  const alreadyConsented = carried === '1';

  const [step, setStep] = useState<Step>(alreadyConsented ? 'about-you' : 'consent');
  const [consented, setConsented] = useState(alreadyConsented);
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
    if (!signedIn) return;
    let active = true;

    async function start() {
      try {
        const team = await teamByCode(joinCode);
        if (!active) return;
        if (team === null) {
          setError('No team with that code. Ask your coach to send the link again.');
          return;
        }
        setTeamName(team.name);
      } catch (e) {
        if (active) setError(messageOf(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    start();
    return () => {
      active = false;
    };
  }, [joinCode, signedIn]);

  function setMeasurement(field: MeasurementField, text: string) {
    setMeasurementText((current) => ({ ...current, [field]: text }));
    setForm((current) => ({
      ...current,
      measurements: { ...current.measurements, [field]: parseMeasurement(text) },
    }));
  }

  async function submit() {
    const problems = problemsWith(form);
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
      setError(messageOf(e));
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

        {step === 'consent' && (
          <View style={{ gap: spacing['space-4'] }}>
            <View style={{ alignItems: 'center' }}>
              <Mascot
                pose={WELCOME_CUE.pose}
                size={176}
                motion={WELCOME_CUE.motion}
                testID="join-mascot"
              />
            </View>
            {heading(CONSENT_HEADING)}
            {teamName !== null && (
              <Text testID="join-team-name" style={[typography['heading-m'], { color: colors['pisang-deep'] }]}>
                You have been invited to {teamName}.
              </Text>
            )}
            <Text style={[typography['body-l'], { color: colors.ink }]}>{CONSENT_WHAT_IT_IS}</Text>
            <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              {CONSENT_WHAT_IT_IS_NOT}
            </Text>

            <CheckBox
              label={CONSENT_CHECKBOX}
              checked={consented}
              onChange={setConsented}
              testID="join-consent"
            />

            <PushButton
              label="Continue"
              fullWidth
              disabled={!consented || teamName === null}
              testID="join-continue"
              onPress={() => setStep('about-you')}
            />

            {/* The other route in, said plainly rather than left to be
                guessed at by somebody whose coach already added them. */}
            <Pressable
              onPress={() => router.replace(`/welcome?code=${joinCode}`)}
              accessibilityRole="button"
              testID="join-already-listed"
            >
              <Text
                style={[
                  typography['body-s'],
                  { color: colors['air-deep'], textAlign: 'center' },
                ]}
              >
                Already on the squad list? →
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'about-you' && (
          <View style={{ gap: spacing['space-6'] }}>
            {heading('About you')}
            {/* Which squad, said on whichever step is the first one shown:
                skipping the consent step must not skip the confirmation. */}
            {alreadyConsented && teamName !== null && (
              <Text
                testID="join-team-name"
                style={[typography['heading-m'], { color: colors['pisang-deep'] }]}
              >
                You have been invited to {teamName}.
              </Text>
            )}
            <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              Only your name is required. Leave anything you don&apos;t know blank.
            </Text>

            <View style={{ gap: spacing['space-2'] }}>
              {label('Name')}
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((c) => ({ ...c, name }))}
                placeholder="Your name"
                placeholderTextColor={colors['ink-faint']}
                accessibilityLabel="Name"
                testID="join-name"
                style={inputStyle}
              />
            </View>

            <View style={{ gap: spacing['space-2'] }}>
              {label('Sport')}
              <TextInput
                value={form.sport}
                onChangeText={(sport) => setForm((c) => ({ ...c, sport }))}
                placeholder="Football"
                placeholderTextColor={colors['ink-faint']}
                accessibilityLabel="Sport"
                testID="join-sport"
                style={inputStyle}
              />
            </View>

            <View style={{ gap: spacing['space-2'] }}>
              {label('Age')}
              <View style={styles.bands}>
                {AGE_BANDS.map((band) => {
                  const selected = form.ageBand === band;
                  return (
                    <Pressable
                      key={band}
                      onPress={() => setForm((c) => ({ ...c, ageBand: selected ? null : band }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Age ${band}`}
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
                        {band}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: spacing['space-3'] }}>
              {label('Measurements — all optional')}
              {MEASUREMENTS.map((m) => (
                <View key={m.field} style={{ gap: spacing['space-1'] }}>
                  <Text style={[typography['body-m'], { color: colors.ink }]}>
                    {m.label} ({m.unit})
                  </Text>
                  {m.hint !== undefined && (
                    <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                      {m.hint}
                    </Text>
                  )}
                  <TextInput
                    value={measurementText[m.field] ?? ''}
                    onChangeText={(text) => setMeasurement(m.field, text)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors['ink-faint']}
                    accessibilityLabel={`${m.label} in ${m.unit}`}
                    testID={`join-${m.field}`}
                    style={inputStyle}
                  />
                </View>
              ))}
            </View>

            <CheckBox
              label={CONSENT_FORM_QUESTION}
              note={CONSENT_FORM_NOTE}
              checked={form.consentSigned}
              onChange={(consentSigned) => setForm((c) => ({ ...c, consentSigned }))}
              testID="join-consent-form"
            />

            <View style={{ gap: spacing['space-2'] }}>
              {label('Parent or guardian contact')}
              <TextInput
                value={form.parentContact}
                onChangeText={(parentContact) => setForm((c) => ({ ...c, parentContact }))}
                placeholder="Optional"
                placeholderTextColor={colors['ink-faint']}
                autoCapitalize="none"
                accessibilityLabel="Parent or guardian contact"
                testID="join-parent-contact"
                style={inputStyle}
              />
            </View>

            <View style={{ gap: spacing['space-2'] }}>
              {label('Anything else')}
              <TextInput
                value={form.notes}
                onChangeText={(notes) => setForm((c) => ({ ...c, notes }))}
                placeholder="Optional"
                placeholderTextColor={colors['ink-faint']}
                multiline
                accessibilityLabel="Anything else"
                testID="join-notes"
                style={[...inputStyle, styles.multiline]}
              />
            </View>

            <PushButton
              label={busy ? 'Joining…' : `Join ${teamName ?? 'the team'}`}
              fullWidth
              disabled={busy || form.name.trim() === ''}
              testID="join-submit"
              onPress={() => {
                submit().catch((e: unknown) => setError(messageOf(e)));
              }}
            />
          </View>
        )}

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
