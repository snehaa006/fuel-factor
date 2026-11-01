-- The coach code revoke in 20261101000001 did not do anything.
--
-- `revoke select (coach_code) on public.teams from authenticated` removes a
-- *column-level* grant. Supabase grants `select` on every table in `public` to
-- `anon` and `authenticated` at **table level**, and a table-level grant covers
-- every column including ones that were never granted individually. So the
-- revoke succeeded, changed nothing, and `has_column_privilege('authenticated',
-- 'public.teams', 'coach_code', 'SELECT')` still answered true.
--
-- The test that was supposed to guard this asserted that the migration *text*
-- contained the revoke. It did. A string in a file is not a privilege, and the
-- only thing that caught this was asking the live database.
--
-- The fix is the other way round: drop the table-level grant and hand back the
-- columns that are allowed, so `coach_code` is readable by no client role and
-- every other column is unchanged.
--
-- This matters because the read policy on `teams` lets any team member select
-- the row, and an athlete is a team member. `claim_coach` refuses a device that
-- already holds an athlete, so they could not promote the phone in their hand --
-- they could read the code and type it into a second install, and have the
-- whole squad's logs.

revoke select on public.teams from authenticated, anon;

-- Everything except coach_code. The join code stays readable to members: an
-- athlete used it to get in, so learning it again tells them nothing, and the
-- coach's own screen shows it in order to be shared.
grant select (id, name, join_code, created_at, created_by, programme_starts_on)
  on public.teams to authenticated;

-- `anon` gets nothing back. It has no policy on `teams` and so could already
-- read no row; holding the grant anyway only means a policy added later would
-- quietly carry the coach code with it.

-- The functions are unaffected: `my_team`, `team_by_code`, `team_roster`,
-- `claim_coach` and `create_team` are all security definer and run as the
-- owner, which is how a coach still reads their own code.
