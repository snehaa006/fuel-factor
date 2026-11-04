import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RATING_BANDS, URINE_SCALE } from '@/lib/check-in';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { useTheme } from '@/theme';

/**
 * The workbook's scales, on a link beside the control that uses them.
 *
 * Borrowed wholesale from the size guide every clothing shop puts next to a
 * dropdown: the table is one tap away, it opens over the form, and the form is
 * still there underneath when it closes. The alternative — printing four
 * bands and eight colours inline — buries the question being asked under the
 * key to answering it, on a phone, in a form that already runs to five
 * sections.
 *
 * **Every word in it is the programme's.** `RATING_BANDS` and `URINE_SCALE`
 * are transcriptions of the workbook's own RATING SCALE (1-10) and URINE
 * COLOUR SCALE (1-8) blocks. This component writes none of its own guidance
 * and adds no advice to either table; where the sheet gives a sentence, that
 * sentence is what shows.
 */

export type Scale = 'rating' | 'urine';

export const SCALE_TITLE: Record<Scale, string> = {
  rating: 'The 1–10 scale',
  urine: 'The hydration scale',
};

/** The link itself. Looks like a link, because that is what it has to read as. */
export function ScaleGuideLink({
  scale,
  onPress,
  testID,
}: {
  scale: Scale;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens the scale from your workbook"
      accessibilityLabel={`${SCALE_TITLE[scale]}, what the numbers mean`}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.link,
        { opacity: pressed ? 0.6 : 1, paddingVertical: spacing['space-1'] },
      ]}
    >
      <Text style={[typography['body-s'], styles.linkText, { color: colors['air-deep'] }]}>
        What do the numbers mean?
      </Text>
    </Pressable>
  );
}

export type ScaleGuideProps = {
  /** Which table to show. One scale at a time: this opens from one control. */
  scale: Scale | null;
  onClose: () => void;
  testID?: string;
};

export function ScaleGuide({ scale, onClose, testID = 'scale-guide' }: ScaleGuideProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const reduceMotion = useReduceMotion();

  if (scale === null) return null;

  const row = (left: string, right: string, detail?: string) => (
    <View
      key={left}
      style={[
        styles.row,
        { borderBottomColor: colors.hairline, paddingVertical: spacing['space-3'] },
      ]}
    >
      <Text style={[typography['heading-m'], styles.level, { color: colors.ink }]}>{left}</Text>
      <View style={styles.meaning}>
        <Text style={[typography['body-m'], { color: colors.ink }]}>{right}</Text>
        {detail !== undefined && (
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{detail}</Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible
      transparent
      // A sheet sliding up is exactly the movement the setting exists to stop.
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      testID={testID}
    >
      {/* `accessibilityViewIsModal` belongs on the view, not on Modal: passed
          to Modal it is spread onto the host element, which on web is a DOM
          node that does not know the prop. */}
      <View style={styles.host} accessibilityViewIsModal>
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.langit, opacity: 0.5 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close the scale"
          testID={`${testID}-scrim`}
        />

        <SafeAreaView style={styles.sheetSafe} edges={['bottom']} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors['surface-raised'],
                borderTopLeftRadius: radius['radius-lg'],
                borderTopRightRadius: radius['radius-lg'],
                padding: spacing['space-4'],
              },
            ]}
          >
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label, { color: colors['ink-muted'] }]}>
                  FROM YOUR WORKBOOK
                </Text>
                <Text
                  testID={`${testID}-title`}
                  style={[typography['heading-l'], { color: colors.ink }]}
                >
                  {SCALE_TITLE[scale]}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                testID={`${testID}-close`}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.close,
                  {
                    backgroundColor: pressed ? colors['surface-sunken'] : 'transparent',
                    borderRadius: radius['radius-md'],
                  },
                ]}
              >
                <Text style={[typography['heading-m'], { color: colors['ink-muted'] }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ marginTop: spacing['space-3'] }}
              contentContainerStyle={{ paddingBottom: spacing['space-4'] }}
            >
              {scale === 'rating'
                ? RATING_BANDS.map((band) =>
                    row(band.from === band.to ? `${band.from}` : `${band.from}–${band.to}`, band.meaning)
                  )
                : URINE_SCALE.map((level) =>
                    row(`${level.level}`, level.colour, level.meaning)
                  )}

              <Text
                style={[
                  typography['body-s'],
                  { color: colors['ink-faint'], marginTop: spacing['space-4'] },
                ]}
              >
                {scale === 'rating'
                  ? 'Pick the number that fits the day.'
                  : 'Match the colour on the chart, then tap its number.'}
              </Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start' },
  linkText: { textDecorationLine: 'underline' },
  // react-native 0.88 dropped `absoluteFillObject`; the four edges spelled out
  // are what it was.
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheetSafe: { width: '100%' },
  sheet: { width: '100%', maxHeight: '80%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 16, borderBottomWidth: 1 },
  level: { minWidth: 48 },
  meaning: { flex: 1, gap: 2 },
});
