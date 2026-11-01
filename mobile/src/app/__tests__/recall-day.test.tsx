import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RecallDay from '@/app/recall/[day]';
import { useRecallForm } from '@/lib/use-recall';
import { EMPTY_RECALL, type RecallEntry } from '@/lib/recall';
import type { RecallNutrition } from '@/lib/recall-nutrition';

jest.mock('@/lib/use-recall');

const mockBack = jest.fn();
let mockParams: { day: string } = { day: '1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    // require, not an import: a mock factory is hoisted above the imports, so
    // anything it reaches for has to be loaded inside it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

const mockUseRecallForm = useRecallForm as jest.MockedFunction<typeof useRecallForm>;
const mockSave = jest.fn();

const nothingComputed: RecallNutrition = {
  method: 'not_computed',
  kcal: null,
  carbs_g: null,
  protein_g: null,
  fat_g: null,
  note: 'The programme’s food composition tables are not loaded yet.',
};

function ready(entry: Partial<RecallEntry> = {}, over: Record<string, unknown> = {}) {
  mockUseRecallForm.mockReturnValue({
    status: 'ready',
    entry: { ...EMPTY_RECALL, ...entry },
    recallId: null,
    nutrition: null,
    save: mockSave,
    saving: false,
    saveError: null,
    ...over,
  } as ReturnType<typeof useRecallForm>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { day: '1' };
  mockSave.mockResolvedValue(undefined);
  ready();
});

describe('the form asks the RECALL sheet’s questions', () => {
  it('asks for all three meals as free text', async () => {
    // Free text is what the instrument is: "day one, he said, I haven't had my
    // breakfast. And with chicken, I've had 200 grams on day one."
    await render(<RecallDay />);
    for (const field of ['breakfast', 'lunch', 'dinner']) {
      expect(screen.getByTestId(`recall-${field}`)).toBeTruthy();
    }
  });

  it('asks for sleep, activity, supplements and fluid', async () => {
    await render(<RecallDay />);
    for (const field of ['sleep', 'activities', 'supplements', 'fluid']) {
      expect(screen.getByTestId(`recall-${field}`)).toBeTruthy();
    }
  });

  it('asks the sheet’s two ratings and the hydration reading', async () => {
    await render(<RecallDay />);
    expect(screen.getByTestId('recall-energy')).toBeTruthy();
    expect(screen.getByTestId('recall-recovery')).toBeTruthy();
    expect(screen.getByTestId('recall-urine')).toBeTruthy();
  });

  it('never asks for a calorie figure', async () => {
    // "the calories is estimated and calculated based on our composition data
    // that we have ... This will be backend. This is not manual calculation."
    await render(<RecallDay />);
    expect(screen.queryByTestId('recall-est_calories')).toBeNull();
    expect(screen.queryByTestId('recall-calories')).toBeNull();
  });

  // One render per test. An unmount followed by a second render in the same
  // test leaves an update in flight past the end of it, and the next test
  // renders an empty tree with a baffling "Unable to find element".
  it('names the baseline round on days 1 to 3', async () => {
    await render(<RecallDay />);
    expect(screen.getByText(/BEFORE YOU START/)).toBeTruthy();
  });

  it('names the follow-up round on days 4 to 6', async () => {
    mockParams = { day: '4' };
    await render(<RecallDay />);
    expect(screen.getByText(/FOUR WEEKS ON/)).toBeTruthy();
  });

  it('prints the programme’s guidance on which days to pick', async () => {
    // "One weekend and two working days, recall is ideal." Printed, never
    // enforced: refusing a third weekday would lose real data to a preference.
    await render(<RecallDay />);
    expect(screen.getByText(/one weekend day and two school days/i)).toBeTruthy();
  });
});

describe('saving', () => {
  it('will not save an empty day', async () => {
    // A row of nulls in a research table would count as one of the
    // programme's three days for doing nothing.
    await render(<RecallDay />);
    expect(screen.getByTestId('recall-save').props.accessibilityState.disabled).toBe(true);
  });

  it('saves as soon as one answer is given', async () => {
    await render(<RecallDay />);
    fireEvent.changeText(screen.getByTestId('recall-breakfast'), 'Oats and a banana');
    await waitFor(() =>
      expect(screen.getByTestId('recall-save').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('recall-save'));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ breakfast: 'Oats and a banana' })
      )
    );
    await waitFor(() => expect(screen.getByTestId('recall-done')).toBeTruthy());
  });

  it('parses the typed numbers once, on save', async () => {
    await render(<RecallDay />);
    fireEvent.changeText(screen.getByTestId('recall-sleep'), '7.5');
    // Two events in one synchronous block leave an update in flight past the
    // end of the test, and the NEXT test renders an empty tree.
    await waitFor(() => expect(screen.getByTestId('recall-sleep').props.value).toBe('7.5'));
    fireEvent.changeText(screen.getByTestId('recall-fluid'), '2000');
    await waitFor(() =>
      expect(screen.getByTestId('recall-save').props.accessibilityState.disabled).toBe(false)
    );
    fireEvent.press(screen.getByTestId('recall-save'));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ sleep_hours: 7.5, fluid_ml: 2000 })
      )
    );
    await waitFor(() => expect(screen.getByTestId('recall-done')).toBeTruthy());
  });

  it('says what a day with no meals costs, and saves it anyway', async () => {
    // The baseline's nine days hold exactly this -- a urine reading and
    // nothing else -- and they are real data.
    await render(<RecallDay />);
    fireEvent.press(screen.getByTestId('recall-urine-6'));
    await waitFor(() => expect(screen.getByTestId('recall-no-meals')).toBeTruthy());
    expect(screen.getByTestId('recall-save').props.accessibilityState.disabled).toBe(false);
  });

  it('shows a refusal in the words the database used', async () => {
    ready({}, { saveError: 'new row violates row-level security policy' });
    await render(<RecallDay />);
    expect(screen.getByTestId('recall-save-error')).toHaveTextContent(/row-level security/);
  });
});

describe('an answer already on record', () => {
  it('opens with it filled in, not blank', async () => {
    // Re-opening day 2 edits day 2. The form mounts with the answer in hand
    // rather than copying it in from an effect.
    ready({ breakfast: 'Nasi putih', sleep_hours: 8, fluid_ml: 1500, recall_date: '2026-11-01' });
    await render(<RecallDay />);
    expect(screen.getByTestId('recall-breakfast').props.value).toBe('Nasi putih');
    expect(screen.getByTestId('recall-sleep').props.value).toBe('8');
    expect(screen.getByTestId('recall-fluid').props.value).toBe('1500');
    expect(screen.getByTestId('recall-date').props.value).toBe('2026-11-01');
  });
});

describe('what the food database made of it', () => {
  it('says not computed yet, rather than showing a zero', async () => {
    // Zero carbohydrate and unknown carbohydrate are different facts, and
    // Today already says "Not scored yet" for the DQ score for this reason.
    ready({ breakfast: 'Oats' }, { nutrition: nothingComputed });
    await render(<RecallDay />);
    fireEvent.press(screen.getByTestId('recall-save'));

    await waitFor(() => expect(screen.getByTestId('recall-nutrition')).toBeTruthy());
    for (const macro of ['kcal', 'carbs_g', 'protein_g', 'fat_g']) {
      expect(screen.getByTestId(`macro-${macro}`)).toHaveTextContent(/Not computed yet/);
    }
  });

  it('gives the database’s own reason', async () => {
    ready({ breakfast: 'Oats' }, { nutrition: nothingComputed });
    await render(<RecallDay />);
    fireEvent.press(screen.getByTestId('recall-save'));
    await waitFor(() =>
      expect(screen.getByTestId('recall-nutrition-note')).toHaveTextContent(
        /composition tables are not loaded/
      )
    );
  });

  it('shows a figure once the backend returns one', async () => {
    ready(
      { breakfast: 'Oats' },
      { nutrition: { ...nothingComputed, method: 'food_database', carbs_g: 212, kcal: 2100 } }
    );
    await render(<RecallDay />);
    fireEvent.press(screen.getByTestId('recall-save'));
    await waitFor(() => expect(screen.getByTestId('macro-carbs_g')).toHaveTextContent('212 g'));
    expect(screen.getByTestId('macro-kcal')).toHaveTextContent('2100 kcal');
    // Protein and fat stay absent, because the deck gives neither for any food.
    expect(screen.getByTestId('macro-protein_g')).toHaveTextContent(/Not computed yet/);
  });

  it('shows nothing about nutrition before the day is saved', async () => {
    await render(<RecallDay />);
    expect(screen.queryByTestId('recall-nutrition')).toBeNull();
  });
});

describe('the screen passes no judgement', () => {
  it('puts no target beside the fluid box', async () => {
    // The programme has set no daily fluid goal. Fluid has never been
    // collected for any athlete on any day.
    await render(<RecallDay />);
    expect(screen.queryByText(/goal/i)).toBeNull();
    expect(screen.queryByText(/should drink/i)).toBeNull();
  });

  it('calls no food good or bad, and suggests none', async () => {
    await render(<RecallDay />);
    for (const word of [/healthy/i, /unhealthy/i, /bad food/i, /try eating/i, /instead of/i]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });
});

describe('a route that is not a day', () => {
  it('goes back to the recall rather than rendering a form', async () => {
    mockParams = { day: 'banana' };
    await render(<RecallDay />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/recall');
  });
});
