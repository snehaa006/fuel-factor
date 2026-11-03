import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PushButton } from '@/components/push-button';
import { macroLine, macrosFor, type FoodPortion, type FoodWithPortions } from '@/lib/food';
import { defaultPortion, QUANTITIES, searchFoods } from '@/lib/logger';
import { useFoods } from '@/lib/use-foods';
import { useTheme } from '@/theme';

/**
 * Search the food database, pick a portion and how many, and hand it back.
 *
 * The compact version of the daily log's picker, for places where a food is
 * one field among many -- the recall's meals. Every figure comes from the
 * database; nothing here takes a number from the athlete but the quantity.
 */

export type PickedFood = { food: FoodWithPortions; portion: FoodPortion; quantity: number };

export type FoodPickerProps = {
  onAdd: (picked: PickedFood) => void;
  onClose?: () => void;
  /** How many matches to list. The search itself is capped on the server. */
  maxResults?: number;
  testID?: string;
};

export function FoodPicker({ onAdd, onClose, maxResults = 12, testID = 'food-picker' }: FoodPickerProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [query, setQuery] = useState('');
  const foods = useFoods(query);
  const [chosen, setChosen] = useState<FoodWithPortions | null>(null);
  const [portion, setPortion] = useState<FoodPortion | null>(null);
  const [quantity, setQuantity] = useState(1);

  const results = useMemo(
    () => (foods.status === 'ready' ? searchFoods(foods.foods, query).slice(0, maxResults) : []),
    [foods, query, maxResults]
  );

  function choose(food: FoodWithPortions) {
    const same = chosen?.id === food.id;
    setChosen(same ? null : food);
    setPortion(same ? null : defaultPortion(food));
    setQuantity(1);
  }

  function add() {
    if (!chosen || !portion) return;
    onAdd({ food: chosen, portion, quantity });
    setChosen(null);
    setPortion(null);
    setQuantity(1);
    setQuery('');
  }

  const chip = (selected: boolean) => [
    styles.chip,
    { backgroundColor: selected ? colors.pisang : colors['surface-sunken'], borderRadius: radius['radius-pill'] },
  ];

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors['surface-raised'],
        borderRadius: radius['radius-lg'],
        padding: spacing['space-3'],
        gap: spacing['space-2'],
      }}
    >
      <View style={styles.rowBetween}>
        <Text style={[typography.label, { color: colors['ink-muted'] }]}>FOOD DATABASE</Text>
        {onClose && (
          <Pressable onPress={onClose} accessibilityRole="button" testID={`${testID}-close`} hitSlop={10}>
            <Text style={[typography.label, { color: colors['air-deep'] }]}>DONE</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search: nasi, telur, tempe…"
        placeholderTextColor={colors['ink-faint']}
        autoCorrect={false}
        accessibilityLabel="Search the food database"
        testID={`${testID}-search`}
        style={[
          typography['body-m'],
          { backgroundColor: colors['surface-sunken'], borderRadius: radius['radius-md'], color: colors.ink, padding: spacing['space-3'] },
        ]}
      />

      {foods.status === 'loading' && <ActivityIndicator color={colors.pisang} />}
      {foods.status === 'error' && (
        <Text style={[typography['body-s'], { color: colors['cabai-deep'] }]}>{foods.message}</Text>
      )}
      {foods.status === 'ready' && results.length === 0 && (
        <Text testID={`${testID}-empty`} style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          Nothing matches “{query}”. Write it in the box above instead.
        </Text>
      )}

      {results.map((food) => {
        const selected = chosen?.id === food.id;
        const hundred = defaultPortion(food);
        return (
          <View key={food.id} style={{ gap: spacing['space-2'] }}>
            <Pressable
              onPress={() => choose(food)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={food.name_id}
              testID={`${testID}-food-${food.id}`}
              style={{
                backgroundColor: selected ? colors['pisang-tint'] : 'transparent',
                borderRadius: radius['radius-md'],
                paddingVertical: spacing['space-2'],
                paddingHorizontal: spacing['space-2'],
              }}
            >
              <Text style={[typography['body-m'], { color: colors.ink }]}>{food.name_id}</Text>
              {hundred !== null && (
                <Text style={[typography['body-s'], { color: colors['ink-faint'] }]}>
                  {hundred.label}: {macroLine(macrosFor(hundred)) || 'no figures yet'}
                </Text>
              )}
            </Pressable>

            {selected && (
              <View style={{ gap: spacing['space-2'], paddingHorizontal: spacing['space-2'] }}>
                <View style={styles.chips}>
                  {food.food_portions.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setPortion(p)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: portion?.id === p.id }}
                      testID={`${testID}-portion-${p.id}`}
                      style={chip(portion?.id === p.id)}
                    >
                      <Text style={[typography['body-s'], { color: portion?.id === p.id ? colors['on-bright'] : colors.ink }]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.chips}>
                  {QUANTITIES.map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => setQuantity(q)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: quantity === q }}
                      accessibilityLabel={`${q} times`}
                      testID={`${testID}-quantity-${q}`}
                      style={chip(quantity === q)}
                    >
                      <Text style={[typography['body-s'], { color: quantity === q ? colors['on-bright'] : colors.ink }]}>
                        ×{q}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {portion !== null && (
                  <Text testID={`${testID}-macros`} style={[typography['body-m'], { color: colors['pisang-deep'] }]}>
                    {macroLine(macrosFor(portion, quantity)) || 'No figures for this portion yet.'}
                  </Text>
                )}
                <PushButton label="Add" disabled={portion === null} onPress={add} testID={`${testID}-add`} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
});
