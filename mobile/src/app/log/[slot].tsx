import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { messageOf } from '@/lib/errors';
import { GUIDANCE_LABEL, type FoodPortion, type FoodWithPortions } from '@/lib/food';
import {
  QUANTITIES,
  addLogItem,
  defaultPortion,
  ensureDailyLog,
  portionSummary,
  searchFoods,
} from '@/lib/logger';
import { MEAL_SLOTS, SLOT_LABEL, todayIso, type MealSlot } from '@/lib/today';
import { useFoods, useParticipantId } from '@/lib/use-foods';
import { useTheme } from '@/theme';

function isMealSlot(value: string | undefined): value is MealSlot {
  return MEAL_SLOTS.includes(value as MealSlot);
}

/**
 * Log a food into one meal slot.
 *
 * Search, then a portion, then how many. Sofia asked for the nutrition to be
 * calculated rather than typed, so nothing on this screen takes a number from
 * the athlete except the quantity — the grams come from the database.
 */
export default function LogMeal() {
  const { slot: slotParam } = useLocalSearchParams<{ slot: string }>();
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();

  const foods = useFoods();
  const participantId = useParticipantId();

  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<FoodWithPortions | null>(null);
  const [portion, setPortion] = useState<FoodPortion | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slot = isMealSlot(slotParam) ? slotParam : null;

  // Choosing a food picks its default portion and resets the count, rather
  // than carrying "3" over from the last food someone tapped.
  function choose(food: FoodWithPortions) {
    const deselect = chosen?.id === food.id;
    setChosen(deselect ? null : food);
    setPortion(deselect ? null : defaultPortion(food));
    setQuantity(1);
  }

  const results = useMemo(
    () => (foods.status === 'ready' ? searchFoods(foods.foods, query) : []),
    [foods, query]
  );

  if (!slot) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <Text style={[typography['heading-l'], { color: colors.ink }]}>Unknown meal slot</Text>
      </SafeAreaView>
    );
  }

  async function save() {
    if (!slot || !portion || participantId === null) return;
    setSaving(true);
    setError(null);
    try {
      const dailyLogId = await ensureDailyLog(participantId, todayIso());
      await addLogItem(dailyLogId, slot, portion.id, quantity);
      router.back();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  const summary = portion ? portionSummary(portion, quantity) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.rowBetween}>
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>
            {SLOT_LABEL[slot].toUpperCase()}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            testID="cancel"
            hitSlop={12}
          >
            <Text style={[typography.label, { color: colors['air-deep'] }]}>CANCEL</Text>
          </Pressable>
        </View>
        <Text style={[typography['display-l'], { color: colors.ink }]}>What did you eat?</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="nasi, pisang, oat…"
          placeholderTextColor={colors['ink-faint']}
          autoCorrect={false}
          accessibilityLabel="Search foods"
          testID="food-search"
          style={[
            typography['body-m'],
            {
              backgroundColor: colors['surface-sunken'],
              borderRadius: radius['radius-lg'],
              color: colors.ink,
              marginTop: spacing['space-4'],
              padding: spacing['space-4'],
            },
          ]}
        />

        {foods.status === 'loading' && (
          <ActivityIndicator color={colors.pisang} style={{ marginTop: spacing['space-6'] }} />
        )}

        {foods.status === 'error' && (
          <Text testID="foods-error" style={[typography['body-m'], { color: colors['cabai-deep'], marginTop: spacing['space-4'] }]}>
            {foods.message}
          </Text>
        )}

        {foods.status === 'ready' && results.length === 0 && (
          <Text testID="no-results" style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-6'] }]}>
            Nothing matches “{query}”. It may not be in the database yet.
          </Text>
        )}

        <View style={{ gap: spacing['space-2'], marginTop: spacing['space-4'] }}>
          {results.map((food) => {
            const selected = chosen?.id === food.id;
            return (
              <Pressable
                key={food.id}
                onPress={() => choose(food)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={food.name_id}
                testID={`food-${food.id}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: selected ? colors['pisang-tint'] : colors['surface-raised'],
                    borderColor: selected ? colors['pisang-deep'] : 'transparent',
                    borderRadius: radius['radius-md'],
                    padding: spacing['space-3'],
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[typography['heading-m'], { color: colors.ink }]}>{food.name_id}</Text>
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
                    {GUIDANCE_LABEL[food.guidance as keyof typeof GUIDANCE_LABEL]}
                  </Text>
                </View>
                {food.name_en && (
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{food.name_en}</Text>
                )}
                {food.guidance_note && (
                  <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{food.guidance_note}</Text>
                )}

                {selected && (
                  <View style={{ gap: spacing['space-3'], marginTop: spacing['space-3'] }}>
                    <Text style={[typography.label, { color: colors['ink-muted'] }]}>PORTION</Text>
                    <View style={styles.chips}>
                      {food.food_portions.map((p) => (
                        <Pressable
                          key={p.id}
                          onPress={() => setPortion(p)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: portion?.id === p.id }}
                          accessibilityLabel={p.label}
                          testID={`portion-${p.id}`}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: portion?.id === p.id ? colors.pisang : colors['surface-sunken'],
                              borderRadius: radius['radius-pill'],
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography['body-s'],
                              { color: portion?.id === p.id ? colors['on-bright'] : colors.ink },
                            ]}
                          >
                            {p.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={[typography.label, { color: colors['ink-muted'] }]}>HOW MANY</Text>
                    <View style={styles.chips}>
                      {QUANTITIES.map((q) => (
                        <Pressable
                          key={q}
                          onPress={() => setQuantity(q)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: quantity === q }}
                          accessibilityLabel={`${q}`}
                          testID={`quantity-${q}`}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: quantity === q ? colors.pisang : colors['surface-sunken'],
                              borderRadius: radius['radius-pill'],
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography['body-s'],
                              { color: quantity === q ? colors['on-bright'] : colors.ink },
                            ]}
                          >
                            {q}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* The deck gives carbohydrate for eight foods and nothing
                        for the rest. A zero here would be a lie, so it says so. */}
                    <Text testID="macro-feedback" style={[typography['body-l'], { color: colors['pisang-deep'] }]}>
                      {summary === null
                        ? ''
                        : summary.unknown
                          ? 'No carbohydrate figure for this yet — it will still be logged.'
                          : `${Math.round(summary.carbs_g ?? 0)} g carbs`}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {error && (
          <Text testID="save-error" style={[typography['body-m'], { color: colors['cabai-deep'], marginTop: spacing['space-4'] }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={{ padding: spacing['space-4'], gap: spacing['space-2'] }}>
        {participantId === null && foods.status === 'ready' && (
          <Text testID="cannot-save" style={[typography['body-s'], { color: colors['ink-muted'] }]}>
            Nothing to save to: this device has not claimed an athlete.
          </Text>
        )}
        <PushButton
          label={saving ? 'Saving…' : 'Add to this meal'}
          fullWidth
          disabled={!chosen || !portion || saving || participantId === null}
          testID="save-item"
          onPress={save}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 24 },
  card: { gap: 2, borderWidth: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
});
