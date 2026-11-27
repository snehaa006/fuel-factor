import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import WeekCheck from '@/app/learn/check/[week]';
import Learn from '@/app/learn/index';
import Week from '@/app/learn/[week]';
import { FactCard } from '@/components/did-you-know';
import { WeekCheckPrompt } from '@/components/week-check-prompt';
import { DEMO_LESSON_CARDS, DEMO_LESSON_CARDS_WEEK2 } from '@/lib/__fixtures__/today';
import { programmeState, type ProgrammeState } from '@/lib/programme';
import { checksFor, resetChecksForTests, saveCheck } from '@/lib/week-check';
import { quizFor } from '@/lib/weekly';

// A mock factory can only reach variables named mock*, so these are.
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { week?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

let mockProgramme: ProgrammeState | null = null;
jest.mock('@/lib/use-programme', () => ({
  useProgramme: () =>
    mockProgramme === null
      ? { status: 'needs-onboarding', reload: () => {} }
      : { status: 'ready', programme: mockProgramme, name: 'Theo', teamName: 'Squad', reload: () => {} },
}));

jest.mock('@/lib/use-foods', () => ({ useParticipantId: () => 'p-theo' }));
jest.mock('@/lib/use-meal-challenge', () => ({ useMealChallenge: () => ({ status: 'none' }) }));

const mockWeeks = [1, 2, 3, 4].map((n) => ({
  weekNumber: n,
  theme: ['Carbohydrates', 'Protein + Micronutrients', 'Recovery', 'Game Ready'][n - 1],
  challenge: `Challenge ${n}`,
  challengeId: `c${n}`,
  unlocked: true,
}));
const mockCards: Record<number, typeof DEMO_LESSON_CARDS> = {
  1: DEMO_LESSON_CARDS,
  2: DEMO_LESSON_CARDS_WEEK2,
};
jest.mock('@/lib/use-learn', () => ({
  useWeeks: () => ({ status: 'ready', weeks: mockWeeks }),
  useCards: (key: string) => ({
    status: 'ready',
    cards: Object.fromEntries(
      (key === '' ? [] : key.split(',').map(Number)).map((w) => [w, mockCards[w] ?? []])
    ),
  }),
  useWeek: (week: number) => ({
    status: 'ready',
    detail: {
      week: mockWeeks[week - 1],
      cards: mockCards[week] ?? [],
      completedOn: null,
      photoPath: null,
    },
    foods: [],
    toggleChallenge: jest.fn(),
    attachPhoto: jest.fn(),
    clearPhoto: jest.fn(),
    photoUrl: null,
    uploading: false,
    photoError: null,
    reportPhotoError: jest.fn(),
  }),
}));

const START = '2026-10-28';
const WEEK_2_DAY_3 = programmeState(START, '2026-11-06');

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockProgramme = WEEK_2_DAY_3;
  resetChecksForTests();
  await AsyncStorage.clear();
});

describe('Learn, week by week', () => {
  it('leads with the week the athlete is on, marked as this week', async () => {
    await render(<Learn />);
    expect(screen.getByTestId('week-2-current')).toHaveTextContent('THIS WEEK');
    // First in the list, ahead of week 1.
    const ids = screen.getAllByTestId(/^week-\d$/).map((n) => n.props.testID);
    expect(ids[0]).toBe('week-2');
  });

  it('keeps the earlier week open and locks the later ones with their day', async () => {
    await render(<Learn />);
    expect(screen.getByTestId('week-1').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByTestId('week-3').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('week-3-opens')).toHaveTextContent('Opens Wed 11 Nov');
    expect(screen.getByTestId('week-4-opens')).toHaveTextContent('Opens Wed 18 Nov');
  });

  it('shows how each open week’s check went', async () => {
    saveCheck('p-theo', 1, { right: 3, total: 5, on: '2026-11-04' });
    await render(<Learn />);
    expect(screen.getByTestId('week-1-check')).toHaveTextContent('Check: 3/5');
    expect(screen.getByTestId('week-2-check')).toHaveTextContent('Check not done yet');
  });

  it('opens every week once the programme is over', async () => {
    mockProgramme = programmeState(START, '2026-12-01');
    await render(<Learn />);
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByTestId(`week-${n}`).props.accessibilityState.disabled).toBe(false);
    }
  });
});

describe('a week that has not opened', () => {
  it('says when it opens instead of showing the lesson early', async () => {
    mockParams = { week: '3' };
    await render(<Week />);
    expect(screen.getByTestId('week-locked')).toHaveTextContent('Week 3 is not open yet');
    expect(screen.getByText(/Wed 11 Nov/)).toBeTruthy();
    expect(screen.queryByTestId('lesson-next')).toBeNull();
  });
});

describe('the lesson, one card at a time', () => {
  beforeEach(() => {
    mockParams = { week: '1' };
  });

  it('starts on the first card and says how far through', async () => {
    await render(<Week />);
    expect(screen.getByTestId('lesson-position')).toHaveTextContent(`1 of ${DEMO_LESSON_CARDS.length}`);
    expect(screen.getByTestId('card-intro')).toBeTruthy();
    expect(screen.queryByTestId('card-stats')).toBeNull();
    expect(screen.getByTestId('lesson-previous').props.accessibilityState.disabled).toBe(true);
  });

  it('steps forward and back through the deck’s order', async () => {
    await render(<Week />);
    await act(async () => fireEvent.press(screen.getByTestId('lesson-next')));
    expect(screen.getByTestId('card-stats')).toBeTruthy();
    expect(screen.getByTestId('lesson-position')).toHaveTextContent('2 of', { exact: false });
    await act(async () => fireEvent.press(screen.getByTestId('lesson-previous')));
    expect(screen.getByTestId('card-intro')).toBeTruthy();
  });

  it('ends on the week’s check', async () => {
    await render(<Week />);
    for (let i = 1; i < DEMO_LESSON_CARDS.length; i += 1) {
      await act(async () => fireEvent.press(screen.getByTestId('lesson-next')));
    }
    expect(screen.queryByTestId('lesson-next')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('lesson-check')));
    expect(mockPush).toHaveBeenCalledWith('/learn/check/1');
  });

  it('can still show the whole lesson at once', async () => {
    await render(<Week />);
    await act(async () => fireEvent.press(screen.getByTestId('lesson-show-all')));
    expect(screen.getByTestId('card-intro')).toBeTruthy();
    expect(screen.getByTestId('card-references')).toBeTruthy();
    expect(screen.queryByTestId('lesson-position')).toBeNull();
  });
});

describe('the week check', () => {
  const questions = quizFor(DEMO_LESSON_CARDS, 1);

  beforeEach(() => {
    mockParams = { week: '1' };
  });

  async function answerAll(pickRight: boolean) {
    await act(async () => fireEvent.press(screen.getByTestId('check-start')));
    for (const q of questions) {
      const choices =
        q.kind === 'myth' ? ['myth', 'fact'] : q.choices;
      const index = choices.findIndex((c) => (c === q.answer) === pickRight);
      await act(async () => fireEvent.press(screen.getByTestId(`check-choice-${index}`)));
      expect(screen.getByTestId('check-feedback')).toHaveTextContent(pickRight ? 'Right.' : 'Not quite.', { exact: false });
      await act(async () => fireEvent.press(screen.getByTestId('check-next')));
    }
  }

  it('says how many questions, all from the lesson', async () => {
    await render(<WeekCheck />);
    expect(screen.getByText(`${questions.length} quick questions, all from this week’s lesson.`)).toBeTruthy();
  });

  it('shows the deck’s answer after each question, and the score at the end', async () => {
    await render(<WeekCheck />);
    await answerAll(true);
    expect(screen.getByTestId('check-score')).toHaveTextContent(
      `${questions.length} of ${questions.length} right`
    );
    expect(checksFor('p-theo')[1]).toMatchObject({ right: questions.length, total: questions.length });
  });

  it('records a score that is not perfect, too', async () => {
    await render(<WeekCheck />);
    await answerAll(false);
    expect(screen.getByTestId('check-score')).toHaveTextContent(`0 of ${questions.length} right`);
    expect(checksFor('p-theo')[1]).toMatchObject({ right: 0 });
  });

  it('answers a myth with the deck’s own fact', async () => {
    await render(<WeekCheck />);
    await act(async () => fireEvent.press(screen.getByTestId('check-start')));
    expect(screen.getByTestId('check-prompt')).toHaveTextContent(
      'Carbs make you fat. Athletes should eat mostly protein.',
      { exact: false }
    );
    await act(async () => fireEvent.press(screen.getByTestId('check-choice-1'))); // "Fact"
    expect(screen.getByTestId('check-feedback')).toHaveTextContent(/Carbohydrates are stored as glycogen/);
  });

  it('will not check a week that has not opened', async () => {
    mockParams = { week: '4' };
    await render(<WeekCheck />);
    expect(screen.getByTestId('check-locked')).toBeTruthy();
  });
});

describe('on Today', () => {
  it('offers last week’s check until it is done', async () => {
    const onOpen = jest.fn();
    await render(<WeekCheckPrompt programme={WEEK_2_DAY_3} participantId="p-theo" onOpen={onOpen} />);
    expect(screen.getByTestId('week-check-prompt')).toHaveTextContent('WEEK 1 CHECK', { exact: false });
    await act(async () => fireEvent.press(screen.getByTestId('week-check-prompt')));
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('goes away once that check is done', async () => {
    await render(<WeekCheckPrompt programme={WEEK_2_DAY_3} participantId="p-theo" onOpen={() => {}} />);
    await act(async () => saveCheck('p-theo', 1, { right: 4, total: 5, on: '2026-11-06' }));
    expect(screen.queryByTestId('week-check-prompt')).toBeNull();
  });

  it('folds the fact of the day until it is tapped', async () => {
    const fact = { value: '60–70%', label: 'Of energy during team sports comes from carbohydrates', heading: 'Why it matters', week: 1 };
    const onOpenLesson = jest.fn();
    await render(<FactCard fact={fact} onOpenLesson={onOpenLesson} />);
    expect(screen.getByText('DID YOU KNOW?')).toBeTruthy();
    expect(screen.queryByTestId('did-you-know-fact')).toBeNull();

    await act(async () => fireEvent.press(screen.getByTestId('did-you-know-toggle')));
    expect(screen.getByTestId('did-you-know-fact')).toHaveTextContent('60–70%', { exact: false });
    expect(screen.getByTestId('did-you-know-fact')).toHaveTextContent('Week 1 material · Why it matters', { exact: false });

    await act(async () => fireEvent.press(screen.getByTestId('did-you-know-lesson')));
    expect(onOpenLesson).toHaveBeenCalledWith(1);
  });
});
