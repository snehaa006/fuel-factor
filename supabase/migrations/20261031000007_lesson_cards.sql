-- App tier: the Learn section's cards.
--
-- The programme is four weeks with one theme each, and week 1 is the only one
-- written. Lessons are rows rather than screens so weeks 2 to 4 arrive as an
-- INSERT and not as a code change -- the same reason the advice rules and the
-- food database are rows.
--
-- Nothing here is authored by the app. Every string is the week's own
-- material, copied across, and a card the programme has not written simply has
-- no row.

create table public.lesson_cards (
  id           uuid primary key default gen_random_uuid(),
  week_number  smallint not null check (week_number between 1 and 4),
  position     smallint not null,
  -- What shape the card is, so the screen knows how to draw it. A kind the
  -- app cannot draw is skipped rather than guessed at.
  kind         text not null check (kind in (
                 'intro', 'stats', 'myth_fact', 'process', 'timeline',
                 'timing', 'targets', 'foods', 'challenge', 'references'
               )),
  heading      text,
  body         text,
  -- The citation the deck prints under a figure, where it prints one.
  source_note  text,
  source       text not null,            -- 'week-1-deck'
  created_at   timestamptz not null default now(),
  unique (week_number, position)
);

comment on table public.lesson_cards is
  'App tier, never exported. Every string is the programme''s own teaching material; the app writes none of it.';

-- The rows inside a card: a statistic, a myth and its fact, a step of the
-- glycogen chain, a point on the timeline, a target band.
create table public.lesson_points (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.lesson_cards (id) on delete cascade,
  position   smallint not null,
  label      text,
  value      text,
  detail     text,
  created_at timestamptz not null default now(),
  unique (card_id, position)
);

alter table public.lesson_cards  enable row level security;
alter table public.lesson_points enable row level security;

-- Reference data, exactly like the food database: readable by any signed-in
-- user, writable by none. Teaching material changes through a migration and
-- the dietitian's review, never from a phone.
create policy "read lesson cards" on public.lesson_cards
  for select to authenticated using (true);
create policy "read lesson points" on public.lesson_points
  for select to authenticated using (true);
