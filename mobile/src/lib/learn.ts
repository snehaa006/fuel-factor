import { asError } from './errors';
import { supabase } from './supabase';
import type { Tables } from './database.types';

/**
 * The Learn section: the programme's four weeks.
 *
 * The app authors none of this. Every card and every point is a row seeded
 * from the week's own deck, which is why weeks 2 to 4 need no code -- they
 * need rows. A week with no rows is locked, and the app says so rather than
 * filling the gap with a summary of what carbohydrates probably are.
 */

/** The programme runs four weeks with one theme each. That was settled on the call. */
export const WEEK_COUNT = 4;

/**
 * The card shapes the screen can draw.
 *
 * A row whose kind is not here is dropped rather than rendered as a guess:
 * a new kind means new teaching material that wants a considered layout, not
 * a paragraph of text in the wrong place.
 */
export const CARD_KINDS = [
  'intro',
  'stats',
  'myth_fact',
  'process',
  'timeline',
  'timing',
  'targets',
  'foods',
  'challenge',
  'references',
] as const;

export type CardKind = (typeof CARD_KINDS)[number];

export type LessonPoint = Pick<Tables<'lesson_points'>, 'label' | 'value' | 'detail'> & {
  id: string;
};

export type LessonCard = {
  id: string;
  kind: CardKind;
  heading: string | null;
  body: string | null;
  sourceNote: string | null;
  points: LessonPoint[];
};

export type Week = {
  weekNumber: number;
  /** Null while the programme has not written this week. */
  theme: string | null;
  challenge: string | null;
  challengeId: string | null;
  /** A week with no cards is locked, and nothing about it is invented. */
  unlocked: boolean;
};

export function isCardKind(value: string): value is CardKind {
  return (CARD_KINDS as readonly string[]).includes(value);
}

type CardRow = Tables<'lesson_cards'> & { lesson_points: Tables<'lesson_points'>[] };

/**
 * Turn the rows into cards, in the deck's order.
 *
 * Exported so the screen can be tested without a network, and so the drop
 * rule for an unknown kind is testable on its own.
 */
export function toCards(rows: CardRow[]): LessonCard[] {
  return rows
    .filter((row) => isCardKind(row.kind))
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      kind: row.kind as CardKind,
      heading: row.heading,
      body: row.body,
      sourceNote: row.source_note,
      points: [...(row.lesson_points ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({ id: p.id, label: p.label, value: p.value, detail: p.detail })),
    }));
}

/**
 * The four weeks, with the ones the programme has written marked unlocked.
 *
 * Locked is derived from there being no cards, not from a flag someone has to
 * remember to flip: seeding week 2 unlocks week 2.
 */
export function toWeeks(
  challenges: Pick<Tables<'weekly_challenges'>, 'id' | 'week_number' | 'theme' | 'challenge'>[],
  weeksWithCards: number[]
): Week[] {
  const byWeek = new Map(challenges.map((c) => [c.week_number, c]));
  const unlocked = new Set(weeksWithCards);

  return Array.from({ length: WEEK_COUNT }, (_, i) => {
    const weekNumber = i + 1;
    const challenge = byWeek.get(weekNumber);
    return {
      weekNumber,
      theme: challenge?.theme ?? null,
      challenge: challenge?.challenge ?? null,
      challengeId: challenge?.id ?? null,
      unlocked: unlocked.has(weekNumber),
    };
  });
}

export async function fetchWeeks(): Promise<Week[]> {
  const [challenges, cards] = await Promise.all([
    supabase.from('weekly_challenges').select('id, week_number, theme, challenge'),
    supabase.from('lesson_cards').select('week_number'),
  ]);

  if (challenges.error) throw asError(challenges.error);
  if (cards.error) throw asError(cards.error);

  return toWeeks(challenges.data ?? [], (cards.data ?? []).map((c) => c.week_number));
}

export type WeekDetail = {
  week: Week;
  cards: LessonCard[];
  /** The date this athlete last marked the challenge done, if ever. */
  completedOn: string | null;
};

export async function fetchWeek(weekNumber: number): Promise<WeekDetail | null> {
  const [weeks, cardRows] = await Promise.all([
    fetchWeeks(),
    supabase
      .from('lesson_cards')
      .select('*, lesson_points(*)')
      .eq('week_number', weekNumber)
      .returns<CardRow[]>(),
  ]);

  if (cardRows.error) throw asError(cardRows.error);

  const week = weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;

  let completedOn: string | null = null;
  if (week.challengeId) {
    // Row level security answers "whose completion": a caller cannot ask for
    // somebody else's.
    const { data, error } = await supabase
      .from('challenge_completions')
      .select('completed_on')
      .eq('challenge_id', week.challengeId)
      .order('completed_on', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw asError(error);
    completedOn = data?.completed_on ?? null;
  }

  return { week, cards: toCards(cardRows.data ?? []), completedOn };
}

/**
 * Mark the week's challenge done today.
 *
 * Completion is engagement, not nutrition: it records that the athlete says
 * they did it, and grades nothing. The unique constraint on
 * (challenge, participant, day) makes a second tap on the same day a no-op
 * rather than a duplicate.
 */
export async function completeChallenge(
  challengeId: string,
  participantId: string,
  on: string
): Promise<void> {
  const { error } = await supabase
    .from('challenge_completions')
    .upsert(
      { challenge_id: challengeId, participant_id: participantId, completed_on: on },
      { onConflict: 'challenge_id,participant_id,completed_on' }
    );

  if (error) throw asError(error);
}

/** Undo today's completion, because a mis-tap should not be permanent. */
export async function undoChallenge(
  challengeId: string,
  participantId: string,
  on: string
): Promise<void> {
  const { error } = await supabase
    .from('challenge_completions')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('participant_id', participantId)
    .eq('completed_on', on);

  if (error) throw asError(error);
}
