import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import Today from '@/app/today';
import { programmeState, type ProgrammeState } from '@/lib/programme';

/**
 * Today after the four weeks: what the athlete sees in real life once the
 * programme has ended. No meals to log, no evening check-in -- only what the
 * programme still collects.
 */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: () => {},
  Redirect: () => null,
}));

let mockProgramme: ProgrammeState = programmeState('2026-10-28', '2026-11-28');
jest.mock('@/lib/use-programme', () => ({
  useProgramme: () => ({ status: 'ready', programme: mockProgramme, name: 'Theo', teamName: 'Squad', reload: () => {} }),
}));

jest.mock('@/lib/use-today', () => ({
  useToday: () => ({
    status: 'ready',
    data: { participantName: 'Theo', participantId: 'p-theo', summary: {}, activeDates: [] },
    rules: [],
    date: '2026-11-28',
    reload: () => {},
  }),
}));

let mockRecall: unknown = { status: 'ready', window: { status: 'due', dayNumber: 5, phase: 'follow-up' } };
jest.mock('@/lib/use-recall', () => ({ useRecallStatus: () => ({ ...(mockRecall as object), reload: () => {} }) }));
jest.mock('@/lib/use-meal-challenge', () => ({ useMealChallenge: () => ({ status: 'none' }) }));
jest.mock('@/components/recall-prompt', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    RecallPrompt: ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
      <Pressable onPress={onPress} testID={testID}>
        <Text>Follow-up recall</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/week-check-prompt', () => ({ WeekCheckPrompt: () => null }));
jest.mock('@/components/reflection-prompt', () => {
  const { Text } = jest.requireActual('react-native');
  return { ReflectionPrompt: () => <Text testID="reflection-prompt">Look back</Text> };
});
jest.mock('@/components/app-sidebar', () => ({ AppSidebar: () => null }));
jest.mock('@/components/did-you-know', () => {
  const { Text } = jest.requireActual('react-native');
  return { FactButton: () => <Text testID="fact-button">💡</Text> };
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockProgramme = programmeState('2026-10-28', '2026-11-28');
  mockRecall = { status: 'ready', window: { status: 'due', dayNumber: 5, phase: 'follow-up' } };
  await AsyncStorage.clear();
});

describe('Today once the four weeks are over', () => {
  it('says the programme is complete and when it ended', async () => {
    await render(<Today />);
    expect(screen.getByText('PROGRAMME COMPLETE')).toBeTruthy();
    expect(screen.getByTestId('programme-ended')).toHaveTextContent(/ended on .*24 November/);
  });

  it('asks for no meals, no evening check-in and no fact of the day', async () => {
    await render(<Today />);
    for (const id of ['log-meal', 'check-in', 'timeline', 'fuel-ring', 'day-type', 'streak', 'fact-button', 'nudge']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it('asks for what is left: the follow-up recall and the reflection', async () => {
    await render(<Today />);
    expect(screen.getByText('WHAT’S LEFT')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('recall-prompt')));
    expect(mockPush).toHaveBeenCalledWith('/recall/5');
    expect(screen.getByTestId('reflection-prompt')).toBeTruthy();
  });

  it('says so once the follow-up recall is all in', async () => {
    mockRecall = { status: 'ready', window: { status: 'none', reason: 'complete' } };
    await render(<Today />);
    expect(screen.queryByTestId('recall-prompt')).toBeNull();
    expect(screen.getByTestId('recall-all-in')).toHaveTextContent('Your follow-up food recall is all in.');
  });

  it('points at the four weeks’ results', async () => {
    await render(<Today />);
    await act(async () => fireEvent.press(screen.getByTestId('see-progress')));
    expect(mockPush).toHaveBeenCalledWith('/progress');
  });
});
