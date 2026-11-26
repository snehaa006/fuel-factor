import { currentLanguage, useLanguage, type Language } from '@/lib/preferences';

import { en, type Strings } from './en';
import { id } from './id';

/**
 * The app's words, in English and Bahasa Indonesia.
 *
 * `en.ts` is the source and `id.ts` is typed against it, so an Indonesian
 * dictionary missing a key -- or carrying one English no longer has -- fails
 * the typecheck rather than showing a blank on a phone.
 *
 * **Only the app's own words are here.** The programme's teaching material
 * (lesson cards, the weekly challenges, the advice sentences) is rows in the
 * database, copied from the decks, and is not translated by the app: a
 * translation of a dietitian's sentence is still a sentence she has not
 * reviewed. `advice_rules.message_id` was in the schema from the start for
 * her Bahasa wording, and a card shows it when it exists.
 *
 * Components read the dictionary with `useStrings()` and pass it on to any
 * helper that builds text. Helpers take it as an argument rather than reading
 * the current language themselves, because the React Compiler memoises a
 * call on its arguments: a helper that looked the language up on its own
 * would keep returning the English it computed first.
 */

const DICTIONARIES: Record<Language, Strings> = { en, id };

export function stringsFor(language: Language): Strings {
  return DICTIONARIES[language];
}

/** The dictionary for the language the app is speaking, re-rendering when it changes. */
export function useStrings(): Strings {
  return DICTIONARIES[useLanguage()];
}

/** Outside a component: tests and anything that runs once. */
export function currentStrings(): Strings {
  return DICTIONARIES[currentLanguage()];
}

export type { Strings };
