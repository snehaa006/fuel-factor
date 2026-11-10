import { useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { CalendarSheet, shortDate } from '@/components/calendar';
import { setSimulatedDate, shiftDate, useSimulatedDate } from '@/lib/clock';
import { todayIso } from '@/lib/today';
import { useTheme } from '@/theme';

/**
 * The time machine's controls, floating over every screen while testing.
 *
 * A pill at the bottom: step back a day, the date (tap for a month calendar),
 * step forward a day. Stepping is the fast path for logging a month in one
 * sitting -- log the day, tap ›, log the next. The calendar is for jumping to
 * a particular day, such as the day before the programme starts.
 *
 * While a date is simulated the pill turns `cabai` and says so, because
 * forgetting it is on means logging into the wrong day.
 *
 * The month grid is `components/calendar.tsx` now, shared with every field
 * that asks a user for a date. It was this component's own until the coach's
 * start date and the recall's "which day was it" stopped being text boxes.
 *
 * In every build: there is one app.
 */

export function TimeMachine() {
  return <TimeMachinePill />;
}

function TimeMachinePill() {
  const simulated = useSimulatedDate();
  // Read without the throwing hook: this floats over every screen, and a
  // missing provider should cost a few pixels of inset, not the app.
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const { colors, radius, spacing, typography } = useTheme();
  const [open, setOpen] = useState(false);

  const real = todayIso(new Date());
  const today = simulated ?? real;
  const travelling = simulated !== null && simulated !== real;

  const go = (date: string) => setSimulatedDate(date === real ? null : date);

  const fill = travelling ? colors.cabai : colors['surface-raised'];
  const ink = travelling ? colors['on-bright'] : colors.ink;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.dock, { bottom: bottomInset + spacing['space-3'] }]}
      >
        <View
          testID="time-machine"
          style={[
            styles.pill,
            {
              backgroundColor: fill,
              borderRadius: radius['radius-pill'],
              borderColor: colors.hairline,
            },
          ]}
        >
          <Pressable
            onPress={() => go(shiftDate(today, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            testID="time-machine-back"
            style={styles.step}
          >
            <Text style={[typography['heading-m'], { color: ink }]}>‹</Text>
          </Pressable>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Time machine. Today is ${shortDate(today)}. Choose a date`}
            testID="time-machine-open"
            style={styles.middle}
          >
            <Text style={[typography.label, { color: ink }]}>
              {travelling ? 'TIME MACHINE' : 'REAL DATE'}
            </Text>
            <Text testID="time-machine-date" style={[typography['body-s'], { color: ink }]}>
              {shortDate(today)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => go(shiftDate(today, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            testID="time-machine-forward"
            style={styles.step}
          >
            <Text style={[typography['heading-m'], { color: ink }]}>›</Text>
          </Pressable>
        </View>
      </View>

      {open && (
        <CalendarSheet
          value={today}
          openAt={today}
          highlight={real}
          title="TIME MACHINE"
          hint="Pick the day the app treats as today."
          footerLabel={`Back to the real today · ${shortDate(real)}`}
          onFooter={() => {
            go(real);
            setOpen(false);
          }}
          onPick={(date) => {
            go(date);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          testPrefix="time-machine"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  step: { paddingHorizontal: 14, paddingVertical: 6, minWidth: 44, alignItems: 'center' },
  middle: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, minWidth: 110 },
});
