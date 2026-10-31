import { isCardKind, toCards, toWeeks, WEEK_COUNT } from '@/lib/learn';

const CREATED = '2026-10-31T00:00:00Z';

function point(position: number, over: Record<string, unknown> = {}) {
  return {
    id: `p${position}`,
    card_id: 'c1',
    position,
    label: null,
    value: null,
    detail: null,
    created_at: CREATED,
    ...over,
  };
}

function card(position: number, kind: string, over: Record<string, unknown> = {}) {
  return {
    id: `c${position}`,
    week_number: 1,
    position,
    kind,
    heading: null,
    body: null,
    source_note: null,
    source: 'week-1-deck',
    created_at: CREATED,
    lesson_points: [],
    ...over,
  };
}

describe('the week’s cards', () => {
  it('keeps the deck’s order whatever order the rows arrive in', () => {
    const cards = toCards([card(3, 'myth_fact'), card(1, 'intro'), card(2, 'stats')] as never);
    expect(cards.map((c) => c.kind)).toEqual(['intro', 'stats', 'myth_fact']);
  });

  it('orders the points inside a card too', () => {
    const cards = toCards([
      card(1, 'stats', { lesson_points: [point(2, { value: 'b' }), point(1, { value: 'a' })] }),
    ] as never);
    expect(cards[0].points.map((p) => p.value)).toEqual(['a', 'b']);
  });

  it('drops a kind the app cannot draw rather than guessing a layout', () => {
    // A new kind means new teaching material that wants a considered layout,
    // not a paragraph rendered in the wrong shape.
    const cards = toCards([card(1, 'intro'), card(2, 'interactive_quiz')] as never);
    expect(cards.map((c) => c.kind)).toEqual(['intro']);
  });

  it('carries the citation the deck prints under a figure', () => {
    const cards = toCards([card(1, 'timeline', { source_note: 'Bangsbo et al. (1994)' })] as never);
    expect(cards[0].sourceNote).toBe('Bangsbo et al. (1994)');
  });

  it('survives a card with no points', () => {
    expect(toCards([card(1, 'foods')] as never)[0].points).toEqual([]);
  });

  it('recognises only the kinds the deck uses', () => {
    expect(isCardKind('timeline')).toBe(true);
    expect(isCardKind('protein_chart')).toBe(false);
  });
});

describe('the four weeks', () => {
  const week1 = {
    id: 'ch1',
    week_number: 1,
    theme: 'Carbohydrates',
    challenge: 'Add one carb to every meal',
  };

  it('always offers four, because the programme is four weeks', () => {
    expect(toWeeks([], [])).toHaveLength(WEEK_COUNT);
  });

  it('unlocks a week that has cards', () => {
    const weeks = toWeeks([week1], [1]);
    expect(weeks[0].unlocked).toBe(true);
    expect(weeks[0].theme).toBe('Carbohydrates');
  });

  it('locks a week with no cards', () => {
    expect(toWeeks([week1], [1])[1].unlocked).toBe(false);
  });

  it('invents no theme for a week the programme has not written', () => {
    // No "coming soon: protein". The app does not know and does not say.
    const weeks = toWeeks([week1], [1]);
    expect(weeks.slice(1).map((w) => w.theme)).toEqual([null, null, null]);
    expect(weeks.slice(1).map((w) => w.challenge)).toEqual([null, null, null]);
  });

  it('locks a week that has a challenge row but no cards yet', () => {
    // A theme without material is not something to open.
    const week2 = { id: 'ch2', week_number: 2, theme: 'Hydration', challenge: 'Drink up' };
    expect(toWeeks([week1, week2], [1])[1].unlocked).toBe(false);
  });

  it('unlocks from the cards alone, so seeding a week is all it takes', () => {
    const week2 = { id: 'ch2', week_number: 2, theme: 'Hydration', challenge: 'Drink up' };
    expect(toWeeks([week1, week2], [1, 2])[1].unlocked).toBe(true);
  });

  it('carries the challenge id, which is what a completion points at', () => {
    expect(toWeeks([week1], [1])[0].challengeId).toBe('ch1');
  });
});
