import {
  displayTime,
  formatTime,
  hasSession,
  NO_SESSION,
  nowMinutes,
  parseTime,
  withEnd,
  withStart,
} from '@/lib/session';

describe('reading a time off the column', () => {
  it('parses what Postgres hands back for a time', () => {
    expect(parseTime('16:30:00')).toBe(16 * 60 + 30);
  });

  it('parses one without seconds', () => {
    expect(parseTime('09:05')).toBe(9 * 60 + 5);
  });

  it('keeps null as null, because not set is not midnight', () => {
    expect(parseTime(null)).toBeNull();
  });

  it('refuses something that is not a time rather than guessing', () => {
    expect(parseTime('soon')).toBeNull();
    expect(parseTime('')).toBeNull();
  });

  it('refuses an hour outside the day', () => {
    expect(parseTime('25:00:00')).toBeNull();
  });
});

describe('writing a time back', () => {
  it('pads to the column format', () => {
    expect(formatTime(9 * 60 + 5)).toBe('09:05:00');
  });

  it('writes null for a time that was never set', () => {
    expect(formatTime(null)).toBeNull();
  });

  it('survives a round trip', () => {
    expect(parseTime(formatTime(16 * 60 + 45))).toBe(16 * 60 + 45);
  });
});

describe('showing a time', () => {
  it('shows HH:MM', () => {
    expect(displayTime(18 * 60)).toBe('18:00');
  });

  it('shows a blank for a time that is not set', () => {
    expect(displayTime(null)).toBe('--:--');
  });
});

describe('the device clock', () => {
  it('reads the local wall clock as minutes', () => {
    const at = new Date(2026, 9, 31, 16, 30);
    expect(nowMinutes(at)).toBe(16 * 60 + 30);
  });
});

describe('editing a session', () => {
  const afternoon = { startsAt: 16 * 60 + 30, endsAt: 18 * 60 };

  it('sets a start', () => {
    expect(withStart(NO_SESSION, 16 * 60).startsAt).toBe(16 * 60);
  });

  it('sets an end after the start', () => {
    expect(withEnd({ startsAt: 16 * 60, endsAt: null }, 17 * 60).endsAt).toBe(17 * 60);
  });

  it('refuses an end at or before the start, which the column refuses too', () => {
    // The check constraint would reject it, so the screen never offers it.
    expect(withEnd(afternoon, 16 * 60).endsAt).toBe(18 * 60);
    expect(withEnd(afternoon, 16 * 60 + 30).endsAt).toBe(18 * 60);
  });

  it('clears an end that a later start has overtaken', () => {
    // The athlete said when it starts, so that is the value to keep; the end
    // goes rather than being silently shuffled to some other time.
    expect(withStart(afternoon, 19 * 60)).toEqual({ startsAt: 19 * 60, endsAt: null });
  });

  it('keeps an end the new start still precedes', () => {
    expect(withStart(afternoon, 17 * 60)).toEqual({ startsAt: 17 * 60, endsAt: 18 * 60 });
  });

  it('lets an end stand with no start, because the refuel rule needs only the end', () => {
    expect(withEnd(NO_SESSION, 18 * 60)).toEqual({ startsAt: null, endsAt: 18 * 60 });
  });

  it('knows when nothing has been set', () => {
    expect(hasSession(NO_SESSION)).toBe(false);
    expect(hasSession({ startsAt: 16 * 60, endsAt: null })).toBe(true);
    expect(hasSession({ startsAt: null, endsAt: 18 * 60 })).toBe(true);
  });
});
