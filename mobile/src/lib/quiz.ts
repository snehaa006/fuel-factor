import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { asError, messageOf } from './errors';
import type { ProgrammeState } from './programme';
import { supabase } from './supabase';
import type { IsoDate } from './streak';
import { dayOfWeek, weekOfProgramme } from './weekly';
import type { TablesInsert } from './database.types';

/**
 * The mini quiz: one question for each day's fun fact, at the end of the week.
 *
 * Theo, 25 November: "a survey or quiz before they move on to the next week
 * ... to ensure that they actually learn." The week's lesson comes as seven
 * daily facts (`daily-facts.ts`); the quiz asks one question on each, so a
 * score of 5/7 says which two parts did not stick. It opens on the week's
 * seventh day, once every fact has been shown, and stays open. The latest
 * attempt is kept in `quiz_results`, which the coach can read and export.
 */

export const QUIZ_LENGTH = 7;

export type QuizQuestion = {
  week: number;
  /** Which day's fact it checks: 1 to 7. */
  position: number;
  question: string;
  questionId: string | null;
  options: string[];
  optionsId: string[] | null;
  /** Index of the right option. */
  answer: number;
};

export type QuizResult = { week: number; score: number; total: number; answers: number[] };

// ---------------------------------------------------------------------------
// Pure

/** "A", "B", "C" for 0, 1, 2. */
export function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function scoreOf(questions: QuizQuestion[], answers: (number | null)[]): number {
  return questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
}

/** The positions -- days of the week's lesson -- answered wrongly. */
export function missedDays(questions: QuizQuestion[], answers: (number | null)[]): number[] {
  return questions.filter((q, i) => answers[i] !== q.answer).map((q) => q.position);
}

/** The latest week whose quiz has opened: its seventh day has come. */
export function lastOpenedQuizWeek(programme: ProgrammeState | null): number | null {
  const current = weekOfProgramme(programme);
  const day = dayOfWeek(programme);
  if (current === null || day === null || current < 1) return null;
  if (current > 4) return 4;
  const opened = day >= QUIZ_LENGTH ? current : current - 1;
  return opened >= 1 ? opened : null;
}

/** Whether a given week's quiz is open today. Open everywhere with no programme. */
export function quizOpen(week: number, programme: ProgrammeState | null): boolean {
  if (programme === null || programme.status === 'no-date') return true;
  const opened = lastOpenedQuizWeek(programme);
  return opened !== null && week <= opened;
}

/** The day a week's quiz opens: its seventh. */
export function quizOpensOn(startsOn: IsoDate, week: number): IsoDate {
  return new Date(Date.parse(`${startsOn}T00:00:00Z`) + ((week - 1) * 7 + 6) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export type QuizStatus = { kind: 'due'; week: number } | { kind: 'done'; week: number; result: QuizResult };

/**
 * What Today says about the quiz: the latest opened week's, or the one before
 * it if that is still not taken, as due; otherwise the latest one's score.
 */
export function quizStatus(programme: ProgrammeState | null, results: QuizResult[]): QuizStatus | null {
  const opened = lastOpenedQuizWeek(programme);
  if (opened === null) return null;
  const byWeek = new Map(results.map((r) => [r.week, r]));
  for (const week of [opened, opened - 1]) {
    if (week >= 1 && !byWeek.has(week)) return { kind: 'due', week };
  }
  const latest = byWeek.get(opened);
  return latest ? { kind: 'done', week: opened, result: latest } : null;
}

// ---------------------------------------------------------------------------
// Database

export async function fetchQuiz(week: number): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('week_number, position, question, question_id, options, options_id, answer')
    .eq('week_number', week)
    .order('position');
  if (error) throw asError(error);
  return (data ?? []).map((r) => ({
    week: r.week_number,
    position: r.position,
    question: r.question,
    questionId: r.question_id,
    options: r.options,
    optionsId: r.options_id,
    answer: r.answer,
  }));
}

export async function fetchQuizResults(participantId: string): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('week, score, total, answers')
    .eq('participant_id', participantId);
  if (error) throw asError(error);
  return data ?? [];
}

const listeners = new Set<() => void>();
let version = 0;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const readVersion = () => version;

export async function saveQuizResult(row: TablesInsert<'quiz_results'>): Promise<void> {
  const { error } = await supabase
    .from('quiz_results')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'participant_id,week' });
  if (error) throw asError(error);
  version += 1;
  for (const l of listeners) l();
}

// ---------------------------------------------------------------------------
// Hooks

export type QuizResultsState =
  | { status: 'loading' }
  | { status: 'ready'; results: QuizResult[] }
  // Most likely the table is not on the project: nothing is offered then.
  | { status: 'error' };

export function useQuizResults(participantId: string | null): QuizResultsState {
  const v = useSyncExternalStore(subscribe, readVersion, readVersion);
  const [state, setState] = useState<QuizResultsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    if (participantId === null) return;
    fetchQuizResults(participantId)
      .then((results) => active && setState({ status: 'ready', results }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [participantId, v]);

  return participantId === null ? { status: 'ready', results: [] } : state;
}

export type QuizState =
  | { status: 'loading' }
  | { status: 'ready'; questions: QuizQuestion[] }
  | { status: 'error'; message: string };

export function useQuiz(week: number): QuizState & {
  save: (row: TablesInsert<'quiz_results'>) => Promise<void>;
} {
  const [state, setState] = useState<QuizState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    fetchQuiz(week)
      .then((questions) => active && setState({ status: 'ready', questions }))
      .catch((e) => active && setState({ status: 'error', message: messageOf(e) }));
    return () => {
      active = false;
    };
  }, [week]);

  const save = useCallback((row: TablesInsert<'quiz_results'>) => saveQuizResult(row), []);
  return { ...state, save };
}
