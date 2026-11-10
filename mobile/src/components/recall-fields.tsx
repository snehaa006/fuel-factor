import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateField } from '@/components/calendar';
import { DayTypeSwitch } from '@/components/day-type-switch';
import { FoodPicker, type PickedFood } from '@/components/food-picker';
import { RatingScale } from '@/components/rating-scale';
import { ScaleGuideLink, type Scale } from '@/components/scale-guide';
import { UrineScale } from '@/components/urine-scale';
import { macroLine, macrosFor } from '@/lib/food';
import {
  appendFood,
  parseText,
  totalMacros,
  RECALL_LIMITS,
  RECALL_MEALS,
  RECALL_RATINGS,
  type MealField,
  type RecallDraft,
  type RecallEntry,
  type RecallFood,
} from '@/lib/recall';
import { DAY_CHOICE_GUIDANCE } from '@/lib/recall-window';
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

  // Which meal's food picker is open. One at a time keeps the form short.
  const [picking, setPicking] = useState<MealField | null>(null);
  const foods = draft.entry.foods ?? [];
  const totals = totalMacros(foods);

  function addFood(meal: MealField, picked: PickedFood) {
    const words = `${picked.food.name_id} ${picked.portion.label}${picked.quantity === 1 ? '' : ` ×${picked.quantity}`}`;
    const food: RecallFood = {
      meal,
      portionId: picked.portion.id,
      foodName: picked.food.name_id,
      portionLabel: picked.portion.label,
      quantity: picked.quantity,
      macros: macrosFor(picked.portion, picked.quantity),
    };
    onChange({
      ...draft,
      entry: { ...draft.entry, foods: [...foods, food], [meal]: appendFood(draft.entry[meal], words) },
    });
  }

  function removeFood(index: number) {
    onChange({ ...draft, entry: { ...draft.entry, foods: foods.filter((_, i) => i !== index) } });
  }

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
            {/* A calendar rather than a typed date. A recall is about a day
                already lived, so the useful half of the calendar is the days
                up to today and `max` says so. */}
            <DateField
              value={draft.dateText === '' ? null : draft.dateText}
              onChange={(date) => onChange({ ...draft, dateText: date ?? '' })}
              placeholder="Pick the day"
              openAt={todayIso()}
              today={todayIso()}
              max={todayIso()}
              title="WHICH DAY WAS IT"
              hint={DAY_CHOICE_GUIDANCE}
              clearable
              accessibilityLabel="Which day was it"
              testID={`${testPrefix}-date`}
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

              {foods.map((food, index) =>
                food.meal !== meal.field ? null : (
                  <View
                    key={`${food.portionId}-${index}`}
                    testID={`${testPrefix}-${meal.field}-food-${index}`}
                    style={[styles.foodRow, { backgroundColor: colors['pisang-tint'], borderRadius: radius['radius-md'], padding: spacing['space-2'] }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography['body-m'], { color: colors.ink }]}>
                        {food.foodName} · {food.portionLabel}
                        {food.quantity === 1 ? '' : ` ×${food.quantity}`}
                      </Text>
                      <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                        {macroLine(food.macros) || 'No figures for this food yet'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeFood(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${food.foodName}`}
                      testID={`${testPrefix}-${meal.field}-food-${index}-remove`}
                      hitSlop={10}
                    >
                      <Text style={[typography.label, { color: colors['cabai-deep'] }]}>REMOVE</Text>
                    </Pressable>
                  </View>
                )
              )}

              {picking === meal.field ? (
                <FoodPicker
                  onAdd={(picked) => addFood(meal.field, picked)}
                  onClose={() => setPicking(null)}
                  testID={`${testPrefix}-${meal.field}-picker`}
                />
              ) : (
                <Pressable
                  onPress={() => setPicking(meal.field)}
                  accessibilityRole="button"
                  testID={`${testPrefix}-${meal.field}-add-food`}
                >
                  <Text style={[typography.label, { color: colors['air-deep'] }]}>
                    + ADD FROM FOOD DATABASE
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          {totals !== null && (
            <View
              testID={`${testPrefix}-food-totals`}
              style={{ backgroundColor: colors['surface-raised'], borderRadius: radius['radius-lg'], padding: spacing['space-3'], gap: 2 }}
            >
              <Text style={[typography.label, { color: colors['ink-muted'] }]}>FROM THE FOODS PICKED</Text>
              <Text style={[typography['heading-m'], { color: colors.ink }]}>
                {macroLine(totals) || 'Not enough figures to add up'}
              </Text>
            </View>
          )}
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
              A large bottle is about 1500 mL.
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
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
