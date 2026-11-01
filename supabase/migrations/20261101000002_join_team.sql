-- Joining a team from an invite link.
--
-- Before this, every athlete already existed: the research team typed the
-- PARTICIPANTS sheet into `participants`, and the app's job was only to let a
-- device claim one of those rows. A coach who creates a team and sends a link
-- to a squad has nobody to claim, so the app has to be able to create the row.
--
-- **This is the first time the app writes a research table.** `participants`
-- mirrors the programme's PARTICIPANTS sheet and the CSV export reads it, so
-- it is worth being exact about what that means: the row is created from a
-- questionnaire the athlete fills in themselves, which is what the dietitian
-- described on the 30 October call -- "if a participant gets into the app,
-- he'll have to fill in his height, weight, and certain parameters". The
-- questionnaire asks the sheet's own questions and adds none.
--
-- Two of its columns need saying out loud:
--
--   `consent_signed` means a parental consent form was signed on paper. The
--   athlete is answering a question *about* that form, not signing one here. A
--   checkbox is still not the form, which is why `consent_ack_at` on
--   `participant_profiles` continues to exist separately and continues to be
--   the thing the gate writes.
--
--   `participant_code` is generated, never typed. A joiner who typed 'T-01'
--   would be typing Theo's real row, and the function would either collide or
--   hand them somebody else's baseline.
--
-- The claim path is untouched. A team whose roster already holds unclaimed
-- athletes still offers them, so the three seeded footballers are claimed with
-- their tracker-measured heights and weights intact and are never overwritten
-- by a self-report.

/**
 * The next free participant code for a name.
 *
 * The sheet's own convention: an initial, a dash and a two-digit number
 * ('J-01', 'T-01'). Jacob became 'JA-01' there because 'J' was already
 * Jeongho's; here a second J simply takes 'J-02', which is unique, obvious to
 * read and needs no prefix arithmetic.
 */
create function private.next_participant_code(p_name text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_initial text;
  v_next    int;
begin
  -- Non-Latin or empty names get 'X' rather than a mangled byte. The code is
  -- an identifier, not a rendering of the name.
  v_initial := upper(substring(regexp_replace(coalesce(p_name, ''), '[^A-Za-z]', '', 'g') from 1 for 1));
  if v_initial is null or v_initial = '' then
    v_initial := 'X';
  end if;

  select coalesce(max(substring(p.participant_code from '([0-9]+)$')::int), 0) + 1
  into v_next
  from public.participants p
  where p.participant_code like v_initial || '-%';

  return v_initial || '-' || lpad(v_next::text, 2, '0');
end;
$$;

revoke all on function private.next_participant_code(text) from public, anon, authenticated;

/**
 * Join a team by its code, creating this athlete's participant row.
 *
 * Consent is an argument rather than a later update, exactly as in
 * `claim_participant`: there is no ordering in which a device is linked to an
 * athlete before the screen was accepted, and the database refuses it rather
 * than the UI merely not offering it.
 *
 * Security definer because a device that has joined nothing can read no team
 * and write no participant. `participants` deliberately gains no insert policy
 * from this migration, so this function stays the only route a participant row
 * is ever created by from a phone.
 *
 * The measurements are bounded only against obvious nonsense -- a height of
 * 1760 cm is a typo, not a finding. These are not nutrition thresholds and
 * nothing judges the values; they are the range in which a figure is a human
 * measurement at all, so that a direct call to this endpoint cannot write
 * rubbish into the study's own record.
 */
create function public.join_team(
  p_join_code      text,
  p_name           text,
  p_consent_ack    boolean,
  p_sport          text    default null,
  p_age_band       text    default null,
  p_height_cm      numeric default null,
  p_weight_kg      numeric default null,
  p_waist_cm       numeric default null,
  p_muac_cm        numeric default null,
  p_calf_cm        numeric default null,
  p_consent_signed boolean default false,
  p_parent_contact text    default null,
  p_notes          text    default null
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
  v_name        text := nullif(trim(p_name), '');
  v_code        text;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  if not coalesce(p_consent_ack, false) then
    raise exception 'consent is required before joining a team' using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'a name is required' using errcode = '22023';
  end if;

  select id into v_team
  from public.teams
  where join_code = upper(trim(p_join_code));

  if v_team is null then
    raise exception 'no team with that code' using errcode = '22023';
  end if;

  -- A device already holding an athlete rejoins rather than creating a second
  -- person. Creating one would leave the first row orphaned in a research
  -- table with nobody able to reach it, which is a fabricated participant.
  if exists (select 1 from public.participant_profiles where user_id = v_user) then
    raise exception 'this device has already joined as an athlete' using errcode = '42501';
  end if;

  -- A coach's account must not also become an athlete, the mirror of the check
  -- in create_team and claim_coach.
  if exists (
    select 1 from public.team_members tm
    where tm.user_id = v_user and tm.role = 'coach'
  ) then
    raise exception 'this account is signed in as a coach' using errcode = '42501';
  end if;

  if p_height_cm is not null and (p_height_cm < 100 or p_height_cm > 250) then
    raise exception 'height should be in centimetres, between 100 and 250' using errcode = '22023';
  end if;
  if p_weight_kg is not null and (p_weight_kg < 20 or p_weight_kg > 200) then
    raise exception 'weight should be in kilograms, between 20 and 200' using errcode = '22023';
  end if;
  if p_waist_cm is not null and (p_waist_cm < 20 or p_waist_cm > 200) then
    raise exception 'waist should be in centimetres' using errcode = '22023';
  end if;
  if p_muac_cm is not null and (p_muac_cm < 10 or p_muac_cm > 80) then
    raise exception 'mid-upper arm circumference should be in centimetres' using errcode = '22023';
  end if;
  if p_calf_cm is not null and (p_calf_cm < 10 or p_calf_cm > 80) then
    raise exception 'calf circumference should be in centimetres' using errcode = '22023';
  end if;

  v_code := private.next_participant_code(v_name);

  insert into public.participants (
    participant_code, name, sport, age_band,
    height_cm, weight_kg, waist_cm, muac_cm, calf_cm,
    consent_signed, parent_contact, notes
  )
  values (
    v_code, v_name, nullif(trim(p_sport), ''), nullif(trim(p_age_band), ''),
    p_height_cm, p_weight_kg, p_waist_cm, p_muac_cm, p_calf_cm,
    coalesce(p_consent_signed, false), nullif(trim(p_parent_contact), ''),
    nullif(trim(p_notes), '')
  )
  returning id into v_participant;

  insert into public.participant_profiles (participant_id, team_id, user_id, consent_ack_at)
  values (v_participant, v_team, v_user, now());

  insert into public.team_members (team_id, user_id, role)
  values (v_team, v_user, 'athlete')
  on conflict (team_id, user_id) do nothing;

  return v_participant;
end;
$$;

/**
 * Does a team with this code exist, and what is it called?
 *
 * The invite link lands on a screen that has to say which squad it is for
 * before asking a 14 year old to fill in a questionnaire. It returns a name
 * and nothing else -- deliberately not the roster, which `team_roster`
 * already answers and which is a list of named minors.
 */
create function public.team_by_code(p_join_code text)
returns table (name text, programme_starts_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select t.name, t.programme_starts_on
  from public.teams t
  where t.join_code = upper(trim(p_join_code));
$$;

revoke all on function public.join_team(text, text, boolean, text, text, numeric, numeric, numeric, numeric, numeric, boolean, text, text) from public, anon;
revoke all on function public.team_by_code(text) from public, anon;
grant execute on function public.join_team(text, text, boolean, text, text, numeric, numeric, numeric, numeric, numeric, boolean, text, text) to authenticated;
grant execute on function public.team_by_code(text) to authenticated;
