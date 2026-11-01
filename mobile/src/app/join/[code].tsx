import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { DEMO_COACH_TEAM } from '@/lib/__fixtures__/today';
import { signIn } from '@/lib/auth';
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

/**
 * Development flag, as everywhere else in this app. Anonymous sign-ins are
 * still switched off on this project, so without it this screen can only ever
 * show its own spinner and the invite flow cannot be demonstrated at all.
 */
const USE_FIXTURE = process.env.EXPO_PUBLIC_DEMO_DATA === '1';

type Step = 'consent' | 'about-you';

/**
 * The invite link's landing screen.
 *
 * A coach creates a team and sends a link; this is where it lands. Consent
 * first and always, the same words the roster gate shows, because decision 8
 * of the brief makes it blocking on every route in and `join_team` refuses
 * without it.
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
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors, radius, spacing, typography } = useTheme();

  const joinCode = normaliseCode(code ?? '');

  const [step, setStep] = useState<Step>('consent');
  const [consented, setConsented] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(
    USE_FIXTURE ? DEMO_COACH_TEAM.name : null
  );
  const [form, setForm] = useState<Questionnaire>(EMPTY_QUESTIONNAIRE);
  const [measurementText, setMeasurementText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!USE_FIXTURE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInBlocked, setSignInBlocked] = useState(false);

  // A session has to exist before the code can be resolved: `team_by_code` is
  // granted to `authenticated` and nothing else, which is what stops a
  // stranger probing codes against a roster of named minors.
  useEffect(() => {
    if (USE_FIXTURE) return;
    let active = true;

    async function start() {
      try {
        const userId = await signIn();
        if (!active) return;
        if (userId === null) {
          setSignInBlocked(true);
          return;
        }
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
  }, [joinCode]);

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
      if (!USE_FIXTURE) await joinTeam(joinCode, form, consented);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-6'] }]}>
        {signInBlocked && (
          <View
            testID="join-sign-in-blocked"
            style={{
              backgroundColor: colors['cabai-tint'],
              borderRadius: radius['radius-lg'],
              padding: spacing['space-4'],
              gap: 2,
            }}
          >
            <Text style={[typography.label, { color: colors['cabai-deep'] }]}>
              SIGN-IN UNAVAILABLE
            </Text>
            <Text style={[typography['body-s'], { color: colors.ink, marginTop: 4 }]}>
              Anonymous sign-ins are switched off for this project. Turn them on in Supabase under
              Authentication → Sign In / Providers.
            </Text>
          </View>
        )}

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
              disabled={!consented || signInBlocked || teamName === null}
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
                My coach says I am already on the squad list →
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'about-you' && (
          <View style={{ gap: spacing['space-6'] }}>
            {heading('About you')}
            <Text style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              These are the programme&apos;s own questions. Only your name is needed — leave
              anything you do not know blank and your coach will measure it.
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
              {/* No target, no band and no comment on any of these figures.
                  The programme has set none, and a weight on a screen next to
                  a judgement is the one thing this app must never be. */}
              <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
                Nothing here is scored or compared with anybody else.
              </Text>
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
