import { DEMO_LESSON_CARDS, DEMO_LESSON_CARDS_WEEK2 } from '@/lib/__fixtures__/today';
import { programmeState } from '@/lib/programme';
import {
  canRead,
  dayOfWeek,
  factFor,
  factsFrom,
  isRight,
  MAX_QUESTIONS,
  quizFor,
  quotedMyth,
  weekAccess,
  weekOfProgramme,
  weekToCheck,
} from '@/lib/weekly';

const START = '2026-10-28';
const on = (today: string) => programmeState(START, today);

describe('which week the programme is in', () => {
  it('counts seven days to a week from day one', () => {
    expect(weekOfProgramme(on('2026-10-28'))).toBe(1);
    expect(weekOfProgramme(on('2026-11-03'))).toBe(1); // day 7
    expect(weekOfProgramme(on('2026-11-04'))).toBe(2); // day 8
    expect(weekOfProgramme(on('2026-11-24'))).toBe(4); // day 28, the last
    expect(weekOfProgramme(on('2026-11-25'))).toBe(5); // over
  });

  it('knows the day of the week, one to seven', () => {
    expect(dayOfWeek(on('2026-10-28'))).toBe(1);
    expect(dayOfWeek(on('2026-11-03'))).toBe(7);
    expect(dayOfWeek(on('2026-11-04'))).toBe(1);
  });

  it('has no week before the start, and none without a programme', () => {
    expect(weekOfProgramme(on('2026-10-20'))).toBe(0);
    expect(weekOfProgramme(programmeState(null, '2026-11-01'))).toBeNull();
    expect(weekOfProgramme(null)).toBeNull();
  });
});

describe('Learn follows the week', () => {
  /** Sofia: "in tandem with the week that the athlete is on". */
  it('leads with the current week and keeps the earlier ones open', () => {
    const week2 = on('2026-11-06');
    expect(weekAccess(2, week2)).toEqual({ state: 'current' });
    expect(weekAccess(1, week2)).toEqual({ state: 'past' });
    expect(canRead(weekAccess(1, week2))).toBe(true);
  });

  it('locks a later week and says the day it opens', () => {
    const week2 = on('2026-11-06');
    expect(weekAccess(3, week2)).toEqual({ state: 'future', opensOn: '2026-11-11' });
    expect(weekAccess(4, week2)).toEqual({ state: 'future', opensOn: '2026-11-18' });
    expect(canRead(weekAccess(3, week2))).toBe(false);
  });

  it('opens week 2 on its first morning, not before', () => {
    expect(canRead(weekAccess(2, on('2026-11-03')))).toBe(false);
    expect(canRead(weekAccess(2, on('2026-11-04')))).toBe(true);
  });

  it('opens everything once the programme is over', () => {
    const after = on('2026-12-02');
    for (const week of [1, 2, 3, 4]) expect(weekAccess(week, after)).toEqual({ state: 'past' });
  });

  it('opens everything when there is no programme to follow', () => {
    // A coach, or a squad with no first day.
    for (const week of [1, 2, 3, 4]) {
      expect(weekAccess(week, null)).toEqual({ state: 'open' });
      expect(weekAccess(week, programmeState(null, '2026-11-01'))).toEqual({ state: 'open' });
    }
  });
});

describe('did you know', () => {
  const facts = factsFrom(DEMO_LESSON_CARDS, 1);

  it('is the deck’s own statistic, figure and caption unchanged', () => {
    expect(facts[0]).toEqual({
      value: '60–70%',
      label: 'Of energy during team sports comes from carbohydrates',
      heading: 'Why it matters',
      week: 1,
    });
  });

  it('takes statistics only, not the timeline or the targets', () => {
    // The glycogen timeline and the target bands carry figures too, but they
    // are a sequence and a prescription, not a fact to read on its own.
    expect(facts).toHaveLength(4);
    expect(facts.map((f) => f.value)).not.toContain('~60%');
    expect(facts.map((f) => f.value)).not.toContain('350–490g');
  });

  it('is the same fact all day, for the whole squad', () => {
    expect(factFor(facts, 3)).toBe(factFor(facts, 3));
  });

  it('moves on a day at a time and comes round again', () => {
    expect(factFor(facts, 1)?.value).toBe('60–70%');
    expect(factFor(facts, 2)?.value).toBe('2%');
    expect(factFor(facts, 5)?.value).toBe('60–70%');
  });

  it('says nothing when the week has no statistics', () => {
    expect(factFor([], 1)).toBeNull();
  });
});

describe('the week check', () => {
  const week1 = quizFor(DEMO_LESSON_CARDS, 1);
  const week2 = quizFor(DEMO_LESSON_CARDS_WEEK2, 2);

  it('asks a handful, not the whole lesson', () => {
    expect(week1.length).toBeGreaterThanOrEqual(3);
    expect(week1.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(week2.length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });

  it('asks the deck’s own myth, and answers with the deck’s own fact', () => {
    const myth = week1.find((q) => q.kind === 'myth');
    expect(myth).toMatchObject({
      prompt: 'Carbs make you fat. Athletes should eat mostly protein.',
      answer: 'myth',
    });
    expect(myth?.kind === 'myth' && myth.explanation).toMatch(/^Carbohydrates are stored as glycogen/);
  });

  it('asks which figure goes with a caption, offering only that card’s figures', () => {
    const card = DEMO_LESSON_CARDS.find((c) => c.kind === 'stats')!;
    const values = card.points.map((p) => p.value);
    const figures = week1.filter((q) => q.kind === 'figure');
    expect(figures.length).toBeGreaterThan(0);
    for (const q of figures) {
      if (q.kind !== 'figure') continue;
      expect(q.choices).toContain(q.answer);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices.length).toBeLessThanOrEqual(4);
      // Nothing offered that the deck did not print.
      for (const choice of q.choices) expect(values).toContain(choice);
      // The caption is the deck's, and its own figure is the answer.
      expect(card.points.find((p) => p.label === q.prompt)?.value).toBe(q.answer);
    }
  });

  it('does not always put the right figure where the deck put it', () => {
    const figures = week1.filter((q) => q.kind === 'figure');
    const positions = figures.map((q) => (q.kind === 'figure' ? q.choices.indexOf(q.answer) : -1));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it('spreads across a week’s statistic cards', () => {
    // Week 2 has two: "Why it matters" and "The Calorie Gap".
    const headings = new Set(week2.filter((q) => q.kind === 'figure').map((q) => q.heading));
    expect(headings.size).toBe(2);
  });

  it('is the same check twice', () => {
    expect(quizFor(DEMO_LESSON_CARDS, 1)).toEqual(week1);
  });

  it('marks only the deck’s answer right', () => {
    const q = week1.find((x) => x.kind === 'figure')!;
    expect(isRight(q, q.answer)).toBe(true);
    const wrong = q.kind === 'figure' ? q.choices.find((c) => c !== q.answer)! : 'fact';
    expect(isRight(q, wrong)).toBe(false);
  });

  it('skips a myth the deck did not quote, rather than paraphrasing it', () => {
    expect(quotedMyth('"Carbs make you fat." More words.')).toBe('Carbs make you fat.');
    expect(quotedMyth('No quotation here.')).toBeNull();
    expect(quotedMyth(null)).toBeNull();
  });

  it('asks nothing of a week without statistics or a myth', () => {
    expect(quizFor(DEMO_LESSON_CARDS.filter((c) => c.kind === 'intro'), 1)).toEqual([]);
  });
});

describe('when the check is offered', () => {
  const written = [1, 2, 3, 4];
  const none = () => false;

  it('offers last week’s check at the start of the next week', () => {
    // Theo: "before they move on to the next week".
    expect(weekToCheck(on('2026-11-05'), none, written)).toBe(1); // week 2, day 2
  });

  it('offers this week’s check from its sixth day', () => {
    expect(weekToCheck(on('2026-11-02'), none, written)).toBe(1); // week 1, day 6
    expect(weekToCheck(on('2026-10-30'), none, written)).toBeNull(); // week 1, day 3
  });

  it('keeps last week’s on offer until it is done', () => {
    const doneWeek2 = (w: number) => w === 2;
    // Week 2, day 6: week 2's is done, week 1's is not.
    expect(weekToCheck(on('2026-11-09'), doneWeek2, written)).toBe(1);
  });

  it('stops once it is done', () => {
    expect(weekToCheck(on('2026-11-05'), (w) => w === 1, written)).toBeNull();
  });

  it('offers week 4’s after the programme ends', () => {
    expect(weekToCheck(on('2026-11-30'), none, written)).toBe(4);
  });

  it('never offers a week the programme has not written', () => {
    expect(weekToCheck(on('2026-11-05'), none, [2, 3, 4])).toBeNull();
  });

  it('offers nothing before day one or without a programme', () => {
    expect(weekToCheck(on('2026-10-20'), none, written)).toBeNull();
    expect(weekToCheck(null, none, written)).toBeNull();
  });
});
