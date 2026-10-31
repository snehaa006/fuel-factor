import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Constants } from '@/lib/database.types';
import { DEMO_LESSON_CARDS } from '@/lib/__fixtures__/today';

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

describe('the challenge photo stays private', () => {
  const photoSql = read('supabase/migrations/20261031000008_challenge_photos.sql');

  it('creates the bucket private', () => {
    // These are photos of 14 to 16 year olds. A public bucket would make
    // every one of them readable by URL to anyone who guessed the path.
    const row = /insert into storage\.buckets[\s\S]*?;/.exec(photoSql)?.[0] ?? '';
    expect(row).toMatch(/\bfalse\b/);
    expect(row).not.toMatch(/\btrue\b/);
  });

  it('limits what can be uploaded to images', () => {
    expect(photoSql).toContain("'image/jpeg'");
    expect(photoSql).not.toMatch(/application\//);
  });

  it('scopes every policy to the athlete’s own folder', () => {
    const policies = [...photoSql.matchAll(/create policy "([^"]+)"[\s\S]*?;/g)];
    expect(policies.length).toBeGreaterThanOrEqual(4);
    for (const [body, name] of policies) {
      expect(`${name}: scoped`).toBe(
        body.includes('current_participant_id') ? `${name}: scoped` : `${name}: UNSCOPED`
      );
      expect(body).toContain("bucket_id = 'challenge-photos'");
    }
  });

  it('grants a coach no access to the images', () => {
    // A coach can read the completion tick, which is a log entry. The
    // picture is not one, nobody asked for it, and a photo of a minor cannot
    // be un-shared once it has been.
    expect(photoSql).not.toContain('coaches_participant');
    expect(photoSql).not.toContain('can_see_participant');
  });
});

describe('the leaderboard ranks nobody on their body', () => {
  const boardSql = read('supabase/migrations/20261031000009_team_leaderboard.sql');

  /**
   * The migration with its comment lines dropped.
   *
   * The comments explain at length which columns are deliberately absent and
   * why, so a check for an absent column has to read the SQL rather than the
   * prose about it.
   */
  const boardCode = boardSql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  /** The columns the function declares it returns. */
  function returnedColumns(): string[] {
    const body = /returns table \(([\s\S]*?)\n\)/.exec(boardSql)?.[1] ?? '';
    return body
      .split('\n')
      .map((line) => line.trim().split(/\s/)[0])
      .filter((name) => /^[a-z_]+$/.test(name));
  }

  it('returns a name, a day count and two booleans, and nothing else', () => {
    // The return type is where the brief's rule is enforced. A body metric
    // cannot be ranked on if it never leaves the database, and widening this
    // list is the only way it could.
    expect(returnedColumns()).toEqual([
      'participant_code',
      'name',
      'days_logged',
      'logged_today',
      'is_me',
    ]);
  });

  it('never reads a measurement of an athlete', () => {
    // These are 14 to 16 year olds. A board sorted by weight or waist is a
    // safeguarding failure and would sink the pitch with any school.
    for (const column of ['weight_kg', 'height_cm', 'waist_cm', 'muac_cm', 'calf_cm']) {
      expect(`${column}: absent`).toBe(
        boardCode.includes(column) ? `${column}: PRESENT` : `${column}: absent`
      );
    }
  });

  it('ranks on nothing the programme has not defined', () => {
    // dq_score is the brief's other permitted axis and has no formula yet.
    // Ranking minors against each other on a scale the app invented would be
    // worse than ranking them on nothing.
    expect(boardCode).not.toContain('dq_score');
  });

  it('is scoped to the caller’s own team', () => {
    // Security definer bypasses row level security, so the scoping is this
    // function's own job. It answers about the caller's participant row and
    // the team that row belongs to, never about a team the client named.
    expect(boardCode).toContain('private.current_participant_id()');
    expect(boardCode).toMatch(/my_team/);
    // No join code argument: a device cannot ask for a squad it has not
    // claimed into, the way team_roster deliberately can.
    expect(boardCode).not.toContain('p_join_code');
  });

  it('gives anon no access to it', () => {
    expect(boardSql).toMatch(/revoke all on function public\.team_leaderboard[^\n]*from public, anon/);
    expect(boardSql).toMatch(/grant execute on function public\.team_leaderboard[^\n]*to authenticated/);
  });

  it('adds nothing to the research tier', () => {
    // The leaderboard is app tier. It reads daily_logs and writes nothing,
    // and introduces no column the CSV export could pick up.
    expect(boardCode).not.toMatch(/alter table public\.(participants|daily_logs|recalls|assessments)/);
    expect(boardCode).not.toMatch(/\binsert into\b|\bupdate\b|\bdelete from\b/i);
  });
});

describe('the Learn section carries the deck and nothing else', () => {
  const lessonSeed = read('supabase/seed/0006_week1_lessons.sql');

  it('seeds lesson cards for week 1 only', () => {
    // Weeks 2 to 4 are locked because they have no rows. A row here for week
    // 2 would unlock a week nobody has written.
    const weeks = [...lessonSeed.matchAll(/values \((\d), \d+, '/g)].map((m) => m[1]);
    expect(weeks.length).toBeGreaterThan(0);
    expect(new Set(weeks)).toEqual(new Set(['1']));
  });

  it('attributes every card to the deck', () => {
    const cards = [...lessonSeed.matchAll(/insert into public\.lesson_cards \(([^)]*)\)/g)];
    expect(cards.length).toBeGreaterThan(0);
    for (const [, columns] of cards) {
      expect(columns).toContain('source');
    }
    // 'week-1-deck' is the only provenance any card claims.
    const sources = [...lessonSeed.matchAll(/'(week-1-deck|tkpi|sofia)'/g)].map((m) => m[1]);
    expect(new Set(sources)).toEqual(new Set(['week-1-deck']));
  });

  it('copies the deck’s own carbohydrate bands, including the game day it gives', () => {
    // The deck prints a game-day band, so the Learn page shows it. That is
    // teaching material, not a third value for the tracker's Day Type column.
    expect(lessonSeed).toContain('5–7g per kg body weight');
    expect(lessonSeed).toContain('3–4g per kg body weight');
    expect(lessonSeed).toContain('6–8g per kg');
    expect(Constants.public.Enums.day_type).toEqual(['training', 'rest']);
  });

  it('keeps the demo fixture in step with the seed', () => {
    // The Learn screen is developed against DEMO_LESSON_CARDS because the
    // project still has anonymous sign-ins off. A fixture that has drifted
    // from the database is worse than no fixture, so the kinds and their
    // order have to match the seed's.
    const seeded = [...lessonSeed.matchAll(/values \(1, \d+, '([a-z_]+)'/g)].map((m) => m[1]);
    expect(DEMO_LESSON_CARDS.map((c) => c.kind)).toEqual(seeded);
  });

  it('keeps the food table out of the lesson rows', () => {
    // The deck's Jakarta food table is the food database. Copying its figures
    // here would make a second place for a carbohydrate number to be wrong.
    expect(lessonSeed).not.toMatch(/carbs_g/);
    expect(lessonSeed).toContain("'foods'");
  });
});
