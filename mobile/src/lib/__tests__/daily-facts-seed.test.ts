import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { MASCOT_POSES } from '@/components/mascot';

const root = resolve(__dirname, '../../../..');
// SQL's doubled quote reads as one, as the database holds it.
const read = (p: string) => readFileSync(resolve(root, p), 'utf8').replace(/''/g, "'");

const migration = read('supabase/migrations/20261128000001_daily_facts.sql');
const seedSql = readFileSync(resolve(root, 'supabase/seed/0019_daily_facts.sql'), 'utf8');
const seed = seedSql.replace(/''/g, "'");
const lessons: Record<number, string> = {
  1: read('supabase/seed/0006_week1_lessons.sql'),
  2: read('supabase/seed/0012_week2_lessons.sql'),
  3: read('supabase/seed/0013_week3_lessons.sql'),
  4: read('supabase/seed/0014_week4_lessons.sql'),
};

const text = "'((?:[^']|'')+)'";
const unquote = (s: string) => s.replace(/''/g, "'");
const rows = [
  ...seedSql.matchAll(
    new RegExp(`\\((\\d), (\\d), ${text},\\s*${text},\\s*${text},\\s*'(week-\\d-lesson)'\\)`, 'g')
  ),
].map((m) => ({
  week: Number(m[1]),
  day: Number(m[2]),
  topic: unquote(m[3]),
  fact: unquote(m[4]),
  factId: unquote(m[5]),
  source: m[6],
}));

/** Every figure in a sentence: "1,500–2,000", "80–90", "1.6–2.2", "400". */
const figures = (text: string) =>
  [...text.matchAll(/\d[\d.,–]*/g)].map((m) => m[0].replace(/[.,–]+$/, ''));

/** The words as the app shows them: seed 0021 rewrote 0019's, row for row. */
const friendlySql = readFileSync(resolve(root, 'supabase/seed/0021_daily_facts_friendly.sql'), 'utf8');
const friendly = [
  ...friendlySql.matchAll(
    new RegExp(`\\((\\d), (\\d),\\s*${text}, ${text},\\s*${text},\\s*${text},\\s*${text}, ${text}\\)`, 'g')
  ),
].map((m) => ({
  week: Number(m[1]),
  day: Number(m[2]),
  title: unquote(m[3]),
  titleId: unquote(m[4]),
  fact: unquote(m[5]),
  factId: unquote(m[6]),
  tip: unquote(m[7]),
  tipId: unquote(m[8]),
}));
/** The text without the highlight marks. */
const plain = (s: string) => s.replace(/\*\*/g, '');
const allEn = (f: (typeof friendly)[number]) => plain(`${f.title} ${f.fact} ${f.tip}`);
const allId = (f: (typeof friendly)[number]) => plain(`${f.titleId} ${f.factId} ${f.tipId}`);

const picturesSql = readFileSync(resolve(root, 'supabase/seed/0020_daily_facts_pictures.sql'), 'utf8');
const pictures = [
  ...picturesSql.matchAll(new RegExp(`\\((\\d), (\\d), ${text}, ${text}, ${text}, '([a-z]+)'\\)`, 'g')),
].map((m) => ({
  week: Number(m[1]),
  day: Number(m[2]),
  emoji: unquote(m[3]),
  headline: unquote(m[4]),
  headlineId: unquote(m[5]),
  pose: m[6],
}));

describe('the fact of the day’s pictures', () => {
  it('gives every fact a picture, a headline and a mascot pose', () => {
    expect(pictures.map((p) => `${p.week}/${p.day}`)).toEqual(rows.map((r) => `${r.week}/${r.day}`));
    for (const p of pictures) {
      expect(p.emoji.trim()).not.toBe('');
      expect(p.headline.length).toBeLessThanOrEqual(24);
      expect(MASCOT_POSES).toContain(p.pose);
    }
  });

  it('puts no figure in a headline that its fact does not state, in either language', () => {
    const strays = pictures.flatMap((p) => {
      const f = friendly.find((r) => r.week === p.week && r.day === p.day)!;
      return [
        ...figures(p.headline).filter((n) => !allEn(f).includes(n)).map((n) => `${p.week}/${p.day} en ${n}`),
        ...figures(p.headlineId).filter((n) => !allId(f).includes(n)).map((n) => `${p.week}/${p.day} id ${n}`),
      ];
    });
    expect(strays).toEqual([]);
  });
});

describe('the fun fact, written to be read at a glance', () => {
  it('rewrites every one of the 28, in the same places', () => {
    expect(friendly.map((f) => `${f.week}/${f.day}`)).toEqual(rows.map((r) => `${r.week}/${r.day}`));
  });

  it('uses no figure the week’s lesson does not print, in its title, fact or tip', () => {
    const invented = friendly.flatMap((f) =>
      figures(allEn(f))
        .filter((n) => !lessons[f.week].includes(n))
        .map((n) => `week ${f.week} day ${f.day}: ${n}`)
    );
    expect(invented).toEqual([]);
  });

  it('highlights the words that matter, with every highlight closed', () => {
    for (const f of friendly) {
      for (const s of [f.fact, f.factId]) {
        const marks = s.split('**').length - 1;
        expect(marks % 2).toBe(0);
        expect(marks).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('is short enough to read in a few seconds', () => {
    const long = friendly.filter(
      (f) => f.title.length > 40 || plain(f.fact).length > 140 || f.tip.length > 72
    );
    expect(long.map((f) => `${f.week}/${f.day}`)).toEqual([]);
  });

  it('says it all in Bahasa too', () => {
    for (const f of friendly) {
      for (const [en, id] of [[f.title, f.titleId], [f.fact, f.factId], [f.tip, f.tipId]]) {
        expect(id.trim()).not.toBe('');
        expect(id).not.toBe(en);
      }
    }
  });
});

describe('the fact of the day', () => {
  it('has seven for each of the four weeks, one per day', () => {
    expect(rows).toHaveLength(28);
    for (const week of [1, 2, 3, 4]) {
      expect(rows.filter((r) => r.week === week).map((r) => r.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('takes each fact from a card of that week’s own lesson', () => {
    const strays = rows.filter((r) => !lessons[r.week].includes(`'${r.topic}'`));
    expect(strays.map((r) => `${r.week}/${r.day} ${r.topic}`)).toEqual([]);
    expect(rows.every((r) => r.source === `week-${r.week}-lesson`)).toBe(true);
  });

  it('uses no figure the week’s lesson does not print', () => {
    const invented = rows.flatMap((r) =>
      figures(r.fact)
        .filter((n) => !lessons[r.week].includes(n))
        .map((n) => `week ${r.week} day ${r.day}: ${n}`)
    );
    expect(invented).toEqual([]);
  });

  it('runs in the lesson’s order, so day 7 finishes the lesson', () => {
    for (const week of [1, 2, 3, 4]) {
      const at = rows.filter((r) => r.week === week).map((r) => lessons[week].indexOf(`'${r.topic}'`));
      expect([...at].sort((a, b) => a - b)).toEqual(at);
    }
  });

  it('is short: a sentence or two, not a lesson card', () => {
    expect(rows.filter((r) => r.fact.length > 240).map((r) => `${r.week}/${r.day}`)).toEqual([]);
  });

  it('carries Bahasa for every day', () => {
    expect(rows.every((r) => r.factId.trim() !== '' && r.factId !== r.fact)).toBe(true);
  });

  it('is content anyone signed in can read and no phone can write', () => {
    expect(migration).toMatch(/enable row level security/);
    expect(migration.replace(/--.*$/gm, '')).not.toMatch(/for (insert|update|delete|all)/);
    expect(seed.replace(/--.*$/gm, '')).not.toMatch(/reviewed_by/);
  });
});

const quizSql = readFileSync(resolve(root, 'supabase/seed/0022_weekly_quiz.sql'), 'utf8');
const arrayOf = (s: string) => [...s.matchAll(new RegExp(text, 'g'))].map((m) => unquote(m[1]));
const quiz = [
  ...quizSql.matchAll(
    new RegExp(
      `\\((\\d), (\\d),\\s*${text},\\s*${text},\\s*array\\[([^\\]]+)\\],\\s*array\\[([^\\]]+)\\],\\s*(\\d), 'week-(\\d)-facts'\\)`,
      'g'
    )
  ),
].map((m) => ({
  week: Number(m[1]),
  position: Number(m[2]),
  question: unquote(m[3]),
  questionId: unquote(m[4]),
  options: arrayOf(m[5]),
  optionsId: arrayOf(m[6]),
  answer: Number(m[7]),
  sourceWeek: Number(m[8]),
}));

describe('the mini quiz', () => {
  it('asks one question for each day’s fact, seven a week', () => {
    expect(quiz.map((q) => `${q.week}/${q.position}`)).toEqual(friendly.map((f) => `${f.week}/${f.day}`));
    expect(quiz.every((q) => q.sourceWeek === q.week)).toBe(true);
  });

  it('gives three answers, one of them right, in both languages', () => {
    for (const q of quiz) {
      expect(q.options).toHaveLength(3);
      expect(q.optionsId).toHaveLength(3);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(3);
      expect(q.questionId).not.toBe(q.question);
    }
  });

  it('takes each right answer from its day’s own fact', () => {
    const strays = quiz.flatMap((q) => {
      const f = friendly.find((r) => r.week === q.week && r.day === q.position)!;
      return [
        ...figures(q.options[q.answer]).filter((n) => !allEn(f).includes(n)).map((n) => `${q.week}/${q.position} en ${n}`),
        ...figures(q.optionsId[q.answer]).filter((n) => !allId(f).includes(n)).map((n) => `${q.week}/${q.position} id ${n}`),
      ];
    });
    expect(strays).toEqual([]);
  });

  it('does not always put the right answer in the same place', () => {
    expect(new Set(quiz.map((q) => q.answer)).size).toBe(3);
  });
});
