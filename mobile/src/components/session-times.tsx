import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  displayTime,
  hasSession,
  withEnd,
  withStart,
  type Minutes,
  type TrainingSession,
} from '@/lib/session';
import { useTheme } from '@/theme';

export type SessionTimesProps = {
  value: TrainingSession;
  onChange: (next: TrainingSession) => void;
  /** The device's clock, so an unset time starts somewhere real. */
  now: Minutes;
  testID?: string;
};

/** Sessions are scheduled on the quarter hour, so that is the step. */
const STEP = 15;
const MINUTES_IN_DAY = 24 * 60;

function roundToStep(minutes: Minutes): Minutes {
  return Math.min(Math.round(minutes / STEP) * STEP, MINUTES_IN_DAY - STEP);
}

/**
 * When training is.
 *
 * App tier, and the only reason it exists: two of the programme's advice rules
 * are written against a session -- "2 to 3 hours before training", "refuel
 * within 30 minutes" -- and without a time they cannot fire at all. The app
 * supplies the clock and nothing else; the windows are the deck's.
 *
 * Nothing here judges the session. There is no "too late", no ideal hour and
 * no colour at any time, because the programme has said nothing about when an
 * athlete should train.
 */
export function SessionTimes({ value, onChange, now, testID }: SessionTimesProps) {
  const { colors, radius, spacing, typography } = useTheme();

  function row(
    label: string,
    key: 'startsAt' | 'endsAt',
    current: Minutes | null,
    apply: (next: Minutes | null) => TrainingSession
  ) {
    // An unset time opens at the current quarter hour rather than at some
    // invented default, so the first tap lands somewhere the athlete
    // recognises.
    const step = (delta: number) => {
      const base = current ?? roundToStep(now);
      const next = current === null ? base : base + delta * STEP;
      onChange(apply(Math.min(Math.max(next, 0), MINUTES_IN_DAY - STEP)));
    };

    const button = (delta: number, symbol: string, name: string) => (
      <Pressable
        onPress={() => step(delta)}
        accessibilityRole="button"
        accessibilityLabel={`${name} ${label}`}
        testID={testID ? `${testID}-${key}-${name}` : undefined}
        style={[
          styles.button,
          { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-pill'] },
        ]}
      >
        <Text style={[typography['heading-m'], { color: colors.ink }]}>{symbol}</Text>
      </Pressable>
    );

    return (
      <View style={[styles.row, { gap: spacing['space-3'] }]}>
        <Text style={[typography['body-m'], { color: colors.ink, flex: 1 }]}>{label}</Text>
        {button(-1, '−', 'earlier')}
        <Text
          testID={testID ? `${testID}-${key}` : undefined}
          accessibilityLabel={`${label}: ${current === null ? 'not set' : displayTime(current)}`}
          style={[
            typography['heading-m'],
            styles.value,
            { color: current === null ? colors['ink-faint'] : colors.ink },
          ]}
        >
          {displayTime(current)}
        </Text>
        {button(1, '+', 'later')}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>TRAINING SESSION</Text>
        {hasSession(value) && (
          <Pressable
            onPress={() => onChange({ startsAt: null, endsAt: null })}
            accessibilityRole="button"
            accessibilityLabel="Clear the training session"
            testID={testID ? `${testID}-clear` : undefined}
          >
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {row('Starts', 'startsAt', value.startsAt, (next) => withStart(value, next))}
      {row('Ends', 'endsAt', value.endsAt, (next) => withEnd(value, next))}

      {!hasSession(value) && (
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          Set this and the app can remind you when to eat before and after.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 72, textAlign: 'center' },
});
