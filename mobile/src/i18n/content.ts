import type { LessonCard } from '@/lib/learn';
import { useLanguage, type Language } from '@/lib/preferences';

import { CONTENT_ID } from './content-id';

/**
 * The programme's content in the athlete's language: the Bahasa from
 * `content-id.ts` when they picked Bahasa and there is one, the database's
 * English otherwise. For display only -- never for what is written back.
 */
export function contentIn(text: string, language: Language): string;
export function contentIn(text: string | null, language: Language): string | null;
export function contentIn(text: string | null, language: Language): string | null {
  if (text === null || language !== 'id') return text;
  return CONTENT_ID[text] ?? text;
}

/** A whole lesson card, heading, body and points, in the athlete's language. */
export function cardIn(card: LessonCard, language: Language): LessonCard {
  if (language !== 'id') return card;
  return {
    ...card,
    heading: contentIn(card.heading, language),
    body: contentIn(card.body, language),
    points: card.points.map((p) => ({
      ...p,
      label: contentIn(p.label, language),
      value: contentIn(p.value, language),
      detail: contentIn(p.detail, language),
    })),
  };
}

/** `content(text)`: the programme's text as this athlete should read it. */
export function useContent(): (text: string | null) => string | null {
  const language = useLanguage();
  return (text) => contentIn(text, language);
}
