-- Badges.
--
-- App tier, and engagement in its purest form: Theo asked for them, the
-- research records nothing like them, and the whole table could be dropped
-- without touching a study column.
--
-- **Every criterion counts what the athlete did in the app, never what they
-- ate.** That is not a safeguarding nicety here, it is the only way a badge
-- can be honest while `dq_score` has no formula: a badge for eating well
-- would need a definition of eating well, and the programme has not written
-- one. A badge for logging for ten days needs nothing from anybody.
--
-- The definitions are rows because they are Theo's to change. Renaming a
-- badge, moving a threshold or adding a new one is an UPDATE or an INSERT,
-- not a deployment -- the same reason the advice rules and the lesson cards
-- are rows.
--
-- Awards are NOT stored. A badge is earned if the athlete's own logs satisfy
-- the criterion, worked out on read, exactly as the streak is. There is no
-- awards table to drift out of step with the logs, and no job that has to run
-- at midnight for a badge to appear.

create type public.badge_criterion as enum (
  -- Distinct days with a daily_logs row, ever.
  'days_logged',
  -- The longest run of consecutive logged days on record.
  'streak',
  -- Weekly challenges marked done.
  'challenges_done'
);

create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  -- What the athlete reads when they have not earned it yet. It states the
  -- criterion in words, so a locked badge is a target rather than a mystery.
  description text not null,
  criterion   public.badge_criterion not null,
  threshold   integer not null check (threshold > 0),
  position    integer not null,
  created_at  timestamptz not null default now(),

  unique (criterion, threshold)
);

comment on table public.badges is
  'Badge definitions. App tier, never exported. Criteria are behavioural only -- no badge is awarded for what an athlete ate, because the programme has defined no scale for that.';

alter table public.badges enable row level security;

-- Reference data: readable by any signed-in user, writable by none. It changes
-- through a migration and Theo''s say-so, not from a phone.
create policy "read badges" on public.badges
  for select to authenticated using (true);
