-- App tier: when the training session was.
--
-- Two of the five seeded advice rules fire relative to a session --
-- "a proper meal 2 to 3 hours before training", "refuel within 30 minutes" --
-- and until now nothing recorded one, so both sat dormant. The deck's windows
-- are the programme's; the clock they are measured against is the app's job.
--
-- Tier 2, deliberately. The tracker has no session-time column and this must
-- never reach the CSV export, so it is its own table rather than two more
-- columns on daily_logs. Dropping the app tier drops this with it.
--
-- Keyed on the daily log, which already carries the participant and the date,
-- so there is one session per day and the RLS is the same shape as log_items.

create table public.training_sessions (
  daily_log_id uuid primary key references public.daily_logs (id) on delete cascade,
  -- Local wall clock, not a timestamp. The athlete reads a time off a training
  -- schedule and types it; storing it as the time of that log's own day keeps
  -- the comparison the rules make a comparison between two wall clocks.
  starts_at    time,
  ends_at      time,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A session that ends before it starts is a typo, not a session. Either may
  -- stand alone: the pre-training rule needs only the start and the refuel
  -- rule needs only the end, so one is useful without the other.
  constraint ends_after_it_starts
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

comment on table public.training_sessions is
  'App tier. Never exported: the tracker records no session time, and this exists only so the timing advice rules have a clock to measure against.';

alter table public.training_sessions enable row level security;

-- Same shape as log_items: a coach reads their team's, an athlete writes only
-- their own, so a coach can never put a time in an athlete's day.
create policy "read own or coached training sessions" on public.training_sessions
  for select to authenticated using (
    exists (select 1 from public.daily_logs dl
            where dl.id = daily_log_id and private.can_see_participant(dl.participant_id))
  );

create policy "write own training sessions" on public.training_sessions
  for all to authenticated
  using (exists (select 1 from public.daily_logs dl
                 where dl.id = daily_log_id and dl.participant_id = private.current_participant_id()))
  with check (exists (select 1 from public.daily_logs dl
                      where dl.id = daily_log_id and dl.participant_id = private.current_participant_id()));

create trigger touch_training_sessions before update on public.training_sessions
  for each row execute function public.touch_updated_at();
