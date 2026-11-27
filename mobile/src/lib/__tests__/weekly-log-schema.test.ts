import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const research = read('supabase/migrations/20261127000001_weekly_logs.sql');
const app = read('supabase/migrations/20261127000002_checkin_questions.sql');
const questions = read('supabase/seed/0016_checkin_questions.sql');
const demo = read('supabase/seed/0017_demo_squad_weekly_logs.sql');

/** Column names of one `create table`, as declared. */
function columnsOf(sql: string, table: string): string[] {
  const start = sql.indexOf(`create table public.${table} (`);
  const body = sql.slice(start, sql.indexOf('\n);', start));
  return body
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+\s/.test(line))
    .map((line) => line.split(/\s/)[0])
    .filter((name) => !['unique', 'check', 'primary', 'foreign', 'constraint'].includes(name));
}

/** The SQL with comments removed, so a sentence about a word is not the word. */
const code = (sql: string) => sql.replace(/--.*$/gm, '');

describe('weekly_logs mirrors the WEEKLY LOG tab', () => {
  it('has the tab’s columns, in the tab’s order', () => {
    // Week | Theme | Athlete | Avg Training Energy (1-10) | Avg Urine Colour (1-8)
    // | Avg Fluid (mL/day) | Breakfast Compliance | Week Behaviour Check | Answer | Notes
    expect(columnsOf(research, 'weekly_logs').filter((c) => !['id', 'created_at', 'updated_at'].includes(c)))
      .toEqual([
        'week', 'theme', 'participant_id', 'avg_training_energy', 'avg_urine_colour',
        'avg_fluid_ml', 'breakfast_compliance', 'week_behaviour_check', 'answer', 'notes',
      ]);
  });

  it('keeps the app’s own concepts out of the research migration', () => {
    const offenders = ['team', 'streak', 'challenge', 'photo_', 'badge', 'checkin_questions']
      .filter((word) => code(research).toLowerCase().includes(word));
    expect(offenders).toEqual([]);
  });

  it('holds one row per athlete per week, as the tab does', () => {
    expect(research).toMatch(/unique \(participant_id, week\)/);
  });

  it('lets an athlete write only their own week, and a coach none', () => {
    expect(research).toMatch(/enable row level security/);
    const writes = [...code(research).matchAll(/for (insert|update)[\s\S]*?;/g)].map((m) => m[0]);
    expect(writes).toHaveLength(2);
    for (const policy of writes) {
      expect(policy).toMatch(/participant_id = private\.current_participant_id\(\)/);
      expect(policy).not.toMatch(/coach/);
    }
    expect(code(research)).not.toMatch(/for (all|delete)/);
  });

  it('keeps the behaviour question in the app tier, readable and not writable from a phone', () => {
    expect(app).toMatch(/create table public\.checkin_questions/);
    expect(code(app)).toMatch(/for select to authenticated using \(true\)/);
    expect(code(app)).not.toMatch(/for (insert|update|delete|all)/);
  });
});

describe('the week’s question', () => {
  const rows = [...questions.matchAll(/\((\d), '([^']+)',\s*'(choice|number|text)', (null|array\[[^\]]+\]), '([a-z0-9-]+)'\)/g)]
    .map((m) => ({ week: Number(m[1]), question: m[2], kind: m[3], options: m[4], source: m[5] }));

  it('has one for each of the four weeks', () => {
    expect(rows.map((r) => r.week)).toEqual([1, 2, 3, 4]);
  });

  it('asks week 2’s exactly as the week 3 message did', () => {
    // "Did you add a protein source to 3+ meals last week? — every meal /
    // most meals / some meals / no"
    expect(rows[1]).toMatchObject({
      question: 'Did you add a protein source to 3+ meals last week?',
      kind: 'choice',
      source: 'week-3-message',
    });
    expect(rows[1].options).toBe("array['Every meal', 'Most meals', 'Some meals', 'No']");
  });

  it('asks week 3 for the sleep hours the week 3 slide asks to report', () => {
    expect(rows[2]).toMatchObject({ kind: 'number', source: 'week-3-slides' });
  });

  it('marks weeks 1 and 4 as drafts, because the folder has no wording for them', () => {
    expect(rows[0].source).toBe('draft');
    expect(rows[3].source).toBe('draft');
  });

  it('leaves every question awaiting the dietitian’s sign-off', () => {
    expect(code(questions)).not.toMatch(/reviewed_by/);
  });
});

describe('the demo squad’s weekly rows', () => {
  const rows = [...demo.matchAll(/\((\d), '([^']+)', '(TEST-DEMO-[A-Z0-9]+)',\s+(\d+), (\d+), (\d+), '([^']+)', '([^']+)'\)/g)];

  it('are the tab’s twelve rows for Jeongho, Theo and Jacob', () => {
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r[3]))).toEqual(
      new Set(['TEST-DEMO-J01', 'TEST-DEMO-T01', 'TEST-DEMO-JA01'])
    );
  });

  it('carry the tab’s own answers, untidied', () => {
    const theo = rows.filter((r) => r[3] === 'TEST-DEMO-T01').map((r) => [r[1], r[4], r[5], r[6], r[7], r[8]]);
    expect(theo).toEqual([
      ['1', '7', '8', '1200', 'Everyday', 'More energy and better sleep after rice at night'],
      ['2', '8', '5', '1500', 'Everyday', 'Every meal'],
      ['3', '8', '4', '2300', 'Every day', '7:30 hours'],
      ['4', '9', '4', '2500', 'Everyday', 'Better'],
    ]);
  });

  it('never fill the Answer column, which is empty in the tab', () => {
    expect(code(demo)).not.toMatch(/\banswer\b/);
  });

  it('touch nobody outside the demo squad', () => {
    expect(code(demo)).not.toMatch(/Kynan|Nathan|'[A-Z]+-0\d'/);
  });
});
