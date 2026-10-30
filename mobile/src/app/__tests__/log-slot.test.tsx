import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LogMeal from '@/app/log/[slot]';
import { addLogItem, ensureDailyLog } from '@/lib/logger';
import { useFoods, useParticipantId } from '@/lib/use-foods';
import { DEMO_FOODS } from '@/lib/__fixtures__/today';

jest.mock('@/lib/use-foods');
jest.mock('@/lib/logger', () => ({
  ...jest.requireActual('@/lib/logger'),
  ensureDailyLog: jest.fn(),
  addLogItem: jest.fn(),
}));

const mockBack = jest.fn();
let mockSlotParam = 'breakfast';
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => ({ slot: mockSlotParam }),
}));

const mockFoods = useFoods as jest.MockedFunction<typeof useFoods>;
const mockParticipant = useParticipantId as jest.MockedFunction<typeof useParticipantId>;
const mockEnsure = ensureDailyLog as jest.MockedFunction<typeof ensureDailyLog>;
const mockAdd = addLogItem as jest.MockedFunction<typeof addLogItem>;

// Each render gets a fresh root; without this the trees accumulate and a
// later lookup searches one that was never populated.
afterEach(cleanup);

beforeEach(() => {
  jest.clearAllMocks();
  mockSlotParam = 'breakfast';
  mockFoods.mockReturnValue({ status: 'ready', foods: DEMO_FOODS });
  mockParticipant.mockReturnValue('p1');
  mockEnsure.mockResolvedValue('log-1');
  mockAdd.mockResolvedValue(undefined);
});

/** Choose a food and wait for its portion panel. */
async function choose(id: string) {
  fireEvent.press(screen.getByTestId(`food-${id}`));
  await waitFor(() => expect(screen.getByTestId(`portion-${id}-p`)).toBeTruthy());
}

describe('the logger', () => {
  it('names the slot it is logging into', async () => {
    mockSlotParam = 'post_training';
    await render(<LogMeal />);
    expect(screen.getByText('POST-TRAINING')).toBeTruthy();
  });

  it('refuses an unknown slot rather than logging into nothing', async () => {
    mockSlotParam = 'second_breakfast';
    await render(<LogMeal />);
    expect(screen.getByText('Unknown meal slot')).toBeTruthy();
  });

  it('lists the food database', async () => {
    await render(<LogMeal />);
    expect(screen.getByTestId('food-f1')).toHaveTextContent(/Nasi putih/);
  });

  it('narrows the list as you type', async () => {
    await render(<LogMeal />);
    fireEvent.changeText(screen.getByTestId('food-search'), 'pisang');
    await waitFor(() => expect(screen.queryByTestId('food-f1')).toBeNull());
    expect(screen.getByTestId('food-f4')).toBeTruthy();
  });

  it('says so when nothing matches', async () => {
    await render(<LogMeal />);
    fireEvent.changeText(screen.getByTestId('food-search'), 'rendang');
    await waitFor(() => expect(screen.getByTestId('no-results')).toBeTruthy());
  });

  it('shows the carbohydrate for the chosen portion', async () => {
    await render(<LogMeal />);
    await choose('f4');
    expect(screen.getByTestId('macro-feedback')).toHaveTextContent(/27 g carbs/);
  });

  it('recalculates when the count changes', async () => {
    await render(<LogMeal />);
    await choose('f4');
    fireEvent.press(screen.getByTestId('quantity-1.5'));
    await waitFor(() => expect(screen.getByTestId('macro-feedback')).toHaveTextContent(/41 g carbs/));
  });

  it('says a figure is missing rather than showing zero grams', async () => {
    // Pepaya is in the deck with no carbohydrate number. Showing "0 g carbs"
    // would tell an athlete they ate none, which is not what the deck says.
    await render(<LogMeal />);
    await choose('f6');
    expect(screen.getByTestId('macro-feedback')).toHaveTextContent(/No carbohydrate figure/);
    expect(screen.getByTestId('macro-feedback')).not.toHaveTextContent('0 g');
  });

  it('still lets a food with no figure be logged', async () => {
    await render(<LogMeal />);
    await choose('f6');
    expect(screen.getByTestId('save-item').props.accessibilityState.disabled).toBe(false);
  });

  it('offers the lower-priority foods with the deck’s own wording, never a warning', async () => {
    await render(<LogMeal />);
    const mie = screen.getByTestId('food-f7');
    expect(mie).toHaveTextContent(/Okay, but not the priority/);
    expect(mie).not.toHaveTextContent(/bad|avoid|unhealthy|junk/i);
  });

  it('resets the count when a different food is chosen', async () => {
    // Otherwise "3" carries over from the last food someone tapped and three
    // bowls of rice get logged as three bananas' worth.
    await render(<LogMeal />);
    await choose('f4');
    fireEvent.press(screen.getByTestId('quantity-3'));
    await waitFor(() => expect(screen.getByTestId('macro-feedback')).toHaveTextContent(/81 g carbs/));
    await choose('f1');
    expect(screen.getByTestId('macro-feedback')).toHaveTextContent(/57 g carbs/);
  });

  it('closes the panel when the chosen food is tapped again', async () => {
    await render(<LogMeal />);
    await choose('f4');
    fireEvent.press(screen.getByTestId('food-f4'));
    await waitFor(() => expect(screen.queryByTestId('portion-f4-p')).toBeNull());
  });

});

describe('saving', () => {
  it('cannot be saved before a food is chosen', async () => {
    await render(<LogMeal />);
    expect(screen.getByTestId('save-item').props.accessibilityState.disabled).toBe(true);
  });

  it('writes the item into the slot it was opened on', async () => {
    mockSlotParam = 'dinner';
    await render(<LogMeal />);
    await choose('f1');
    fireEvent.press(screen.getByTestId('save-item'));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith('log-1', 'dinner', 'f1-p', 1));
  });

  it('goes back to Today once saved', async () => {
    await render(<LogMeal />);
    await choose('f1');
    fireEvent.press(screen.getByTestId('save-item'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('stays put and says why when the write is refused', async () => {
    mockAdd.mockRejectedValue({ message: 'new row violates row-level security policy' });
    await render(<LogMeal />);
    await choose('f1');
    fireEvent.press(screen.getByTestId('save-item'));
    await waitFor(() => expect(screen.getByTestId('save-error')).toHaveTextContent(/row-level security/));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('explains a disabled button rather than just looking broken', async () => {
    mockParticipant.mockReturnValue(null);
    await render(<LogMeal />);
    expect(screen.getByTestId('cannot-save')).toHaveTextContent(/has not claimed an athlete/);
  });
});

describe('getting out', () => {
  it('has a visible way back, since the stack shows no header', async () => {
    await render(<LogMeal />);
    fireEvent.press(screen.getByTestId('cancel'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('writes nothing on the way out', async () => {
    await render(<LogMeal />);
    await choose('f1');
    fireEvent.press(screen.getByTestId('cancel'));
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
