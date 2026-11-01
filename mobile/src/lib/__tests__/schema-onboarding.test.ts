import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const coachSql = read('supabase/migrations/20261101000001_coach_accounts.sql');
const joinSql = read('supabase/migrations/20261101000002_join_team.sql');
const recallSql = read('supabase/migrations/20261101000003_recall_entry.sql');
const revokeSql = read('supabase/migrations/20261101000004_coach_code_really_revoked.sql');

/**
 * One migration with every comment dropped.
 *
 * These migrations explain at length which columns are deliberately absent and
 * why, so a check for an absent column has to read the SQL rather than the
 * prose about it -- including the `/** *\/` blocks over each function, which is
 * where most of the explaining happens.
 */
function code(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
}

describe('a coach owns a team, and an athlete cannot become one', () => {
  it('closes the hole that let an athlete read the coach code', () => {
    // `coach_code` arrived in 20261031000011 and the read policy on `teams`
    // was not revisited: that policy lets any team member select the row, and
    // an athlete is a team member. `claim_coach` refuses a device already
    // holding an athlete, so they could not promote the phone in their hand --
    // they could read the code and type it into a second install.
    //
    // **The revoke has to be table level.** 20261101000001 wrote
    // `revoke select (coach_code) ...`, which removes a COLUMN-level grant;
    // Supabase grants select on every public table to anon and authenticated
    // at TABLE level, and a table-level grant covers every column. That revoke
    // succeeded and changed nothing. Only asking the live database caught it,
    // because the test here asserted the migration's text and the text was
    // correct.
    expect(revokeSql).toMatch(/revoke select on public\.teams from authenticated, anon/);
  });

  it('hands back every column except the coach code', () => {
    const granted = /grant select \(([^)]*)\)\s*\n?\s*on public\.teams/.exec(revokeSql)?.[1] ?? '';
    const columns = granted.split(',').map((c) => c.trim()).filter(Boolean);
    expect(columns).not.toContain('coach_code');
    // Everything else the client reads has to survive, or the coach dashboard
    // and the profile screen break instead.
    for (const column of ['id', 'name', 'join_code', 'created_at', 'created_by', 'programme_starts_on']) {
      expect(columns).toContain(column);
    }
  });

  it('gives anon nothing back at all', () => {
    // anon has no policy on teams and so could already read no row. Holding
    // the grant anyway only means a policy added later would quietly carry the
    // coach code with it.
    const granted = /grant select[\s\S]*?;/.exec(revokeSql)?.[0] ?? '';
    expect(granted).not.toContain('anon');
  });

  it('leaves the join code readable, which is harmless', () => {
    // An athlete used the join code to get in, so learning it again tells them
    // nothing.
    expect(revokeSql).toMatch(/grant select \([^)]*join_code/);
  });

  it('refuses to create a team from an anonymous session', () => {
    // A team owned by an anonymous device is lost on reinstall with nothing to
    // prove it was theirs. The check reads the claim Supabase signs into the
    // token, not a column a client could set.
    expect(code(coachSql)).toContain("auth.jwt() ->> 'is_anonymous'");
    expect(coachSql).toMatch(/creating a team needs an account with an email/);
  });

  it('refuses a device that is signed in as an athlete', () => {
    // Holding a participant row and a coach membership at once gives every
    // "which athlete is this" question in the database two right answers.
    const createTeam = code(coachSql).slice(code(coachSql).indexOf('create function public.create_team'));
    expect(createTeam).toContain('participant_profiles');
    expect(createTeam).toMatch(/this device is signed in as an athlete/);
  });

  it('generates both codes instead of letting a coach choose them', () => {
    // A coach picking a join code picks a guessable one, and a guessable join
    // code is a stranger reading a roster of named minors through team_roster.
    expect(code(coachSql)).toContain('private.new_code(6)');
    expect(code(coachSql)).toContain('private.new_code(8)');
  });

  it('keeps the code generator out of PostgREST’s reach', () => {
    // Anything in `public` gets a /rest/v1/rpc/ endpoint, which is the whole
    // reason the RLS helpers were moved to `private`.
    expect(coachSql).toContain('create function private.new_code');
    expect(coachSql).toMatch(/revoke all on function private\.new_code\(int\) from public, anon, authenticated/);
  });

  it('uses an alphabet a teenager can read out over a phone', () => {
    // No 0/O and no 1/I/L: these codes get typed from a WhatsApp message and
    // read out across a pitch.
    const alphabet = /'([A-Z2-9]+)'\s*,\s*1 \+ floor/.exec(coachSql)?.[1] ?? '';
    expect(alphabet.length).toBeGreaterThan(20);
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      expect(`${ambiguous}: absent`).toBe(
        alphabet.includes(ambiguous) ? `${ambiguous}: PRESENT` : `${ambiguous}: absent`
      );
    }
  });

  it('scopes the programme date to the caller’s own team', () => {
    // A function that takes a team id has to be trusted to check it; one that
    // reads the caller's own membership cannot be pointed at another squad.
    const setStart = code(coachSql).slice(
      code(coachSql).indexOf('create function public.set_programme_start')
    );
    expect(setStart).not.toMatch(/p_team_id/);
    expect(setStart).toContain("role = 'coach'");
  });

  it('gives anon none of the new functions', () => {
    for (const fn of ['create_team', 'my_team', 'set_programme_start']) {
      expect(coachSql).toMatch(new RegExp(`revoke all on function public\\.${fn}[^\\n]*from public, anon`));
      expect(coachSql).toMatch(new RegExp(`grant execute on function public\\.${fn}[^\\n]*to authenticated`));
    }
  });
});

describe('joining by link creates a participant and nothing more', () => {
  it('adds no column to any research table', () => {
    // participants mirrors the PARTICIPANTS sheet. This migration may insert
    // into it; it may not widen it.
    expect(code(joinSql)).not.toMatch(
      /alter table public\.(participants|daily_logs|recalls|assessments)/
    );
  });

  it('asks only for the columns the sheet already has', () => {
    const args = /create function public\.join_team\(([\s\S]*?)\n\)/.exec(joinSql)?.[1] ?? '';
    const named = [...args.matchAll(/p_([a-z_]+)\s/g)].map((m) => m[1]);
    expect(named).toEqual([
      'join_code',
      'name',
      'consent_ack',
      'sport',
      'age_band',
      'height_cm',
      'weight_kg',
      'waist_cm',
      'muac_cm',
      'calf_cm',
      'consent_signed',
      'parent_contact',
      'notes',
    ]);
  });

  it('never lets a joiner choose their participant code', () => {
    // Typing 'T-01' would be typing Theo's real row.
    expect(code(joinSql)).toContain('private.next_participant_code');
    expect(code(joinSql)).not.toMatch(/p_participant_code/);
  });

  it('refuses without the app’s own consent', () => {
    // Decision 8 makes the gate blocking, and it is blocking in the database
    // rather than only in the UI.
    expect(code(joinSql)).toContain('p_consent_ack');
    expect(joinSql).toMatch(/consent is required before joining a team/);
  });

  it('keeps the paper form and the app’s tick as separate records', () => {
    // consent_signed is the parental form on the PARTICIPANTS sheet;
    // consent_ack_at is this app's screen. Writing one from the other would
    // put an app event into the study's record as a collected fact.
    const body = code(joinSql);
    expect(body).toContain('consent_signed');
    expect(body).toContain('consent_ack_at');
    expect(body).not.toMatch(/consent_signed\s*=\s*.*p_consent_ack/);
    expect(body).not.toMatch(/consent_ack_at\s*=\s*.*p_consent_signed/);
  });

  it('refuses a second athlete on a device that already holds one', () => {
    // Creating one would orphan the first row inside a research table with
    // nobody able to reach it, which is a fabricated participant.
    expect(joinSql).toMatch(/this device has already joined as an athlete/);
  });

  it('refuses a coach account', () => {
    expect(joinSql).toMatch(/this account is signed in as a coach/);
  });

  it('bounds the measurements against a units mistake and nothing more', () => {
    // These are not nutrition thresholds and nothing judges a value inside
    // them: they are the range in which a figure is a human measurement at
    // all, so a direct call cannot write rubbish into the study's record.
    expect(joinSql).toMatch(/height should be in centimetres, between 100 and 250/);
    expect(joinSql).toMatch(/weight should be in kilograms, between 20 and 200/);
  });

  it('judges no measurement it accepts', () => {
    // No band, no category, no BMI. The programme has defined none of them.
    const body = code(joinSql).toLowerCase();
    for (const word of ['bmi', 'underweight', 'overweight', 'obese', 'healthy', 'ideal']) {
      expect(`${word}: absent`).toBe(body.includes(word) ? `${word}: PRESENT` : `${word}: absent`);
    }
  });

  it('adds no insert policy to participants', () => {
    // The function is the only route a participant row is created by from a
    // phone, the same shape claim_participant has.
    expect(code(joinSql)).not.toMatch(/create policy[^;]*on public\.participants/);
  });

  it('tells a code holder the team’s name and not its roster', () => {
    const byCode = /create function public\.team_by_code[\s\S]*?\$\$;/.exec(joinSql)?.[0] ?? '';
    expect(byCode).toContain('programme_starts_on');
    expect(byCode).not.toContain('participants');
    expect(byCode).not.toContain('participant_code');
  });
});

describe('the recall can be written, and the computed figures cannot', () => {
  it('lets an athlete write only their own recalls', () => {
    expect(recallSql).toMatch(/create policy "insert own recalls"[\s\S]*?current_participant_id\(\)/);
    expect(recallSql).toMatch(/create policy "update own recalls"[\s\S]*?current_participant_id\(\)/);
  });

  it('gives a coach no way to write a recall', () => {
    // A coach who can write a recall can put words in an athlete's mouth
    // inside the study's own record. daily_logs has no coach write either.
    const policies = [...recallSql.matchAll(/create policy "([^"]+)" on public\.recalls[\s\S]*?;/g)];
    expect(policies.length).toBe(2);
    for (const [body, name] of policies) {
      expect(`${name}: own only`).toBe(
        body.includes('coaches_participant') ? `${name}: COACH WRITE` : `${name}: own only`
      );
    }
  });

  it('keeps the computed macros out of the research tier', () => {
    // recall_nutrition is keyed on the recall rather than being columns on it,
    // so the CSV export cannot pick a computed number up and present it as a
    // collected one.
    expect(recallSql).toContain('create table public.recall_nutrition');
    expect(code(recallSql)).not.toMatch(
      /alter table public\.(participants|daily_logs|recalls|assessments)\s+add column/
    );
  });

  it('never writes est_calories', () => {
    // That column is research tier and the export reads it. Replacing a
    // hand-typed estimate there is the programme's call once there is a real
    // figure, not a side effect of a stub.
    expect(code(recallSql)).not.toContain('est_calories');
  });

  it('computes nothing yet, and says so in the row', () => {
    // This database holds carbohydrate for seven foods and no protein or fat
    // for any food at all. An average protein derived from that is invented.
    const fn = /create function public\.compute_recall_nutrition[\s\S]*?\$\$;/.exec(recallSql)?.[0] ?? '';
    expect(fn).toContain("'not_computed'");
    expect(fn).not.toMatch(/\bkcal\s*=|\bcarbs_g\s*=|\bprotein_g\s*=|\bfat_g\s*=/);
    expect(fn).not.toContain('food_portions');
  });

  it('leaves every macro nullable, so a gap is never a zero', () => {
    const table = /create table public\.recall_nutrition \(([\s\S]*?)\n\);/.exec(recallSql)?.[1] ?? '';
    for (const column of ['kcal', 'carbs_g', 'protein_g', 'fat_g']) {
      expect(`${column}: nullable`).toBe(
        new RegExp(`${column}[^\\n]*not null`).test(table) ? `${column}: NOT NULL` : `${column}: nullable`
      );
    }
  });

  it('gives a phone no way to write a macro by hand', () => {
    // The rows are written by the function and nowhere else.
    const policies = [...recallSql.matchAll(/create policy "[^"]+" on public\.recall_nutrition\s+for (\w+)/g)];
    expect(policies.map((m) => m[1])).toEqual(['select']);
  });

  it('answers only about a recall the caller may already see', () => {
    const fn = /create function public\.compute_recall_nutrition[\s\S]*?\$\$;/.exec(recallSql)?.[0] ?? '';
    expect(fn).toContain('private.can_see_participant');
  });

  it('gives anon no access to the function', () => {
    expect(recallSql).toMatch(
      /revoke all on function public\.compute_recall_nutrition\(uuid\) from public, anon/
    );
  });
});
