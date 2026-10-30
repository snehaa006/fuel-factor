-- Row level security.
--
-- An athlete sees their own rows. A coach sees their team's. Nobody else sees
-- anything. This is also the B2B story: a school's data is isolated by team.

alter table public.participants          enable row level security;
alter table public.daily_logs            enable row level security;
alter table public.recalls               enable row level security;
alter table public.assessments           enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;
alter table public.participant_profiles  enable row level security;
alter table public.food_items            enable row level security;
alter table public.food_portions         enable row level security;
alter table public.log_items             enable row level security;
alter table public.weekly_challenges     enable row level security;
alter table public.challenge_completions enable row level security;
alter table public.advice_rules          enable row level security;

-- Helpers. SECURITY DEFINER so a policy can look past the caller's own RLS
-- without recursing, with search_path pinned.
create or replace function public.current_participant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pp.participant_id
  from public.participant_profiles pp
  where pp.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.coaches_participant(p_participant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.participant_profiles pp
    join public.team_members tm on tm.team_id = pp.team_id
    where pp.participant_id = p_participant
      and tm.user_id = (select auth.uid())
      and tm.role = 'coach'
  );
$$;

create or replace function public.can_see_participant(p_participant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_participant = public.current_participant_id()
      or public.coaches_participant(p_participant);
$$;

-- Participants ---------------------------------------------------------------
create policy "read own or coached participants" on public.participants
  for select to authenticated using (public.can_see_participant(id));

create policy "update own participant row" on public.participants
  for update to authenticated
  using (id = public.current_participant_id())
  with check (id = public.current_participant_id());

-- Daily logs: an athlete owns their own; a coach reads but never writes, so a
-- coach can never put words in an athlete's log.
create policy "read own or coached daily logs" on public.daily_logs
  for select to authenticated using (public.can_see_participant(participant_id));

create policy "insert own daily logs" on public.daily_logs
  for insert to authenticated
  with check (participant_id = public.current_participant_id());

create policy "update own daily logs" on public.daily_logs
  for update to authenticated
  using (participant_id = public.current_participant_id())
  with check (participant_id = public.current_participant_id());

-- Recalls and assessments: read-only to athletes and coaches. Both are filled
-- by the research team, not through the app.
create policy "read own or coached recalls" on public.recalls
  for select to authenticated using (public.can_see_participant(participant_id));

create policy "read own or coached assessments" on public.assessments
  for select to authenticated using (public.can_see_participant(participant_id));

-- Teams ----------------------------------------------------------------------
create policy "read own teams" on public.teams
  for select to authenticated using (
    exists (select 1 from public.team_members tm
            where tm.team_id = id and tm.user_id = (select auth.uid()))
  );

create policy "read own membership" on public.team_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "read own profile" on public.participant_profiles
  for select to authenticated using (public.can_see_participant(participant_id));

-- Log items follow their parent day.
create policy "read own or coached log items" on public.log_items
  for select to authenticated using (
    exists (select 1 from public.daily_logs dl
            where dl.id = daily_log_id and public.can_see_participant(dl.participant_id))
  );

create policy "write own log items" on public.log_items
  for all to authenticated
  using (
    exists (select 1 from public.daily_logs dl
            where dl.id = daily_log_id and dl.participant_id = public.current_participant_id())
  )
  with check (
    exists (select 1 from public.daily_logs dl
            where dl.id = daily_log_id and dl.participant_id = public.current_participant_id())
  );

-- Challenge completions.
create policy "read own or coached completions" on public.challenge_completions
  for select to authenticated using (public.can_see_participant(participant_id));

create policy "write own completions" on public.challenge_completions
  for all to authenticated
  using (participant_id = public.current_participant_id())
  with check (participant_id = public.current_participant_id());

-- Reference data: readable by every signed-in user, writable by none of them.
-- The food database and the advice rules change through migrations and the
-- dietitian's review, never from a phone.
create policy "read food items" on public.food_items
  for select to authenticated using (true);
create policy "read food portions" on public.food_portions
  for select to authenticated using (true);
create policy "read challenges" on public.weekly_challenges
  for select to authenticated using (true);
create policy "read active advice rules" on public.advice_rules
  for select to authenticated using (active);
