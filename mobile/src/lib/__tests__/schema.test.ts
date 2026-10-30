import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Constants } from '@/lib/database.types';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const researchSql = read('supabase/migrations/20261031000001_research_tables.sql');

/** The column names declared for one table in the research migration. */
function columnsOf(table: string): string[] {
  const start = researchSql.indexOf(`create table public.${table} (`);
  const body = researchSql.slice(start, researchSql.indexOf('\n);', start));
  return body
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+\s/.test(line))
    .map((line) => line.split(/\s/)[0])
    .filter((name) => !['unique', 'check', 'primary', 'foreign', 'constraint'].includes(name));
}

describe('research tier mirrors the tracker', () => {
  it('daily_logs carries the DAILY LOG sheet columns, in sheet order', () => {
    // Columns 1-22 of the sheet. id and the timestamps are bookkeeping.
    expect(columnsOf('daily_logs').filter((c) => !['id', 'created_at', 'updated_at'].includes(c)))
      .toEqual([
        'participant_id', 'log_date', 'day_type',
        'breakfast', 'pre_training', 'lunch', 'post_training', 'dinner', 'evening_snack',
        'fruit_servings', 'veg_servings', 'protein_sources', 'carb_portions',
        'fluid_ml', 'urine_colour',
        'energy_am', 'energy_training', 'recovery', 'mood', 'concentration',
        'dq_score', 'notes',
      ]);
  });

  it('recalls carries the RECALL sheet columns', () => {
    expect(columnsOf('recalls').filter((c) => !['id', 'created_at', 'updated_at'].includes(c)))
      .toEqual([
        'participant_id', 'day_number', 'recall_date', 'day_type', 'sleep_hours',
        'breakfast', 'lunch', 'dinner', 'activities', 'supplements', 'notes',
        'fluid_ml', 'est_calories', 'energy', 'recovery', 'urine_colour',
      ]);
  });

  it('participants carries the PARTICIPANTS sheet columns', () => {
    expect(columnsOf('participants').filter((c) => !['id', 'created_at', 'updated_at'].includes(c)))
      .toEqual([
        'participant_code', 'name', 'sport', 'age_band', 'height_cm', 'weight_kg',
        'waist_cm', 'muac_cm', 'calf_cm', 'consent_signed', 'parent_contact', 'notes',
      ]);
  });

  it('keeps app-only concepts out of the research tier', () => {
    // teams, streaks, challenges and photos belong to the app tier, so nothing
    // they introduce can reach the CSV export.
    const offenders = ['team', 'streak', 'challenge', 'photo_', 'position', 'badge']
      .filter((word) => researchSql.toLowerCase().includes(word));
    expect(offenders).toEqual([]);
  });

  it('day_type holds only the two values their sheet uses', () => {
    // The Week 1 deck also gives a game-day carbohydrate band, but "game" is not
    // a value the tracker's Day Type column carries.
    expect(Constants.public.Enums.day_type).toEqual(['training', 'rest']);
  });

  it('meal_slot matches the six slots the sheet uses, in order', () => {
    expect(Constants.public.Enums.meal_slot).toEqual([
      'breakfast', 'pre_training', 'lunch', 'post_training', 'dinner', 'evening_snack',
    ]);
  });
});

describe('nutrition values are never invented', () => {
  const foodSeed = read('supabase/seed/0001_week1_foods.sql');

  it('sets no protein or fat anywhere, because the deck gives neither', () => {
    expect(foodSeed).not.toMatch(/protein_g\s*,/);
    expect(foodSeed).not.toMatch(/fat_g\s*,/);
  });

  /** The carbohydrate field of one food's portion row in the seed. */
  function seededCarbs(name: string): string {
    const portions = foodSeed.slice(foodSeed.indexOf('join (values'));
    const line = portions.split('\n').find((l) => l.trimStart().startsWith(`('${name}',`));
    if (!line) throw new Error(`no portion row seeded for ${name}`);
    // ('name', 'label', grams, kcal, carbs, note
    return line.trim().replace(/^\(/, '').split(',')[4].trim();
  }

  it('gives carbohydrate to the seven foods the deck puts a number against', () => {
    for (const name of ['Nasi putih', 'Nasi merah', 'Ubi jalar', 'Pisang', 'Oat', 'Roti gandum', 'Singkong rebus']) {
      expect(`${name}: ${seededCarbs(name)}`).toMatch(/: [\d.]+$/);
    }
  });

  it('leaves carbohydrate null wherever the deck gives no figure', () => {
    // Pepaya / mangga is listed with a 70-100 kcal range and no carb figure, and
    // the seven lower-priority foods carry guidance but no numbers at all.
    for (const name of ['Pepaya / mangga', 'Mie instan', 'Roti putih', 'Teh botol / Pocari',
                        'Keripik', 'Bubur', 'Nasi goreng', 'Kue']) {
      expect(`${name}: ${seededCarbs(name)}`).toBe(`${name}: null`);
    }
  });

  it('records the deck’s two registers and no third', () => {
    const registers = [...foodSeed.matchAll(/'(eat_daily|not_the_priority)'/g)].map((m) => m[1]);
    expect(new Set(registers)).toEqual(new Set(['eat_daily', 'not_the_priority']));
    expect(registers.filter((r) => r === 'eat_daily')).toHaveLength(8);
  });

  it('ships no advice rule as reviewed', () => {
    // reviewed_by stays null until the dietitian signs a rule off, so it must
    // not appear in the insert's column list.
    const programmeSeed = read('supabase/seed/0002_week1_programme.sql');
    const columns = /insert into public\.advice_rules \(([^)]*)\)/.exec(programmeSeed)?.[1] ?? '';
    expect(columns).not.toContain('reviewed_by');
  });

  it('seeds only week 1, because weeks 2 to 4 have not been written', () => {
    const programmeSeed = read('supabase/seed/0002_week1_programme.sql');
    const weeks = [...programmeSeed.matchAll(/values \((\d), '/g)].map((m) => m[1]);
    expect(weeks).toEqual(['1']);
  });
});
