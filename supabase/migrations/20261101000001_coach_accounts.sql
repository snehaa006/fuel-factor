-- Coach accounts, and a coach who owns a team.
--
-- Until now a coach was an anonymous device that had typed a coach code, and
-- the teams themselves were seeded by hand. Neither survives what a coach is
-- now asked to do: create a team and hand out a link to it. An anonymous
-- session lives in one app install's storage, so a coach who reinstalls loses
-- the team they made and there is nothing to recover it with -- the team row
-- would have no owner to prove to.
--
-- So a coach signs up with an email and a password, and the athletes do not.
-- That asymmetry is deliberate and is the same reasoning as before, read in
-- both directions: a squad of 14 to 16 year olds should not carry a credential
-- each, and the adult who owns the squad's data should not be identified by a
-- device.
--
-- Email and password is also the one provider that is switched on for this
-- project today, so everything in this migration can be exercised live while
-- anonymous sign-ins are still off and the athlete half cannot be.

-- Who made the team. On delete set null rather than cascade: a coach deleting
-- their account must not take the squad's logs with them.
alter table public.teams
  add column created_by uuid references auth.users (id) on delete set null;

-- The four-week clock. Null means the programme has not started, which is the
-- state the baseline recall is collected in.
alter table public.teams
  add column programme_starts_on date;

comment on column public.teams.programme_starts_on is
  'Day one of the four-week programme. Null until the coach sets it. The baseline recall is collected before this date and the follow-up four weeks after it.';

comment on column public.teams.created_by is
  'The coach who created the team. Set null on account deletion so the squad''s rows outlive the account.';

-- A coach code an athlete could read is not a second code at all ------------
--
-- `coach_code` arrived in 20261031000011 and the read policy on `teams` was
-- not revisited. That policy lets any team member select the row, and an
-- athlete is a team member, so `select coach_code from teams` answered for
-- them. `claim_coach` refuses a device that already holds an athlete, so the
-- athlete could not promote the phone in their hand -- they could read the
-- code, type it into a second install, and have the whole squad's logs.
--
-- Column privileges are checked alongside row level security rather than
-- instead of it, so revoking this one column closes the hole without touching
-- the policy. The coach reads their own code through `my_team()` below, which
-- is security definer and answers only a coach.
revoke select (coach_code) on public.teams from authenticated;

-- The join code stays readable to members. An athlete used it to get in, so
-- learning it again tells them nothing, and the coach's screen shows it to be
-- shared on purpose.

/**
 * A short code that is readable out loud and over a phone.
 *
 * The alphabet omits 0/O, 1/I/L and the digits that collide with them, because
 * these codes get typed by teenagers from a WhatsApp message and read out
 * across a pitch. Lives in `private`, so it gets no REST endpoint.
 */
create function private.new_code(p_length int)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
    ''
  )
  from generate_series(1, p_length);
$$;

revoke all on function private.new_code(int) from public, anon, authenticated;

/**
 * Create a team, and make the caller its coach.
 *
 * Security definer because a brand new coach is a member of nothing and so can
 * read and write no team row at all -- the same reason `team_roster` is. It is
 * also what keeps `team_members` shut: the insert policy on that table only
 * ever allowed role 'athlete', so this function and `claim_coach` remain the
 * only two ways a coach row is ever written, and nobody can PATCH themselves
 * into one.
 *
 * It refuses an anonymous session. A team created by an anonymous device has an
 * owner that cannot be signed back into, which is a team nobody can administer
 * the moment the app is reinstalled.
 *
 * Both codes are generated here rather than chosen. A coach picking a join code
 * would pick a guessable one, and a guessable join code is a stranger reading
 * the roster of a named minor through `team_roster`.
 */
create function public.create_team(p_name text, p_starts_on date default null)
returns table (
  id                   uuid,
  name                 text,
  join_code            text,
  coach_code           text,
  programme_starts_on  date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_join  text;
  v_coach text;
  v_team  uuid;
  v_name  text := nullif(trim(p_name), '');
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  -- The claim is checked against the token, not against a column the client
  -- could set: `is_anonymous` is a claim Supabase signs into the JWT itself.
  if coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'creating a team needs an account with an email, not an anonymous session'
      using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'a team needs a name' using errcode = '22023';
  end if;

  -- A device signed in as an athlete must not also own a squad: it would hold
  -- a participant row and a coach membership at once, and every "which athlete
  -- is this" answer in the database would then have two right answers.
  if exists (select 1 from public.participant_profiles where user_id = v_user) then
    raise exception 'this device is signed in as an athlete' using errcode = '42501';
  end if;

  -- Retry on collision rather than trusting six random characters to be free.
  -- Bounded, so a saturated code space fails loudly instead of spinning.
  for i in 1 .. 20 loop
    v_join  := private.new_code(6);
    v_coach := private.new_code(8);
    exit when not exists (
      select 1 from public.teams t
      where t.join_code = v_join or t.coach_code = v_coach
    );
    v_join := null;
  end loop;

  if v_join is null then
    raise exception 'could not allocate a free team code' using errcode = '53400';
  end if;

  insert into public.teams (name, join_code, coach_code, created_by, programme_starts_on)
  values (v_name, v_join, v_coach, v_user, p_starts_on)
  returning teams.id into v_team;

  insert into public.team_members (team_id, user_id, role)
  values (v_team, v_user, 'coach');

  return query
    select t.id, t.name, t.join_code, t.coach_code, t.programme_starts_on
    from public.teams t
    where t.id = v_team;
end;
$$;

/**
 * The caller's own team, as a coach sees it.
 *
 * This is the only way `coach_code` reaches a client now that the column is
 * revoked, and it answers a coach about a team they coach and nobody else.
 * It carries the join code too, because handing that out is the whole point of
 * the coach's screen.
 */
create function public.my_team()
returns table (
  id                   uuid,
  name                 text,
  join_code            text,
  coach_code           text,
  programme_starts_on  date,
  athletes             bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         t.name,
         t.join_code,
         t.coach_code,
         t.programme_starts_on,
         (select count(*) from public.participant_profiles pp where pp.team_id = t.id)
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  where tm.user_id = (select auth.uid())
    and tm.role = 'coach'
  order by t.created_at
  limit 1;
$$;

/**
 * Set or move day one of the four-week programme.
 *
 * Scoped to the team the caller coaches rather than taking a team id, for the
 * same reason `team_leaderboard` takes none: a function that accepts an id has
 * to be trusted to check it, and one that reads the caller's own membership
 * cannot be pointed at somebody else's squad in the first place.
 *
 * The date is the coach's to set and the app never guesses it. Every recall
 * prompt is derived from it, so a wrong date is visible and correctable rather
 * than baked into rows.
 */
create function public.set_programme_start(p_starts_on date)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  select tm.team_id into v_team
  from public.team_members tm
  where tm.user_id = (select auth.uid()) and tm.role = 'coach'
  limit 1;

  if v_team is null then
    raise exception 'only a coach can set the programme start' using errcode = '42501';
  end if;

  update public.teams set programme_starts_on = p_starts_on where id = v_team;
  return p_starts_on;
end;
$$;

revoke all on function public.create_team(text, date)   from public, anon;
revoke all on function public.my_team()                 from public, anon;
revoke all on function public.set_programme_start(date) from public, anon;
grant execute on function public.create_team(text, date)   to authenticated;
grant execute on function public.my_team()                 to authenticated;
grant execute on function public.set_programme_start(date) to authenticated;
