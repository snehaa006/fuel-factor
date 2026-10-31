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

/** The same, as a real Error, for throwing on. */
export function asError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(messageOf(thrown));
}
