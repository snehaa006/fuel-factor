import { JOIN_CODE_LENGTH, SCHEME, inviteMessage, inviteUrl, normaliseCode } from '@/lib/invite';

describe('normaliseCode', () => {
  it('tidies what a squad actually types', () => {
    expect(normaliseCode(' fuel01 ')).toBe('FUEL01');
    expect(normaliseCode('fuel-01')).toBe('FUEL01');
  });

  it('takes the code out of a pasted link', () => {
    // A squad forwards the whole message and pastes the whole thing, rather
    // than selecting six characters out of the middle of it.
    expect(normaliseCode('fuelfactor://join/ABC234')).toBe('ABC234');
    expect(normaliseCode('https://example.test/join/abc234?utm=x')).toBe('ABC234');
    expect(normaliseCode('Join Jakarta U16: fuelfactor://join/ABC234')).toBe('ABC234');
  });

  it('is empty for nothing, rather than guessing', () => {
    expect(normaliseCode('')).toBe('');
    expect(normaliseCode('   ')).toBe('');
  });
});

describe('inviteUrl', () => {
  it('uses the scheme app.json registers', () => {
    // Changing the scheme breaks every link already sent, so it is pinned here
    // as well as in app.json.
    expect(SCHEME).toBe('fuelfactor');
    expect(inviteUrl('ABC234')).toBe('fuelfactor://join/ABC234');
  });

  it('normalises on the way in, so a sloppy code still makes a valid link', () => {
    expect(inviteUrl(' abc234 ')).toBe('fuelfactor://join/ABC234');
  });
});

describe('inviteMessage', () => {
  const message = inviteMessage('Jakarta U16', 'abc234');

  it('names the team', () => {
    expect(message).toContain('Jakarta U16');
  });

  it('carries the code in words as well as the link', () => {
    // A custom scheme only opens if the app is installed, and there is no
    // https fallback because the web build is deployed nowhere. Without the
    // code in the text, a phone without the app gets a dead message.
    expect(message).toContain('fuelfactor://join/ABC234');
    expect(message).toContain('ABC234');
    expect(message).toMatch(/if that link does not open/i);
  });

  it('says nothing about food, weight or nutrition', () => {
    // The least controllable text the app produces: it gets forwarded around a
    // squad group chat, so it carries no claim the programme has not made.
    for (const word of ['weight', 'calorie', 'diet', 'carb', 'protein', 'fat', 'healthy', 'eat']) {
      expect(`${word}: absent`).toBe(
        message.toLowerCase().includes(word) ? `${word}: PRESENT` : `${word}: absent`
      );
    }
  });

  it('expects the length the database generates', () => {
    expect(JOIN_CODE_LENGTH).toBe(6);
  });
});
