-- App tier: the mini quiz at the end of each week.
--
-- Theo, 25 November: "a survey or quiz before they move on to the next week
-- ... to ensure that they actually learn." The Sunday check-in (weekly_logs)
-- became Sofia's WEEKLY LOG questions; this is the learning check beside it.
-- One question for each day's fun fact (daily_facts), so the seven cover the
-- whole week's lesson and a score says which parts did not stick.
--
-- quiz_questions is content, like daily_facts: readable by any signed-in
-- account, written by nobody from a phone. quiz_results is the athlete's own:
-- one row per athlete per week, the latest attempt, readable by their coach.
-- Neither is a tracker tab; the coach's export carries the results as a file
-- of their own.

create table public.quiz_questions (
  week_number  smallint not null check (week_number between 1 and 4),
  position     smallint not null check (position between 1 and 7),
  question     text not null,
  question_id  text,
  options      text[] not null,
  options_id   text[],
  answer       smallint not null check (answer >= 0),
  source       text not null,
  reviewed_by  text,
  created_at   timestamptz not null default now(),
  primary key (week_number, position),
  check (answer < array_length(options, 1)),
  check (options_id is null or array_length(options_id, 1) = array_length(options, 1))
);

comment on table public.quiz_questions is
  'App tier, never exported. The mini quiz: one question per day''s fun fact.';

alter table public.quiz_questions enable row level security;

create policy "read quiz questions" on public.quiz_questions
  for select to authenticated using (true);

create table public.quiz_results (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants (id) on delete cascade,
  week            smallint not null check (week between 1 and 4),
  answers         smallint[] not null,
  score           smallint not null check (score >= 0),
  total           smallint not null check (total > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (participant_id, week),
  check (score <= total)
);

comment on table public.quiz_results is
  'App tier. An athlete''s latest mini quiz score for a week.';

alter table public.quiz_results enable row level security;

create policy "read own or coached quiz results" on public.quiz_results
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "insert own quiz results" on public.quiz_results
  for insert to authenticated
  with check (participant_id = private.current_participant_id());

create policy "update own quiz results" on public.quiz_results
  for update to authenticated
  using (participant_id = private.current_participant_id())
  with check (participant_id = private.current_participant_id());
