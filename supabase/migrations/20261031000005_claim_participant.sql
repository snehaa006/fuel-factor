-- Onboarding: how a signed-in device becomes an athlete.
--
-- The brief's fallback, and the one that fits a squad of teenagers: a team code
-- rather than per-athlete credentials. A device signs in anonymously, is shown
-- the roster for a code, and claims one unclaimed athlete. From that moment row
-- level security answers every "which athlete is this" question on its own.

-- The app's own record that the consent screen was accepted on this device.
--
-- It is NOT participants.consent_signed. That column mirrors the programme's
-- PARTICIPANTS sheet, where it means a parental consent form was signed on
-- paper. A checkbox in an app is not that form, and writing one into the other
-- would put an app event into the study's record dressed as a collected fact.
alter table public.participant_profiles
  add column consent_ack_at timestamptz;

comment on column public.participant_profiles.consent_ack_at is
  'When the under-18 consent screen was accepted in the app. App tier. Not the signed parental form, which is participants.consent_signed.';

-- The roster behind a team code: who is in the team and who is still free to
-- claim. Security definer because a device that has not claimed anybody yet can
-- see no participant row at all. It returns a code and a first name and nothing
-- else -- no measurement, no contact, nothing a team code should not buy.
create function public.team_roster(p_join_code text)
returns table (participant_code text, name text, claimed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.participant_code, p.name, pp.user_id is not null
  from public.teams t
  join public.participant_profiles pp on pp.team_id = t.id
  join public.participants p on p.id = pp.participant_id
  where t.join_code = upper(trim(p_join_code))
  order by p.name;
$$;

/**
 * Link the signed-in user to one athlete in a team.
 *
 * Consent is an argument rather than a later update, so there is no ordering in
 * which an athlete is linked to a row before accepting it. Decision 8 of the
 * brief makes the gate blocking; this makes it blocking in the database rather
 * than only in the UI.
 */
create function public.claim_participant(
  p_join_code       text,
  p_participant_code text,
  p_consent_ack     boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user        uuid := (select auth.uid());
  v_team        uuid;
  v_participant uuid;
  v_claimed_by  uuid;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  if not coalesce(p_consent_ack, false) then
    raise exception 'consent is required before an athlete can be claimed'
      using errcode = '42501';
  end if;

  select id into v_team
  from public.teams
  where join_code = upper(trim(p_join_code));

  if v_team is null then
    raise exception 'no team with that code' using errcode = '22023';
  end if;

  select pp.participant_id, pp.user_id into v_participant, v_claimed_by
  from public.participant_profiles pp
  join public.participants p on p.id = pp.participant_id
  where pp.team_id = v_team
    and upper(p.participant_code) = upper(trim(p_participant_code));

  if v_participant is null then
    raise exception 'no athlete with that code in this team' using errcode = '22023';
  end if;

  -- Claiming the row this device already holds is a no-op, so a retry after a
  -- dropped connection does not look like someone stealing the athlete.
  if v_claimed_by is not null and v_claimed_by <> v_user then
    raise exception 'that athlete is already claimed on another device'
      using errcode = '23505';
  end if;

  -- One device, one athlete: release anything this user held before.
  update public.participant_profiles
  set user_id = null
  where user_id = v_user and participant_id <> v_participant;

  update public.participant_profiles
  set user_id = v_user,
      consent_ack_at = coalesce(consent_ack_at, now())
  where participant_id = v_participant;

  insert into public.team_members (team_id, user_id, role)
  values (v_team, v_user, 'athlete')
  on conflict (team_id, user_id) do nothing;

  return v_participant;
end;
$$;

revoke all on function public.team_roster(text) from public, anon;
revoke all on function public.claim_participant(text, text, boolean) from public, anon;
grant execute on function public.team_roster(text) to authenticated;
grant execute on function public.claim_participant(text, text, boolean) to authenticated;

-- An athlete reads their own profile row to know they are claimed. The write
-- side stays shut: claiming goes through the function above and nowhere else,
-- so nobody can point a profile at themselves with a direct PATCH.
create policy "read own membership row" on public.participant_profiles
  for select to authenticated using (user_id = (select auth.uid()));

create policy "insert own team membership" on public.team_members
  for insert to authenticated with check (user_id = (select auth.uid()) and role = 'athlete');
