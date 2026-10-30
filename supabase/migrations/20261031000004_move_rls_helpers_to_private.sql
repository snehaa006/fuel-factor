-- The RLS helpers are only ever called from inside a policy. Living in `public`
-- gave each one a /rest/v1/rpc/ endpoint that anon and authenticated could call
-- directly, which Supabase's security advisor flags. PostgREST only exposes
-- `public`, so moving them to `private` removes the endpoints while the policies
-- keep working.

drop policy "read own or coached participants"  on public.participants;
drop policy "update own participant row"        on public.participants;
drop policy "read own or coached daily logs"    on public.daily_logs;
drop policy "insert own daily logs"             on public.daily_logs;
drop policy "update own daily logs"             on public.daily_logs;
drop policy "read own or coached recalls"       on public.recalls;
drop policy "read own or coached assessments"   on public.assessments;
drop policy "read own profile"                  on public.participant_profiles;
drop policy "read own or coached log items"     on public.log_items;
drop policy "write own log items"               on public.log_items;
drop policy "read own or coached completions"   on public.challenge_completions;
drop policy "write own completions"             on public.challenge_completions;

drop function if exists public.can_see_participant(uuid);
drop function if exists public.coaches_participant(uuid);
drop function if exists public.current_participant_id();

create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated;

create function private.current_participant_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select pp.participant_id from public.participant_profiles pp
  where pp.user_id = (select auth.uid()) limit 1;
$$;

create function private.coaches_participant(p_participant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.participant_profiles pp
    join public.team_members tm on tm.team_id = pp.team_id
    where pp.participant_id = p_participant
      and tm.user_id = (select auth.uid()) and tm.role = 'coach'
  );
$$;

create function private.can_see_participant(p_participant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_participant = private.current_participant_id()
      or private.coaches_participant(p_participant);
$$;

revoke all on function private.current_participant_id()     from public, anon;
revoke all on function private.coaches_participant(uuid)    from public, anon;
revoke all on function private.can_see_participant(uuid)    from public, anon;
grant execute on function private.current_participant_id()  to authenticated;
grant execute on function private.coaches_participant(uuid) to authenticated;
grant execute on function private.can_see_participant(uuid) to authenticated;

create policy "read own or coached participants" on public.participants
  for select to authenticated using (private.can_see_participant(id));

create policy "update own participant row" on public.participants
  for update to authenticated
  using (id = private.current_participant_id())
  with check (id = private.current_participant_id());

create policy "read own or coached daily logs" on public.daily_logs
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "insert own daily logs" on public.daily_logs
  for insert to authenticated
  with check (participant_id = private.current_participant_id());

create policy "update own daily logs" on public.daily_logs
  for update to authenticated
  using (participant_id = private.current_participant_id())
  with check (participant_id = private.current_participant_id());

create policy "read own or coached recalls" on public.recalls
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "read own or coached assessments" on public.assessments
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "read own profile" on public.participant_profiles
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "read own or coached log items" on public.log_items
  for select to authenticated using (
    exists (select 1 from public.daily_logs dl
            where dl.id = daily_log_id and private.can_see_participant(dl.participant_id))
  );

create policy "write own log items" on public.log_items
  for all to authenticated
  using (exists (select 1 from public.daily_logs dl
                 where dl.id = daily_log_id and dl.participant_id = private.current_participant_id()))
  with check (exists (select 1 from public.daily_logs dl
                      where dl.id = daily_log_id and dl.participant_id = private.current_participant_id()));

create policy "read own or coached completions" on public.challenge_completions
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "write own completions" on public.challenge_completions
  for all to authenticated
  using (participant_id = private.current_participant_id())
  with check (participant_id = private.current_participant_id());
