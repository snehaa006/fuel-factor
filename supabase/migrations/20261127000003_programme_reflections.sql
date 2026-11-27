-- App tier: the end-of-programme reflection.
--
-- Sofia, 25 November: "I did mention about a post assessment, like maybe once
-- the post assessment, like the subjective feedback, like how was the
-- programme? Did you like it? What was your best takeaway? Things like that."
-- Theo: "It's like a reflection, right? ... Just like a reflection and
-- feedback."
--
-- One row per athlete, asked once the four weeks are done. The tracker has no
-- tab for it yet, so it is app tier and the coach's export carries it as a
-- sheet of its own.

create table public.programme_reflections (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null unique references public.participants (id) on delete cascade,
  rating          smallint check (rating between 1 and 10),        -- "how was the programme?"
  liked           text check (liked in ('Yes', 'Somewhat', 'No')), -- "did you like it?"
  best_takeaway   text,                                             -- "what was your best takeaway?"
  feedback        text,                                             -- anything else, for the app or the programme
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.programme_reflections is
  'App tier. The athlete''s own end-of-programme reflection, asked once the four weeks are done.';

alter table public.programme_reflections enable row level security;

-- The athlete writes their own; the coach reads the squad's and writes none.
create policy "read own or coached reflections" on public.programme_reflections
  for select to authenticated using (private.can_see_participant(participant_id));

create policy "insert own reflection" on public.programme_reflections
  for insert to authenticated
  with check (participant_id = private.current_participant_id());

create policy "update own reflection" on public.programme_reflections
  for update to authenticated
  using (participant_id = private.current_participant_id())
  with check (participant_id = private.current_participant_id());
