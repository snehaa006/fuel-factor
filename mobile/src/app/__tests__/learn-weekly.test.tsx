import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import WeekCheckIn from '@/app/learn/check/[week]';
import Learn from '@/app/learn/index';
import Week from '@/app/learn/[week]';
import { FactCard } from '@/components/did-you-know';
import { WeekCheckPrompt } from '@/components/week-check-prompt';
import { DEMO_LESSON_CARDS, DEMO_LESSON_CARDS_WEEK2 } from '@/lib/__fixtures__/today';
import { programmeState, type ProgrammeState } from '@/lib/programme';
import type { CheckinQuestion, FromLogs, WeeklyLog } from '@/lib/weekly-log';

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

// The check-in's data hooks; the pure helpers stay real.
let mockChecked: number[] = [];
let mockQuestion: CheckinQuestion | null = null;
let mockExisting: WeeklyLog | null = null;
let mockLogs: FromLogs | null = null;
const mockSave = jest.fn((_row: unknown) => Promise.resolve());
jest.mock('@/lib/weekly-log', () => ({
  ...jest.requireActual('@/lib/weekly-log'),
  useCheckedWeeks: () => ({ status: 'ready', weeks: mockChecked }),
  useWeeklyCheckin: () => ({
    status: 'ready',
    question: mockQuestion,
    existing: mockExisting,
    logs: mockLogs,
    save: mockSave,
  }),
}));

const START = '2026-10-28';
const WEEK_2_DAY_3 = programmeState(START, '2026-11-06');

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockProgramme = WEEK_2_DAY_3;
  mockChecked = [];
  mockQuestion = {
    week: 1,
    question: 'Did you notice any difference after adding carbs this week?',
    kind: 'text',
    options: null,
    draft: true,
  };
  mockExisting = null;
  mockLogs = null;
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

  it('says whether each finished week’s check-in is in', async () => {
    await render(<Learn />);
    expect(screen.getByTestId('week-1-check')).toHaveTextContent('Not checked in yet', { exact: false });
    // Week 2 is on its third day: its check-in is not open yet.
    expect(screen.queryByTestId('week-2-check')).toBeNull();
  });

  it('marks a week checked in once its row is in', async () => {
    mockChecked = [1];
    await render(<Learn />);
    expect(screen.getByTestId('week-1-check')).toHaveTextContent('Checked in ✓');
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

  it('ends back at Learn', async () => {
    await render(<Week />);
    for (let i = 1; i < DEMO_LESSON_CARDS.length; i += 1) {
      await act(async () => fireEvent.press(screen.getByTestId('lesson-next')));
    }
    expect(screen.queryByTestId('lesson-next')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('lesson-finish')));
    expect(mockBack).toHaveBeenCalled();
  });

  it('can still show the whole lesson at once', async () => {
    await render(<Week />);
    await act(async () => fireEvent.press(screen.getByTestId('lesson-show-all')));
    expect(screen.getByTestId('card-intro')).toBeTruthy();
    expect(screen.getByTestId('card-references')).toBeTruthy();
    expect(screen.queryByTestId('lesson-position')).toBeNull();
  });
});

describe('the Sunday check-in', () => {
  beforeEach(() => {
    mockParams = { week: '1' };
  });

  async function fillAll() {
    await act(async () => fireEvent.press(screen.getByTestId('checkin-energy-8')));
    await act(async () => fireEvent.press(screen.getByTestId('checkin-urine-4')));
    await act(async () => fireEvent.changeText(screen.getByTestId('checkin-water'), '2000'));
    await act(async () => fireEvent.press(screen.getByTestId('checkin-breakfast-0')));
    await act(async () => fireEvent.changeText(screen.getByTestId('checkin-behaviour'), 'Less cramps'));
  }

  it('asks the WEEKLY LOG’s five questions, worded as Theo sent them', async () => {
    await render(<WeekCheckIn />);
    expect(screen.getByText('Average training energy last week (1–10)')).toBeTruthy();
    expect(screen.getByText('Average urine colour — 1 = pale/clear, 8 = dark brown')).toBeTruthy();
    expect(screen.getByText('Average water per day (mL)')).toBeTruthy();
    expect(screen.getByText('Breakfast last week')).toBeTruthy();
    expect(screen.getByText('Did you notice any difference after adding carbs this week?')).toBeTruthy();
  });

  it('says when the week’s question is a draft nobody has approved', async () => {
    await render(<WeekCheckIn />);
    expect(screen.getByTestId('checkin-draft')).toHaveTextContent(/awaiting the dietitian’s review/);
  });

  it('will not send until all five are answered', async () => {
    await render(<WeekCheckIn />);
    expect(screen.getByTestId('checkin-send').props.accessibilityState.disabled).toBe(true);
    await fillAll();
    expect(screen.getByTestId('checkin-send').props.accessibilityState.disabled).toBe(false);
  });

  it('saves one row in the tab’s columns, then says the week is in', async () => {
    await render(<WeekCheckIn />);
    await fillAll();
    await act(async () => fireEvent.press(screen.getByTestId('checkin-send')));
    expect(mockSave).toHaveBeenCalledWith({
      week: 1,
      theme: 'Carbohydrates',
      participant_id: 'p-theo',
      avg_training_energy: 8,
      avg_urine_colour: 4,
      avg_fluid_ml: 2000,
      breakfast_compliance: 'Every day',
      week_behaviour_check: 'Less cramps',
      notes: null,
    });
    expect(screen.getByTestId('checkin-thanks')).toHaveTextContent('Week 1 is in.');
  });

  it('starts from the week’s daily logs and says so', async () => {
    mockLogs = { energy: 7, urine: 5, fluidMl: 1800, breakfastDays: 6, daysLogged: 7 };
    await render(<WeekCheckIn />);
    expect(screen.getByTestId('checkin-prefilled')).toHaveTextContent(/daily logs \(7 days\)/);
    expect(screen.getByTestId('checkin-water').props.value).toBe('1800');
    expect(screen.getByText('Your log has breakfast on 6 of 7 days.')).toBeTruthy();
  });

  it('offers a choice question’s own answers', async () => {
    mockParams = { week: '2' };
    mockProgramme = programmeState(START, '2026-11-12'); // week 3, so week 2 is open
    mockQuestion = {
      week: 2,
      question: 'Did you add a protein source to 3+ meals last week?',
      kind: 'choice',
      options: ['Every meal', 'Most meals', 'Some meals', 'No'],
      draft: false,
    };
    await render(<WeekCheckIn />);
    expect(screen.getByTestId('checkin-behaviour-1')).toHaveTextContent('Most meals');
    expect(screen.queryByTestId('checkin-draft')).toBeNull();
  });

  it('edits a week already in rather than adding a second', async () => {
    mockExisting = {
      id: 'w1', week: 1, theme: 'Carbohydrates', participant_id: 'p-theo',
      avg_training_energy: 7, avg_urine_colour: 5, avg_fluid_ml: 1500,
      breakfast_compliance: 'Most days', week_behaviour_check: 'Less cramps', answer: null, notes: null,
      created_at: '2026-11-02T10:00:00Z', updated_at: '2026-11-02T10:00:00Z',
    };
    await render(<WeekCheckIn />);
    expect(screen.getByTestId('checkin-already')).toHaveTextContent(/Mon(day)? 2 Nov/);
    expect(screen.getByTestId('checkin-send')).toHaveTextContent('Update my check-in');
  });

  it('will not take a week that has not happened yet', async () => {
    mockParams = { week: '3' };
    await render(<WeekCheckIn />);
    expect(screen.getByTestId('checkin-not-yet')).toBeTruthy();
  });
});

describe('on Today', () => {
  it('offers last week’s check-in until it is in', async () => {
    const onOpen = jest.fn();
    await render(<WeekCheckPrompt programme={WEEK_2_DAY_3} participantId="p-theo" onOpen={onOpen} />);
    expect(screen.getByTestId('week-check-prompt')).toHaveTextContent('WEEK 1 CHECK-IN', { exact: false });
    await act(async () => fireEvent.press(screen.getByTestId('week-check-prompt')));
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it('goes away once that week is in', async () => {
    mockChecked = [1];
    await render(<WeekCheckPrompt programme={WEEK_2_DAY_3} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.queryByTestId('week-check-prompt')).toBeNull();
  });

  it('shows today’s part of the week’s lesson as one short fact', async () => {
    const fact = {
      week: 1,
      day: 3,
      fact: 'The carbs you eat are stored as glycogen: about 400 g in your muscles and 100 g in your liver.',
      factId: 'Karbohidrat yang kamu makan disimpan sebagai glikogen.',
      topic: 'What Carbohydrates Actually Do',
    };
    await render(<FactCard fact={fact} />);
    expect(screen.getByText('DID YOU KNOW?')).toBeTruthy();
    expect(screen.getByTestId('did-you-know-day')).toHaveTextContent('Day 3 of 7 · Week 1');
    expect(screen.getByTestId('did-you-know-fact')).toHaveTextContent(/stored as glycogen/);
    expect(screen.getByTestId('did-you-know-dots').props.accessibilityLabel).toBe('Part 3 of 7 of this week’s lesson');
    expect(screen.getByText('From the lesson: What Carbohydrates Actually Do')).toBeTruthy();
    // A fact, not a pointer to the lesson.
    expect(screen.queryByText(/Read the lesson/)).toBeNull();

    // Sofia's toggle folds it away.
    await act(async () => fireEvent.press(screen.getByTestId('did-you-know-toggle')));
    expect(screen.queryByTestId('did-you-know-fact')).toBeNull();
  });
});

describe('before the check-in table is on the project', () => {
  it('offers no check-in on Today rather than one that opens onto an error', async () => {
    jest.requireMock('@/lib/weekly-log').useCheckedWeeks = () => ({ status: 'error' });
    await render(<WeekCheckPrompt programme={WEEK_2_DAY_3} participantId="p-theo" onOpen={() => {}} />);
    expect(screen.queryByTestId('week-check-prompt')).toBeNull();
  });
});
