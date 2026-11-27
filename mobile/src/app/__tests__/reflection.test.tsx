import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ReflectionScreen from '@/app/reflection';
import { ReflectionPrompt } from '@/components/reflection-prompt';
import { programmeState, type ProgrammeState } from '@/lib/programme';
import {
  EMPTY_REFLECTION,
  fromRow,
  reflectionOpen,
  reflectionReady,
  toReflectionRow,
  type Reflection,
  type ReflectionState,
} from '@/lib/reflection';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
}));

let mockProgramme: ProgrammeState | null = null;
jest.mock('@/lib/use-programme', () => ({
  useProgramme: () =>
    mockProgramme === null
      ? { status: 'needs-onboarding', reload: () => {} }
      : { status: 'ready', programme: mockProgramme, name: 'Theo', teamName: 'Squad', reload: () => {} },
}));

jest.mock('@/lib/use-foods', () => ({ useParticipantId: () => 'p-theo' }));

let mockState: ReflectionState = { status: 'ready', reflection: null };
const mockSave = jest.fn((_row: unknown) => Promise.resolve());
jest.mock('@/lib/reflection', () => ({
  ...jest.requireActual('@/lib/reflection'),
  useReflection: () => ({ ...mockState, save: mockSave }),
}));

const START = '2026-10-28';
const WEEK_2 = programmeState(START, '2026-11-06');
const WEEK_4_DAY_5 = programmeState(START, '2026-11-22');
const WEEK_4_DAY_6 = programmeState(START, '2026-11-23');
const AFTER = programmeState(START, '2026-11-30');

const SENT: Reflection = {
  id: 'r1',
  participant_id: 'p-theo',
  rating: 9,
  liked: 'Yes',
  best_takeaway: 'Rice the night before a game',
  feedback: null,
  created_at: '2026-11-25T10:00:00Z',
  updated_at: '2026-11-25T10:00:00Z',
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockProgramme = WEEK_4_DAY_6;
  mockState = { status: 'ready', reflection: null };
  await AsyncStorage.clear();
});

describe('when the reflection opens', () => {
  it('opens on week 4’s sixth day, with week 4’s check-in, and stays open', () => {
    expect(reflectionOpen(WEEK_2)).toBe(false);
    expect(reflectionOpen(WEEK_4_DAY_5)).toBe(false);
    expect(reflectionOpen(WEEK_4_DAY_6)).toBe(true);
    expect(reflectionOpen(AFTER)).toBe(true);
  });

  it('never opens without a programme', () => {
    expect(reflectionOpen(null)).toBe(false);
  });
});

describe('the answers', () => {
  it('needs Sofia’s three and leaves the feedback optional', () => {
    expect(reflectionReady(EMPTY_REFLECTION)).toBe(false);
    expect(reflectionReady({ ...EMPTY_REFLECTION, rating: 8, liked: 'Yes' })).toBe(false);
    expect(reflectionReady({ ...EMPTY_REFLECTION, rating: 8, liked: 'Yes', bestTakeaway: '  ' })).toBe(false);
    expect(reflectionReady({ ...EMPTY_REFLECTION, rating: 8, liked: 'Yes', bestTakeaway: 'Breakfast' })).toBe(true);
  });

  it('trims what is typed and stores blank feedback as nothing', () => {
    expect(
      toReflectionRow('p-theo', { rating: 8, liked: 'Somewhat', bestTakeaway: ' Breakfast ', feedback: '  ' })
    ).toEqual({ participant_id: 'p-theo', rating: 8, liked: 'Somewhat', best_takeaway: 'Breakfast', feedback: null });
  });

  it('reads a sent reflection back into the form', () => {
    expect(fromRow(SENT)).toEqual({ rating: 9, liked: 'Yes', bestTakeaway: 'Rice the night before a game', feedback: '' });
  });
});

describe('the screen', () => {
  it('asks Sofia’s three questions and Theo’s feedback', async () => {
    await render(<ReflectionScreen />);
    expect(screen.getByText('How was the programme? (1–10)')).toBeTruthy();
    expect(screen.getByText('Did you like it?')).toBeTruthy();
    expect(screen.getByText('What was your best takeaway?')).toBeTruthy();
    expect(screen.getByText(/Feedback on the programme or the app/)).toBeTruthy();
  });

  it('will not send until the three are answered, then saves one row', async () => {
    await render(<ReflectionScreen />);
    expect(screen.getByTestId('reflection-send').props.accessibilityState.disabled).toBe(true);
    await act(async () => fireEvent.press(screen.getByTestId('reflection-rating-8')));
    await act(async () => fireEvent.press(screen.getByTestId('reflection-liked-0')));
    await act(async () => fireEvent.changeText(screen.getByTestId('reflection-takeaway'), 'Eat breakfast'));
    expect(screen.getByTestId('reflection-send').props.accessibilityState.disabled).toBe(false);

    await act(async () => fireEvent.press(screen.getByTestId('reflection-send')));
    expect(mockSave).toHaveBeenCalledWith({
      participant_id: 'p-theo',
      rating: 8,
      liked: 'Yes',
      best_takeaway: 'Eat breakfast',
      feedback: null,
    });
    expect(screen.getByTestId('reflection-thanks')).toBeTruthy();
  });

  it('edits a reflection already sent', async () => {
    mockState = { status: 'ready', reflection: SENT };
    await render(<ReflectionScreen />);
    expect(screen.getByTestId('reflection-already')).toBeTruthy();
    expect(screen.getByTestId('reflection-takeaway').props.value).toBe('Rice the night before a game');
    expect(screen.getByTestId('reflection-send')).toHaveTextContent('Update my reflection');
  });

  it('waits for the end of the programme', async () => {
    mockProgramme = WEEK_2;
    await render(<ReflectionScreen />);
    expect(screen.getByTestId('reflection-not-yet')).toBeTruthy();
    expect(screen.queryByTestId('reflection-send')).toBeNull();
  });
});

describe('on Today', () => {
  it('offers the reflection once the four weeks are done, until it is in', async () => {
    const onOpen = jest.fn();
    await render(<ReflectionPrompt programme={AFTER} participantId="p-theo" onOpen={onOpen} />);
    await act(async () => fireEvent.press(screen.getByTestId('reflection-prompt')));
    expect(onOpen).toHaveBeenCalled();
  });

  it('is not offered mid-programme', async () => {
    await render(<ReflectionPrompt programme={WEEK_2} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.queryByTestId('reflection-prompt')).toBeNull();
  });

  it('goes away once it is in', async () => {
    mockState = { status: 'ready', reflection: SENT };
    await render(<ReflectionPrompt programme={AFTER} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.queryByTestId('reflection-prompt')).toBeNull();
  });

  it('is hidden when the lookup fails, rather than opening onto an error', async () => {
    mockState = { status: 'error', message: 'relation does not exist' };
    await render(<ReflectionPrompt programme={AFTER} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.queryByTestId('reflection-prompt')).toBeNull();
  });
});
