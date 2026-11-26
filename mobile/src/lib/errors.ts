/**
 * Turning whatever was thrown into something a person can read.
 *
 * Supabase rejects with a plain object -- `{ message, code, details, hint }` --
 * not an Error. `e instanceof Error` is false for it and `String(e)` gives
 * "[object Object]", which is what an athlete would otherwise be shown when a
 * team code lookup fails.
 */

type MessageLike = { message?: unknown; error_description?: unknown; details?: unknown };

export function messageOf(thrown: unknown): string {
  if (thrown instanceof Error) return thrown.message;
  if (typeof thrown === 'string') return thrown;

  if (thrown !== null && typeof thrown === 'object') {
    const e = thrown as MessageLike;
    for (const field of [e.message, e.error_description, e.details]) {
      if (typeof field === 'string' && field.length > 0) return field;
    }
  }

  return 'Something went wrong.';
}

/**
 * A message in the athlete's language where the dictionary knows it.
 *
 * The server answers in English -- Supabase Auth's "Invalid login
 * credentials", the database's own `raise exception` text -- and on the
 * sign-in screen that is the first thing a squad member who chose Bahasa
 * would read. Known messages are looked up by their exact text; anything the
 * dictionary does not know is shown exactly as it came, because a guessed
 * translation of an error is worse than the real one.
 */
export function localised(message: string, t: { errors: Record<string, string> }): string {
  return t.errors[message.trim().toLowerCase()] ?? message;
}

/** The same, as a real Error, for throwing on. */
export function asError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(messageOf(thrown));
}
