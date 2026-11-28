import { newlyEarned, NO_STATS, quizStats, valueFor, type Badge } from '../badges';
import { programmeState } from '../programme';
import {
  lastOpenedQuizWeek,
  letter,
  missedDays,
  quizOpen,
  quizOpensOn,
  quizStatus,
  scoreOf,
  type QuizQuestion,
} from '../quiz';

const START = '2026-10-28';
const on = (date: string) => programmeState(START, date);
const q = (position: number, answer: number): QuizQuestion => ({
  week: 1,
  position,
  question: `Q${position}`,
  questionId: null,
  options: ['a', 'b', 'c'],
  optionsId: null,
  answer,
});

describe('scoring the mini quiz', () => {
  const questions = [q(1, 1), q(2, 0), q(3, 2)];

  it('counts the right answers and names the days missed', () => {
    expect(scoreOf(questions, [1, 0, 0])).toBe(2);
    expect(missedDays(questions, [1, 0, 0])).toEqual([3]);
    expect(scoreOf(questions, [null, null, null])).toBe(0);
  });

  it('letters the options A, B, C', () => {
    expect([0, 1, 2].map(letter)).toEqual(['A', 'B', 'C']);
  });
});

describe('when a week’s quiz opens', () => {
  it('opens on the week’s seventh day, once every fact is out', () => {
    expect(quizOpensOn(START, 1)).toBe('2026-11-03');
    expect(quizOpen(1, on('2026-11-02'))).toBe(false); // week 1, day 6
    expect(quizOpen(1, on('2026-11-03'))).toBe(true); // week 1, day 7
    expect(quizOpen(2, on('2026-11-05'))).toBe(false);
    expect(lastOpenedQuizWeek(on('2026-11-24'))).toBe(4);
    expect(lastOpenedQuizWeek(on('2026-12-12'))).toBe(4);
    expect(lastOpenedQuizWeek(on('2026-10-30'))).toBeNull();
  });

  it('is offered until taken, then shows its score', () => {
    expect(quizStatus(on('2026-11-24'), [])).toEqual({ kind: 'due', week: 4 });
    // Week 4's taken but week 3's is not: the one still missing is offered.
    const w4 = { week: 4, score: 6, total: 7, answers: [] };
    expect(quizStatus(on('2026-11-24'), [w4])).toEqual({ kind: 'due', week: 3 });
    const w3 = { week: 3, score: 7, total: 7, answers: [] };
    expect(quizStatus(on('2026-11-24'), [w3, w4])).toEqual({ kind: 'done', week: 4, result: w4 });
  });
});

describe('the quiz’s rewards', () => {
  const badge = (code: string, criterion: Badge['criterion'], threshold: number): Badge => ({
    id: code, code, name: code, description: '', criterion, threshold, position: 1,
  });
  const badges = [
    badge('first_quiz', 'quizzes_done', 1),
    badge('all_quizzes', 'quizzes_done', 4),
    badge('perfect_quiz', 'perfect_quizzes', 1),
    badge('first_log', 'days_logged', 1),
  ];

  it('counts quizzes taken and quizzes fully right', () => {
    expect(quizStats([{ score: 7, total: 7 }, { score: 5, total: 7 }])).toEqual({ quizzesDone: 2, perfectQuizzes: 1 });
    expect(valueFor({ ...NO_STATS, quizzesDone: 3 }, 'quizzes_done')).toBe(3);
  });

  it('celebrates exactly the badges an attempt has just earned', () => {
    const before = { ...NO_STATS };
    expect(newlyEarned(badges, before, { ...NO_STATS, ...quizStats([{ score: 7, total: 7 }]) }).map((b) => b.code))
      .toEqual(['first_quiz', 'perfect_quiz']);
    expect(newlyEarned(badges, before, { ...NO_STATS, ...quizStats([{ score: 4, total: 7 }]) }).map((b) => b.code))
      .toEqual(['first_quiz']);
    // A retake of a week already taken earns nothing new for taking it.
    const one = { ...NO_STATS, ...quizStats([{ score: 4, total: 7 }]) };
    expect(newlyEarned(badges, one, one)).toEqual([]);
  });
});
