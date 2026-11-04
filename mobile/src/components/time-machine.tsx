import { useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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
 * In every build: there is one app.
 */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Tue 10 Nov", the way a date reads on a pill. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${SHORT_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/**
 * The cells of a month grid, Monday first, with nulls before the 1st so the
 * 1st falls under its weekday.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  }
  return cells;
}

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
          today={today}
          real={real}
          onPick={(date) => {
            go(date);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CalendarSheet({
  today,
  real,
  onPick,
  onClose,
}: {
  today: string;
  real: string;
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }));

  const move = (by: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + by, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });

  const cells = monthGrid(cursor.year, cursor.month);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close the calendar">
        {/* Taps inside the sheet stop here rather than closing it. */}
        <Pressable
          testID="time-machine-calendar"
          onPress={() => {}}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderRadius: radius['radius-xl'],
              padding: spacing['space-4'],
              gap: spacing['space-3'],
            },
          ]}
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>TIME MACHINE</Text>
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            Pick the day the app should treat as today. Meals, check-ins and recalls are saved to
            that day. For testing only.
          </Text>

          <View style={styles.monthRow}>
            <Pressable onPress={() => move(-1)} accessibilityLabel="Previous month" style={styles.step}>
              <Text style={[typography['heading-m'], { color: colors.ink }]}>‹</Text>
            </Pressable>
            <Text testID="time-machine-month" style={[typography['heading-m'], { color: colors.ink }]}>
              {MONTHS[cursor.month]} {cursor.year}
            </Text>
            <Pressable onPress={() => move(1)} accessibilityLabel="Next month" style={styles.step}>
              <Text style={[typography['heading-m'], { color: colors.ink }]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map((d, i) => (
              <View key={`h${i}`} style={styles.cell}>
                <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>{d}</Text>
              </View>
            ))}
            {cells.map((date, i) => {
              if (date === null) return <View key={`e${i}`} style={styles.cell} />;
              const selected = date === today;
              const isReal = date === real;
              return (
                <Pressable
                  key={date}
                  onPress={() => onPick(date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}${isReal ? ', the real today' : ''}`}
                  accessibilityState={{ selected }}
                  testID={`time-machine-day-${date}`}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayDot,
                      {
                        borderRadius: radius['radius-pill'],
                        backgroundColor: selected ? colors.pisang : 'transparent',
                        borderWidth: isReal && !selected ? 2 : 0,
                        borderColor: colors.ink,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography['body-m'],
                        { color: selected ? colors['on-bright'] : colors.ink },
                      ]}
                    >
                      {Number(date.slice(8, 10))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => onPick(real)}
            accessibilityRole="button"
            testID="time-machine-reset"
            style={[
              styles.reset,
              { backgroundColor: colors['surface-raised'], borderRadius: radius['radius-lg'] },
            ]}
          >
            <Text style={[typography['body-m'], { color: colors.ink }]}>
              Back to the real today · {shortDate(real)}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reset: { paddingVertical: 12, alignItems: 'center' },
});
