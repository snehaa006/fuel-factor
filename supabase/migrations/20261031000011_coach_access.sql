-- Coach access.
--
-- The RLS policies have answered "a coach sees their team's rows" since the
-- first migration, but nothing could ever make a coach: `claim_participant`
-- inserts `team_members` with role 'athlete' and there was no other way in.
-- The dashboard is what needs one.
--
-- A second code rather than a password, for the same reason the athletes have
-- one: nobody wants a credential per person for a squad demo. The two codes
-- are separate so that handing the squad their join code does not hand them
-- the whole team's logs -- an athlete who knows FUEL01 learns nothing about
-- the coach code, and the join code alone can never grant a coach's reach.

alter table public.teams
  add column coach_code text unique;

comment on column public.teams.coach_code is
  'The code that makes a coach. Deliberately not join_code: an athlete who has the join code must not be able to read the whole team.';

/**
 * Make the signed-in user a coach of the team behind this code.
 *
 * Security definer because a device that has joined nothing can read no team
 * row at all, so it cannot look the code up first. It returns the team name
 * so the dashboard has something to show, and nothing else.
 *
 * It never touches `participant_profiles`: a coach is not an athlete, claims
 * nobody, and gets no `current_participant_id()`. That is what keeps the
 * leaderboard and the badges -- which answer about the caller's own athlete --
 * silent for a coach rather than wrong.
 */
create function public.claim_coach(p_coach_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_team uuid;
  v_name text;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select id, name into v_team, v_name
  from public.teams
  where coach_code is not null
    and coach_code = upper(trim(p_coach_code));

  if v_team is null then
    raise exception 'no team with that coach code' using errcode = '22023';
  end if;

  -- A device that already holds an athlete must not quietly become able to
  -- read the whole squad. Releasing the athlete first would be worse, so the
  -- call is refused and the person is told which device they are on.
  if exists (
    select 1 from public.participant_profiles
    where user_id = v_user
  ) then
    raise exception 'this device is signed in as an athlete'
      using errcode = '42501';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (v_team, v_user, 'coach')
  on conflict (team_id, user_id) do update set role = 'coach';

  return v_name;
end;
$$;

revoke all on function public.claim_coach(text) from public, anon;
grant execute on function public.claim_coach(text) to authenticated;

-- The athlete insert policy only ever allowed role 'athlete', so the function
-- above is the only way a coach row is written. Nobody can PATCH themselves
-- into a coaching role.
