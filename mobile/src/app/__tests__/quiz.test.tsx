import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import Quiz from '@/app/learn/quiz/[week]';
import { QuizPrompt } from '@/components/quiz-prompt';
import { programmeState, type ProgrammeState } from '@/lib/programme';
import type { QuizQuestion, QuizResultsState } from '@/lib/quiz';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({ week: '1' }),
}));

let mockProgramme: ProgrammeState = programmeState('2026-10-28', '2026-11-03');
jest.mock('@/lib/use-programme', () => ({
  useProgramme: () => ({ status: 'ready', programme: mockProgramme, name: 'Theo', teamName: 'S', reload: () => {} }),
}));
jest.mock('@/lib/use-foods', () => ({ useParticipantId: () => 'p-theo' }));
jest.mock('@/lib/daily-facts', () => ({
  fetchWeekFacts: () => Promise.resolve([{ day: 1, title: 'Carbs are your sprint fuel', titleId: null }]),
}));
jest.mock('@/lib/badges', () => ({
  ...jest.requireActual('@/lib/badges'),
  fetchBadges: () =>
    Promise.resolve([
      { id: 'b1', code: 'first_quiz', name: 'Quick Learner', description: 'Finish one weekly mini quiz.', criterion: 'quizzes_done', threshold: 1, position: 8 },
      { id: 'b2', code: 'perfect_quiz', name: 'Full Marks', description: 'Get 7 out of 7.', criterion: 'perfect_quizzes', threshold: 1, position: 10 },
    ]),
}));

const QUESTIONS: QuizQuestion[] = [
  { week: 1, position: 1, question: 'In team sports, how much of your energy comes from carbs?', questionId: null, options: ['20–40%', '60–70%', '80–90%'], optionsId: null, answer: 1 },
  { week: 1, position: 2, question: '“Carbs make you fat” is…', questionId: null, options: ['A fact', 'A myth from adult dieting', 'Only on rest days'], optionsId: null, answer: 1 },
];
const mockSave = jest.fn((_row: unknown) => Promise.resolve());
let mockResults: QuizResultsState = { status: 'ready', results: [] };
jest.mock('@/lib/quiz', () => ({
  ...jest.requireActual('@/lib/quiz'),
  useQuiz: () => ({ status: 'ready', questions: QUESTIONS, save: mockSave }),
  useQuizResults: () => mockResults,
}));

beforeEach(async () => {
  jest.clearAllMocks();
  mockProgramme = programmeState('2026-10-28', '2026-11-03');
  mockResults = { status: 'ready', results: [] };
  await AsyncStorage.clear();
});

describe('the mini quiz', () => {
  it('says at once whether an answer was right, and which day’s fact it checks', async () => {
    await render(<Quiz />);
    expect(screen.getByTestId('quiz-progress')).toHaveTextContent('Question 1 of 2');
    await act(async () => fireEvent.press(screen.getByTestId('quiz-option-0')));
    expect(screen.getByTestId('quiz-feedback')).toHaveTextContent('The answer is B. 60–70%');
    expect(screen.getByText('Day 1: Carbs are your sprint fuel')).toBeTruthy();
  });

  it('ends on the score, a star per right answer, the new badges, and saves it', async () => {
    await render(<Quiz />);
    await act(async () => fireEvent.press(screen.getByTestId('quiz-option-1')));
    await act(async () => fireEvent.press(screen.getByTestId('quiz-next')));
    await act(async () => fireEvent.press(screen.getByTestId('quiz-option-1')));
    await act(async () => fireEvent.press(screen.getByTestId('quiz-next')));
    expect(screen.getByTestId('quiz-score')).toHaveTextContent('2/2');
    expect(screen.getByTestId('quiz-stars').props.accessibilityLabel).toBe('2 of 2 right');
    expect(screen.getByTestId('quiz-badge-first_quiz')).toHaveTextContent(/NEW BADGE.*Quick Learner/);
    expect(screen.getByTestId('quiz-badge-perfect_quiz')).toBeTruthy();
    expect(mockSave).toHaveBeenCalledWith({ participant_id: 'p-theo', week: 1, answers: [1, 1], score: 2, total: 2 });
  });

  it('waits for the week’s seventh day', async () => {
    mockProgramme = programmeState('2026-10-28', '2026-11-01');
    await render(<Quiz />);
    expect(screen.getByTestId('quiz-not-yet')).toHaveTextContent(/opens on/);
  });
});

describe('on Today', () => {
  it('offers the week’s quiz once it opens, then shows the score', async () => {
    const onOpen = jest.fn();
    await render(<QuizPrompt programme={programmeState('2026-10-28', '2026-11-03')} participantId="p-theo" onOpen={onOpen} />);
    expect(screen.getByTestId('quiz-prompt')).toHaveTextContent(/WEEK 1 MINI QUIZ/);
    await act(async () => fireEvent.press(screen.getByTestId('quiz-prompt')));
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('shows the score once it is taken', async () => {
    mockResults = { status: 'ready', results: [{ week: 1, score: 6, total: 7, answers: [] }] };
    await render(<QuizPrompt programme={programmeState('2026-10-28', '2026-11-03')} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.getByTestId('quiz-prompt-done')).toHaveTextContent('Week 1 quiz: 6/7', { exact: false });
  });

  it('offers nothing before the week’s seventh day', async () => {
    await render(<QuizPrompt programme={programmeState('2026-10-28', '2026-11-01')} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.queryByTestId('quiz-prompt')).toBeNull();
  });
});
