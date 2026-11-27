-- App tier: each week's behaviour question.
--
-- The four other questions are the same every week and are the tab's own
-- columns, so they live with the screen. The fifth changes week to week and
-- is the programme's wording, so it is a row -- a corrected or approved
-- question is an UPDATE, not a release.
create table public.checkin_questions (
  week_number  smallint primary key check (week_number between 1 and 4),
  question     text not null,
  -- How it is answered: one of `options`, a number, or the athlete's words.
  kind         text not null check (kind in ('choice', 'number', 'text')),
  options      text[],
  -- Where the wording comes from: 'week-3-message', 'week-3-slides', or
  -- 'draft' for wording the app proposed and the dietitian has not seen.
  source       text not null,
  reviewed_by  text,
  created_at   timestamptz not null default now(),
  check ((kind = 'choice') = (options is not null))
);

comment on table public.checkin_questions is
  'App tier, never exported. The week''s behaviour question for the Sunday check-in.';

alter table public.checkin_questions enable row level security;

create policy "read check-in questions" on public.checkin_questions
  for select to authenticated using (true);
