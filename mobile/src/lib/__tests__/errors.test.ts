import { asError, messageOf } from '@/lib/errors';

/** What supabase-js actually rejects with. It is not an Error. */
const postgrestError = {
  message: 'no team with that code',
  code: '22023',
  details: null,
  hint: null,
};

describe('messageOf', () => {
  it('reads a Supabase error, which is a plain object and not an Error', () => {
    // The bug this exists for: `String(postgrestError)` is "[object Object]",
    // and that is what reached the screen when a team code lookup failed.
    expect(messageOf(postgrestError)).toBe('no team with that code');
    expect(String(postgrestError)).toBe('[object Object]');
  });

  it('reads a real Error', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
  });

  it('reads a thrown string', () => {
    expect(messageOf('boom')).toBe('boom');
  });

  it('falls back to an auth error’s description', () => {
    expect(messageOf({ error_description: 'token expired' })).toBe('token expired');
  });

  it('falls back to details when there is no message', () => {
    expect(messageOf({ details: 'constraint violated' })).toBe('constraint violated');
  });

  it('never returns the word undefined, or an object tag', () => {
    for (const thrown of [undefined, null, 42, {}, { message: '' }, { message: 7 }, []]) {
      const text = messageOf(thrown);
      expect(text).toBe('Something went wrong.');
      expect(text).not.toMatch(/undefined|\[object/);
    }
  });
});

describe('asError', () => {
  it('passes a real Error through untouched', () => {
    const original = new Error('boom');
    expect(asError(original)).toBe(original);
  });

  it('wraps a Supabase error so it can be thrown and read', () => {
    const wrapped = asError(postgrestError);
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toBe('no team with that code');
  });
});
