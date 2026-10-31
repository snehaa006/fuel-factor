import { fireEvent, render, screen } from '@testing-library/react-native';

import { MealTimeline } from '@/components/meal-timeline';
import { summariseDay } from '@/lib/today';
import { DEMO_ITEMS } from '@/lib/__fixtures__/today';

const log = {
  day_type: 'training' as const,
  dq_score: null,
  urine_colour: null,
  breakfast: true,
  pre_training: false,
  lunch: true,
  post_training: false,
  dinner: false,
  evening_snack: false,
};

const slots = summariseDay(log, DEMO_ITEMS, 68).slots;

describe('MealTimeline', () => {
  it('draws all six slots, logged or not', async () => {
    await render(<MealTimeline slots={slots} testID="timeline" />);
    for (const slot of ['breakfast', 'pre_training', 'lunch', 'post_training', 'dinner', 'evening_snack']) {
      expect(screen.getByTestId(`timeline-${slot}`)).toBeTruthy();
    }
  });

  it('names what was logged in a slot', async () => {
    await render(<MealTimeline slots={slots} testID="timeline" />);
    expect(screen.getByTestId('timeline-lunch')).toHaveTextContent(/Nasi putih/);
  });

  it('shows a slot’s carbohydrate when its portions carry a figure', async () => {
    await render(<MealTimeline slots={slots} testID="timeline" />);
    expect(screen.getByTestId('timeline-breakfast')).toHaveTextContent(/54 g/);
  });

  it('leaves an empty slot empty, never late or missed', async () => {
    // The sheet records a tick or no tick. The app adds no judgement.
    await render(<MealTimeline slots={slots} testID="timeline" />);
    const dinner = screen.getByTestId('timeline-dinner');
    expect(dinner).toHaveTextContent(/Nothing logged yet/);
    expect(dinner).not.toHaveTextContent(/missed|late|skipped/i);
  });

  it('tells a screen reader which slots are done', async () => {
    await render(<MealTimeline slots={slots} testID="timeline" />);
    expect(screen.getByLabelText('Breakfast, logged')).toBeTruthy();
    expect(screen.getByLabelText('Dinner, not logged yet')).toBeTruthy();
  });

  it('hands the pressed slot back', async () => {
    const onPressSlot = jest.fn();
    await render(<MealTimeline slots={slots} onPressSlot={onPressSlot} testID="timeline" />);
    fireEvent.press(screen.getByTestId('timeline-dinner'));
    expect(onPressSlot).toHaveBeenCalledWith(expect.objectContaining({ slot: 'dinner' }));
  });
});
