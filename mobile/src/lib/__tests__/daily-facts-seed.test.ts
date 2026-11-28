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
      const row = rows.find((r) => r.week === p.week && r.day === p.day)!;
      return [
        ...figures(p.headline).filter((n) => !row.fact.includes(n)).map((n) => `${p.week}/${p.day} en ${n}`),
        ...figures(p.headlineId).filter((n) => !row.factId.includes(n)).map((n) => `${p.week}/${p.day} id ${n}`),
      ];
    });
    expect(strays).toEqual([]);
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
