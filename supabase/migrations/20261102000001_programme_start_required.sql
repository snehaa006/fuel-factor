-- The programme's first day stops being optional.
--
-- It was nullable in every sense: the column allows null, `create_team` took
-- `p_starts_on default null`, `set_programme_start(null)` cleared it, and the
-- coach's screen labelled the field OPTIONAL. The reasoning at the time was
-- sound as far as it went -- the app must never guess a date nobody chose --
-- and the consequence was that a team could exist for weeks with no day one.
--
-- What that costs is now visible, because the app gates on this date:
--
--   * The follow-up recall is four weeks after day one, so with no date there
--     is nothing to count from and the second round of the research
--     instrument never opens. That is the half of the study that makes it a
--     study.
--   * Meal logging, the check-in, the ring and the streak all belong to the
--     four weeks of the intervention. Logging that starts whenever an athlete
--     happens to join produces days that sit outside the programme and
--     muddle the before-and-after.
--
-- So the date is asked for once, when the team is created, and the only thing
-- that can be done to it afterwards is to move it. Clearing it is refused:
-- a squad mid-programme whose start date vanished would have every athlete
-- locked back out of logging, and no screen in the app can put it back
-- except this same function.
--
-- The column stays nullable. `teams` already holds rows created before this
-- -- the seeded Jakarta U16 among them -- and a NOT NULL would have to invent
-- a date for each of them, which is the one thing this whole area refuses to
-- do. The app reads a null date as "your coach has not set day one yet" and
-- shows the athlete their baseline recall and nothing else.

create or replace function public.create_team(p_name text, p_starts_on date default null)
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

  -- New since this migration. The default stays on the argument so the
  -- signature, and every grant on it, is the one that already existed.
  if p_starts_on is null then
    raise exception 'a team needs the first day of the programme' using errcode = '22023';
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
 * Move day one of the four-week programme.
 *
 * Scoped to the team the caller coaches rather than taking a team id, for the
 * same reason `team_leaderboard` takes none: a function that accepts an id has
 * to be trusted to check it, and one that reads the caller's own membership
 * cannot be pointed at somebody else's squad in the first place.
 *
 * It no longer clears the date. Moving day one moves the follow-up recall and
 * the day logging opens, which is a coach's call to make; removing it would
 * shut the whole squad out of the app with no screen able to undo it.
 */
create or replace function public.set_programme_start(p_starts_on date)
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

  if p_starts_on is null then
    raise exception 'the programme needs a first day; move it rather than clearing it'
      using errcode = '22023';
  end if;

  update public.teams set programme_starts_on = p_starts_on where id = v_team;
  return p_starts_on;
end;
$$;

comment on column public.teams.programme_starts_on is
  'Day one of the four weeks. Set when the team is created and only ever moved after that. '
  'Null on teams created before it was required; the app reads that as not set yet and holds '
  'those athletes to their baseline recall.';
