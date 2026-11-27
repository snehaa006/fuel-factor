import type { LessonCard } from './learn';
import type { ProgrammeState } from './programme';
import type { IsoDate } from './streak';

/**
 * Learn, run week by week -- what was asked for on the 25 November call.
 *
 * Sofia: "can the learning section be in tandem with the week that the
 * athlete is on? Because it has to be customized to that particular week of
 * what he's learning." Theo: a check "before they move on to the next week ...
 * to ensure they actually learn", and "fun facts so they can just read it on
 * the side, so it's not too overwhelming". Sofia again: "maybe it could be a
 * toggle that they can click in, did you know, or fact for the day."
 *
 * **Nothing here writes a word of nutrition.** The fact of the day is one of
 * the week's own statistic cards, figure and caption exactly as the deck
 * prints them. The check is built from the same cards: "which figure goes
 * with this caption" across a card's own figures, and "myth or fact" on the
 * deck's own myth, answered by the deck's own fact. The app supplies the
 * question's frame and the order, never the content or the answer.
 *
 * Pure, and free of the Supabase client, so Today can use it and a test can
 * hold all of it without a network.
 */

const WEEK_COUNT = 4;
const DAYS_PER_WEEK = 7;

function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Which weeks are open

/**
 * Where a week stands for this athlete today.
 *
 * - `current`: the programme is in this week. Learn opens on it.
 * - `past`: done, and still there to re-read. Sneha's "if the current week is
 *   week two, it should show week two" is about what leads, not about taking
 *   week 1 away from somebody who wants to look something up.
 * - `future`: not yet, with the day it opens.
 * - `open`: there is no programme to follow -- a coach, or a squad with no
 *   first day -- so every written week is simply open.
 */
export type WeekAccess =
  | { state: 'current' }
  | { state: 'past' }
  | { state: 'future'; opensOn: IsoDate }
  | { state: 'open' };

/** The programme week today falls in, 1-based; above 4 once it is over; null with no programme. */
export function weekOfProgramme(programme: ProgrammeState | null): number | null {
  if (programme === null || programme.status === 'no-date') return null;
  if (programme.status === 'before') return 0;
  return Math.floor((programme.day - 1) / DAYS_PER_WEEK) + 1;
}

/** Day 1 to 7 of the programme week; null with no programme open. */
export function dayOfWeek(programme: ProgrammeState | null): number | null {
  if (programme === null || programme.status !== 'open') return null;
  return ((programme.day - 1) % DAYS_PER_WEEK) + 1;
}

export function weekAccess(weekNumber: number, programme: ProgrammeState | null): WeekAccess {
  const current = weekOfProgramme(programme);
  if (current === null || programme === null || programme.status === 'no-date') {
    return { state: 'open' };
  }
  if (current > WEEK_COUNT) return { state: 'past' };
  if (weekNumber < current) return { state: 'past' };
  if (weekNumber === current) return { state: 'current' };
  return { state: 'future', opensOn: addDays(programme.startsOn, (weekNumber - 1) * DAYS_PER_WEEK) };
}

/** Whether the athlete may read a week today. */
export function canRead(access: WeekAccess): boolean {
  return access.state !== 'future';
}

// ---------------------------------------------------------------------------
// Did you know

export type Fact = {
  /** The figure, as the deck prints it: "60–70%". */
  value: string;
  /** Its caption, as the deck prints it. */
  label: string;
  /** The card it came from, so the athlete can find it in the lesson. */
  heading: string | null;
  week: number;
};

/** Every statistic in a week's cards, in the deck's order. */
export function factsFrom(cards: LessonCard[], week: number): Fact[] {
  return cards
    .filter((card) => card.kind === 'stats')
    .flatMap((card) =>
      card.points
        .filter((p) => (p.value ?? '').trim() !== '' && (p.label ?? '').trim() !== '')
        .map((p) => ({ value: p.value as string, label: p.label as string, heading: card.heading, week }))
    );
}

/**
 * Today's fact: the week's statistics in turn, one a day.
 *
 * Keyed on the programme day rather than chosen at random, so the whole squad
 * sees the same fact on the same day and can talk about it, and a reload does
 * not change it.
 */
export function factFor(facts: Fact[], programmeDay: number): Fact | null {
  if (facts.length === 0) return null;
  const index = (((programmeDay - 1) % facts.length) + facts.length) % facts.length;
  return facts[index];
}

// ---------------------------------------------------------------------------
// The week check

export type Question =
  | {
      kind: 'figure';
      id: string;
      /** The deck's caption. The athlete picks the figure that goes with it. */
      prompt: string;
      choices: string[];
      answer: string;
      /** The card's heading, shown with the answer. */
      heading: string | null;
    }
  | {
      kind: 'myth';
      id: string;
      /** The deck's own quotation of the myth. */
      prompt: string;
      answer: 'myth';
      /** The deck's own fact, shown once answered. */
      explanation: string;
      heading: string | null;
    };

/** The most questions a check asks. Short enough to finish standing up. */
export const MAX_QUESTIONS = 5;
/** The most figures offered as choices. A card with eight is cut to four. */
const MAX_CHOICES = 4;

/** The quoted claim a myth starts with, or null when the deck did not quote one. */
export function quotedMyth(detail: string | null): string | null {
  const match = /^\s*["“]([^"”]{8,})["”]/.exec(detail ?? '');
  return match ? match[1].trim() : null;
}

/**
 * Rotate the choices so the right one is not always where the deck put it.
 * Deterministic, so the same week's check is the same check twice.
 */
function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items;
  const k = ((by % items.length) + items.length) % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

/** Up to {@link MAX_CHOICES} of a card's figures, always including the answer. */
function choicesFor(values: string[], answerIndex: number): string[] {
  if (values.length <= MAX_CHOICES) return values;
  const others = values.filter((_, i) => i !== answerIndex);
  const picked = rotate(others, answerIndex).slice(0, MAX_CHOICES - 1);
  return [values[answerIndex], ...picked];
}

/**
 * A week's check, from its own cards.
 *
 * One myth-or-fact where the deck sets a myth against a fact in so many
 * words (weeks 1 and 2 do), then "which figure" questions taken a card at a
 * time so they spread across the lesson instead of all coming from its first
 * card. A card needs at least two distinct figures to ask from, or the
 * question answers itself.
 */
export function quizFor(cards: LessonCard[], week: number): Question[] {
  const questions: Question[] = [];

  for (const card of cards) {
    if (card.kind !== 'myth_fact') continue;
    const myth = card.points.find((p) => (p.label ?? '').toUpperCase().includes('MYTH'));
    const fact = card.points.find((p) => (p.label ?? '').toUpperCase().includes('FACT'));
    const prompt = quotedMyth(myth?.detail ?? null);
    if (prompt === null || !fact?.detail) continue;
    questions.push({
      kind: 'myth',
      id: `w${week}-myth-${card.id}`,
      prompt,
      answer: 'myth',
      explanation: fact.detail,
      heading: card.heading,
    });
  }

  const perCard = cards
    .filter((card) => card.kind === 'stats')
    .map((card) => {
      const points = card.points.filter(
        (p) => (p.value ?? '').trim() !== '' && (p.label ?? '').trim() !== ''
      );
      const values = points.map((p) => p.value as string);
      if (new Set(values).size < 2) return [];
      return points.map<Question>((p, i) => ({
        kind: 'figure',
        id: `w${week}-figure-${card.id}-${i}`,
        prompt: p.label as string,
        choices: rotate(choicesFor(values, i), i * 2 + 1),
        answer: p.value as string,
        heading: card.heading,
      }));
    })
    .filter((list) => list.length > 0);

  // Round-robin across the cards: the first figure of each, then the second.
  for (let round = 0; questions.length < MAX_QUESTIONS; round += 1) {
    let added = false;
    for (const list of perCard) {
      if (round < list.length && questions.length < MAX_QUESTIONS) {
        questions.push(list[round]);
        added = true;
      }
    }
    if (!added) break;
  }

  return questions.slice(0, MAX_QUESTIONS);
}

/** Whether an answer is the deck's. */
export function isRight(question: Question, answer: string): boolean {
  return answer === question.answer;
}

// ---------------------------------------------------------------------------
// When to ask

/**
 * The week whose check Today should offer, or null.
 *
 * Theo's "before they move on to the next week": a week's check is offered
 * from its sixth day, and stays on offer through the following week until it
 * is done. Once the programme is over, week 4's waits the same way.
 */
export function weekToCheck(
  programme: ProgrammeState | null,
  done: (week: number) => boolean,
  writtenWeeks: number[]
): number | null {
  const current = weekOfProgramme(programme);
  const day = dayOfWeek(programme);
  if (current === null || current < 1 || day === null) return null;

  const candidates =
    current > WEEK_COUNT
      ? [WEEK_COUNT]
      : day >= 6
        ? [current, current - 1]
        : [current - 1];

  return (
    candidates.find((week) => week >= 1 && writtenWeeks.includes(week) && !done(week)) ?? null
  );
}
