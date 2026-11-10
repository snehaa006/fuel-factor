import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * One calendar, used everywhere a date is asked for.
 *
 * It started as the time machine's month grid, which was the only calendar in
 * the app while every date a *user* typed was a text box: the coach typed the
 * programme's start date as `YYYY-MM-DD` and so did a 14 year old naming the
 * day they ate. Both boxes then needed a validator, an error line and a
 * worked example of the format, and `isIsoDate` exists because
 * `2026-02-31` parses to the 3rd of March and would have moved the follow-up
 * recall by two days without saying so.
 *
 * A picker removes the class of error rather than catching it: there is no
 * format to get wrong, so there is nothing to validate and no error line to
 * write. The grid is the one the time machine already used, lifted out whole
 * so the two cannot drift apart.
 *
 * Dates are `YYYY-MM-DD` throughout and every calculation is in UTC, the same
 * way `clock.ts` and `recall-window.ts` do it: a local-time month grid lands
 * on the wrong day either side of midnight depending on the timezone.
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

/** "Tuesday 10 November 2026", for a field that has the room for it. */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    d.getUTCDay()
  ];
  return `${weekday} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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

export type CalendarSheetProps = {
  /** The date already chosen, drawn filled. Null when nothing is chosen yet. */
  value: string | null;
  /** Which month to open on when nothing is chosen. Usually today. */
  openAt: string;
  /** Ringed rather than filled: today, or the real today in the time machine. */
  highlight?: string | null;
  /** Nothing before this date can be picked. */
  min?: string | null;
  /** Nothing after this date can be picked. */
  max?: string | null;
  title?: string;
  hint?: string;
  /** A button under the grid, for "today" or "back to the real today". */
  footerLabel?: string;
  onFooter?: () => void;
  onPick: (date: string) => void;
  onClose: () => void;
  /** Prefixes every testID, so two calendars never collide. */
  testPrefix?: string;
};

/** The month grid, in a modal. */
export function CalendarSheet({
  value,
  openAt,
  highlight = null,
  min = null,
  max = null,
  title = 'PICK A DATE',
  hint,
  footerLabel,
  onFooter,
  onPick,
  onClose,
  testPrefix = 'calendar',
}: CalendarSheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const from = value ?? openAt;
  const [cursor, setCursor] = useState(() => ({
    year: Number(from.slice(0, 4)),
    month: Number(from.slice(5, 7)) - 1,
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
          testID={`${testPrefix}-sheet`}
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
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{title}</Text>
          {hint !== undefined && (
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{hint}</Text>
          )}

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => move(-1)}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              testID={`${testPrefix}-prev-month`}
              style={styles.step}
            >
              <Text style={[typography['heading-m'], { color: colors.ink }]}>‹</Text>
            </Pressable>
            <Text
              testID={`${testPrefix}-month`}
              style={[typography['heading-m'], { color: colors.ink }]}
            >
              {MONTHS[cursor.month]} {cursor.year}
            </Text>
            <Pressable
              onPress={() => move(1)}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              testID={`${testPrefix}-next-month`}
              style={styles.step}
            >
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
              const selected = date === value;
              const ringed = date === highlight && !selected;
              // A day outside the bounds is drawn faint and does nothing,
              // rather than being left out and breaking the grid's alignment.
              const blocked = (min !== null && date < min) || (max !== null && date > max);
              return (
                <Pressable
                  key={date}
                  onPress={blocked ? undefined : () => onPick(date)}
                  disabled={blocked}
                  accessibilityRole="button"
                  accessibilityLabel={`${longDate(date)}${ringed ? ', today' : ''}`}
                  accessibilityState={{ selected, disabled: blocked }}
                  testID={`${testPrefix}-day-${date}`}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayDot,
                      {
                        borderRadius: radius['radius-pill'],
                        backgroundColor: selected ? colors.pisang : 'transparent',
                        borderWidth: ringed ? 2 : 0,
                        borderColor: colors.ink,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography['body-m'],
                        {
                          color: blocked
                            ? colors['ink-faint']
                            : selected
                              ? colors['on-bright']
                              : colors.ink,
                        },
                      ]}
                    >
                      {Number(date.slice(8, 10))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {footerLabel !== undefined && onFooter !== undefined && (
            <Pressable
              onPress={onFooter}
              accessibilityRole="button"
              testID={`${testPrefix}-footer`}
              style={[
                styles.footer,
                { backgroundColor: colors['surface-raised'], borderRadius: radius['radius-lg'] },
              ]}
            >
              <Text style={[typography['body-m'], { color: colors.ink }]}>{footerLabel}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export type DateFieldProps = {
  /** The chosen date, or null while nothing is chosen. */
  value: string | null;
  onChange: (date: string | null) => void;
  /** What the field says while empty. */
  placeholder?: string;
  /** The month the calendar opens on when nothing is chosen yet. */
  openAt: string;
  /** Ringed in the grid. Pass today so "today" is findable. */
  today?: string | null;
  min?: string | null;
  max?: string | null;
  title?: string;
  hint?: string;
  /** Offers "today" under the grid, which is the answer most of the time. */
  todayShortcut?: boolean;
  /** Offers to empty the field. Off where the date is required. */
  clearable?: boolean;
  accessibilityLabel: string;
  testID?: string;
};

/**
 * A date, chosen from the calendar rather than typed.
 *
 * Looks like the text inputs it replaced -- same sunken fill, same radius,
 * same padding -- because it sits in the middle of forms made of them and a
 * control that announces itself as special invites a second look at a
 * question that does not need one.
 *
 * It reads back as "Tuesday 10 November 2026" rather than `2026-11-10`. The
 * stored value is still the ISO date; what changed is that nobody has to
 * think in it.
 */
export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  openAt,
  today = null,
  min = null,
  max = null,
  title,
  hint,
  todayShortcut = true,
  clearable = false,
  accessibilityLabel,
  testID = 'date-field',
}: DateFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [open, setOpen] = useState(false);

  const canPickToday =
    todayShortcut &&
    today !== null &&
    (min === null || today >= min) &&
    (max === null || today <= max);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value === null ? 'not set' : longDate(value) }}
        testID={testID}
        style={[
          styles.field,
          {
            backgroundColor: colors['surface-sunken'],
            borderRadius: radius['radius-lg'],
            padding: spacing['space-4'],
          },
        ]}
      >
        <Text
          testID={`${testID}-value`}
          style={[
            typography['body-l'],
            { color: value === null ? colors['ink-faint'] : colors.ink, flex: 1 },
          ]}
        >
          {value === null ? placeholder : longDate(value)}
        </Text>
        <Text style={[typography['body-l'], { color: colors['ink-muted'] }]}>📅</Text>
      </Pressable>

      {clearable && value !== null && (
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${accessibilityLabel}`}
          testID={`${testID}-clear`}
          hitSlop={8}
        >
          <Text style={[typography['body-s'], { color: colors['air-deep'] }]}>Clear the date</Text>
        </Pressable>
      )}

      {open && (
        <CalendarSheet
          value={value}
          openAt={openAt}
          highlight={today}
          min={min}
          max={max}
          title={title}
          hint={hint}
          footerLabel={canPickToday && today !== null ? `Today · ${shortDate(today)}` : undefined}
          onFooter={
            canPickToday && today !== null
              ? () => {
                  onChange(today);
                  setOpen(false);
                }
              : undefined
          }
          onPick={(date) => {
            onChange(date);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          testPrefix={testID}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { paddingHorizontal: 14, paddingVertical: 6, minWidth: 44, alignItems: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: 12, alignItems: 'center' },
});
