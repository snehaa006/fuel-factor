import { StyleSheet, Text, TextInput, View } from 'react-native';

import { DayTypeSwitch } from '@/components/day-type-switch';
import { RatingScale } from '@/components/rating-scale';
import { ScaleGuideLink, type Scale } from '@/components/scale-guide';
import { UrineScale } from '@/components/urine-scale';
import {
  parseText,
  RECALL_LIMITS,
  RECALL_MEALS,
  RECALL_RATINGS,
  type RecallDraft,
  type RecallEntry,
} from '@/lib/recall';
import { todayIso } from '@/lib/today';
import { useTheme } from '@/theme';

/**
 * One recall day's questions.
 *
 * Every field is a column of the RECALL sheet and this carries all of them
 * bar `est_calories`, which the app computes rather than asks for: "the
 * calories is estimated and calculated based on our composition data that we
 * have ... This will be backend. This is not manual calculation."
 *
 * Lifted out of `recall/[day].tsx` unchanged when the three-days-in-one-go
 * screen arrived. Two screens asking the same instrument two slightly
 * different ways is how a research form quietly starts collecting two
 * different things, so there is one copy of the questions and both screens
 * mount it.
 *
 * Nothing here judges an answer. No target sits beside the fluid box, no
 * adjective beside a rating, and no food is called good or bad. The two scale
 * links open the workbook's own tables and add nothing to them.
 */

export type RecallFieldsProps = {
  draft: RecallDraft;
  onChange: (draft: RecallDraft) => void;
  /** Opens the workbook's table for that scale. */
  onShowGuide: (scale: Scale) => void;
  /** Prefixes every testID, so three days on one screen do not collide. */
  testPrefix?: string;
};

export function RecallFields({
  draft,
  onChange,
  onShowGuide,
  testPrefix = 'recall',
}: RecallFieldsProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const set = <K extends keyof RecallEntry>(key: K, value: RecallEntry[K]) =>
    onChange({ ...draft, entry: { ...draft.entry, [key]: value } });

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

  const section = (title: string, children: React.ReactNode, aside?: React.ReactNode) => (
    <View style={{ gap: spacing['space-3'] }}>
      <View style={styles.sectionHead}>
        <Text style={[typography['heading-l'], { color: colors.ink }]}>{title}</Text>
        {aside}
      </View>
      {children}
    </View>
  );

  return (
    <View style={{ gap: spacing['space-8'] }}>
      {section(
        'The day',
        <>
          <View style={{ gap: spacing['space-2'] }}>
            {label('Which day was it')}
            <TextInput
              value={draft.dateText}
              onChangeText={(text) => onChange({ ...draft, dateText: text })}
              placeholder={todayIso()}
              placeholderTextColor={colors['ink-faint']}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Which day was it, as a date"
              testID={`${testPrefix}-date`}
              style={inputStyle}
            />
          </View>
          <DayTypeSwitch
            value={draft.entry.day_type}
            onChange={(value) => set('day_type', value)}
            testID={`${testPrefix}-day-type`}
          />
          <View style={{ gap: spacing['space-2'] }}>
            {label(`Sleep, in hours (0–${RECALL_LIMITS.sleep_hours.max})`)}
            <TextInput
              value={draft.sleepText}
              onChangeText={(text) => onChange({ ...draft, sleepText: text })}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel="Sleep in hours"
              testID={`${testPrefix}-sleep`}
              style={inputStyle}
            />
          </View>
        </>
      )}

      {section(
        'What you ate',
        <>
          {RECALL_MEALS.map((meal) => (
            <View key={meal.field} style={{ gap: spacing['space-2'] }}>
              {label(meal.label)}
              <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                {meal.hint}
              </Text>
              <TextInput
                value={draft.entry[meal.field] ?? ''}
                onChangeText={(text) => set(meal.field, parseText(text))}
                multiline
                placeholder="—"
                placeholderTextColor={colors['ink-faint']}
                accessibilityLabel={meal.label}
                testID={`${testPrefix}-${meal.field}`}
                style={[...inputStyle, styles.multiline]}
              />
            </View>
          ))}
          {/* No food is called good or bad here, and none is suggested.
              The athlete records what happened. */}
          <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
            Write it as you would say it. Nothing here is judged.
          </Text>
        </>
      )}

      {section(
        'The rest of the day',
        <>
          <View style={{ gap: spacing['space-2'] }}>
            {label('Training or activity')}
            <TextInput
              value={draft.entry.activities ?? ''}
              onChangeText={(text) => set('activities', parseText(text))}
              multiline
              placeholder="—"
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel="Training or activity"
              testID={`${testPrefix}-activities`}
              style={[...inputStyle, styles.multiline]}
            />
          </View>
          <View style={{ gap: spacing['space-2'] }}>
            {label('Supplements, if any')}
            <TextInput
              value={draft.entry.supplements ?? ''}
              onChangeText={(text) => set('supplements', parseText(text))}
              placeholder="—"
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel="Supplements, if any"
              testID={`${testPrefix}-supplements`}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: spacing['space-2'] }}>
            {/* A rough figure is what the instrument asks for: "fluids, a
                tentative idea, say, I had my four liter of water today."
                No daily goal sits beside it, because none has been set. */}
            {label('Fluid, in mL')}
            <TextInput
              value={draft.fluidText}
              onChangeText={(text) => onChange({ ...draft, fluidText: text })}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={colors['ink-faint']}
              accessibilityLabel="Fluid in millilitres"
              testID={`${testPrefix}-fluid`}
              style={inputStyle}
            />
            <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
              A rough idea is fine. A large bottle is about 1500 mL.
            </Text>
          </View>
        </>
      )}

      {section(
        'How it felt',
        <>
          {RECALL_RATINGS.map((rating) => (
            <RatingScale
              key={rating.field}
              label={rating.label}
              value={draft.entry[rating.field]}
              onChange={(value) => set(rating.field, value)}
              testID={`${testPrefix}-${rating.field}`}
            />
          ))}
          <View style={{ gap: spacing['space-2'] }}>
            {label('Hydration reading')}
            <UrineScale
              value={draft.entry.urine_colour}
              onChange={(value) => set('urine_colour', value)}
              onShowGuide={() => onShowGuide('urine')}
              testID={`${testPrefix}-urine`}
            />
          </View>
        </>,
        // One link for the section, not one per rating: the workbook states a
        // single 1-10 scale and both ratings here are read off it.
        <ScaleGuideLink
          scale="rating"
          onPress={() => onShowGuide('rating')}
          testID={`${testPrefix}-rating-guide`}
        />
      )}

      {section(
        'Anything else',
        <TextInput
          value={draft.entry.notes ?? ''}
          onChangeText={(text) => set('notes', parseText(text))}
          multiline
          placeholder="—"
          placeholderTextColor={colors['ink-faint']}
          accessibilityLabel="Anything else"
          testID={`${testPrefix}-notes`}
          style={[...inputStyle, styles.multiline]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
