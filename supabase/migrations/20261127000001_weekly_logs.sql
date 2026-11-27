-- Research tier: the WEEKLY LOG tab, which the app's Sunday check-in now fills.
--
-- The tab, in the research tracker: "Collected every Sunday via WhatsApp.
-- Theo enters group responses here. One row per athlete per week." On the 25 November call Sofia pointed the app at
-- it: "There's a tab called Weekly Log, so you can use those questions for
-- capturing if the athlete has really understood what has been taught." So
-- the athlete now answers in the app, and the answers land here, in the
-- tab's own columns and order, where the export will read them.
--
-- Column for column with the tab:
--   Week | Theme | Athlete | Avg Training Energy (1-10) | Avg Urine Colour (1-8)
--   | Avg Fluid (mL/day) | Breakfast Compliance | Week Behaviour Check | Answer | Notes
--
-- Two readings of the tab, both kept as the tab has them:
--   * The athlete's answer to the week's behaviour question goes in
--     week_behaviour_check -- that is where every row the tracker holds puts
--     it ("Less cramps", "Every meal", "7:30 hours", "Better").
--   * answer is empty in every row of the tab, and the app leaves it empty.
--     It is mirrored so the export has the tab's shape, not filled with a
--     guess at what it was for.
--
-- The averages are numeric(3,1): the tracker records whole numbers, but an
-- average is what the column names and a half is a real answer.

create table public.weekly_logs (
  id                   uuid primary key default gen_random_uuid(),
  week                 smallint not null check (week between 1 and 4),
  theme                text,
  participant_id       uuid not null references public.participants (id) on delete cascade,
  avg_training_energy  numeric(3, 1) check (avg_training_energy between 1 and 10),
  avg_urine_colour     numeric(3, 1) check (avg_urine_colour between 1 and 8),
  avg_fluid_ml         integer check (avg_fluid_ml between 0 and 15000),
  breakfast_compliance text,
  week_behaviour_check text,
  answer               text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique (participant_id, week)
);

comment on table public.weekly_logs is
  'Mirrors the WEEKLY LOG tab. Research tier: no app-only columns here.';
comment on column public.weekly_logs.week_behaviour_check is
  'The athlete''s answer to the week''s behaviour question, where the tracker puts it.';
comment on column public.weekly_logs.answer is
  'Empty in every row of the tab; mirrored for the export''s shape and left empty.';

alter table public.weekly_logs enable row level security;

-- An athlete writes their own week; a coach reads their squad's and writes
-- none, the rule daily_logs already follows: a coach never puts words in an
-- athlete's answers.
create policy "read own or coached weekly logs" on public.weekly_logs
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "insert own weekly logs" on public.weekly_logs
  for insert to authenticated
  with check (participant_id = private.current_participant_id());

create policy "update own weekly logs" on public.weekly_logs
  for update to authenticated
  using (participant_id = private.current_participant_id())
  with check (participant_id = private.current_participant_id());

create index on public.weekly_logs (participant_id);
