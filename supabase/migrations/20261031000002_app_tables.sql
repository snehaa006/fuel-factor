-- App tier.
--
-- Everything the product needs that the research does not record: teams, the
-- streak, the challenge, the food database. None of this is exported, and the
-- whole tier can be dropped without touching a research column.

create type public.meal_slot as enum
  ('breakfast', 'pre_training', 'lunch', 'post_training', 'dinner', 'evening_snack');

create type public.team_role as enum ('athlete', 'coach');

-- Theo asked to work with teams rather than individuals. The tracker has no
-- team column, so this lives here.
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique,
  created_at  timestamptz not null default now()
);

create table public.team_members (
  team_id     uuid not null references public.teams (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.team_role not null default 'athlete',
  created_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Links a research participant to a team and a signed-in user. Kept out of the
-- participants table so that table stays a mirror of the sheet.
create table public.participant_profiles (
  participant_id uuid primary key references public.participants (id) on delete cascade,
  team_id        uuid references public.teams (id) on delete set null,
  user_id        uuid unique references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);

-- The Indonesian food database. Macros come from the programme's own material
-- and from TKPI; the app never invents a number for a food.
create table public.food_items (
  id            uuid primary key default gen_random_uuid(),
  name_id       text not null,            -- as an athlete says it: "Nasi putih"
  name_en       text,
  category      text,                     -- carbohydrate, protein, fruit, vegetable, drink, snack
  -- The Week 1 deck sorts foods into exactly two registers. No food is ever
  -- labelled bad, so these are the only two values.
  guidance      text not null check (guidance in ('eat_daily', 'not_the_priority')),
  guidance_note text,                     -- the deck's own words, where it gives them
  is_pork       boolean not null default false,
  source        text not null,            -- 'week-1-deck', 'tkpi', ...
  created_at    timestamptz not null default now()
);

comment on column public.food_items.is_pork is
  'Pork may be logged, because an athlete must be able to record what they ate, but it is never suggested.';

-- One row per portion an athlete can pick. Macros are nullable on purpose: the
-- Week 1 deck gives kcal and carbs for some foods and nothing for others, and a
-- null is honest where a guess would not be.
create table public.food_portions (
  id            uuid primary key default gen_random_uuid(),
  food_id       uuid not null references public.food_items (id) on delete cascade,
  label         text not null,            -- "1 bowl", "200g cooked", "1 medium"
  grams         numeric(7, 1),
  kcal          numeric(7, 1),
  carbs_g       numeric(7, 1),
  protein_g     numeric(7, 1),
  fat_g         numeric(7, 1),
  source_note   text,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (food_id, label)
);

comment on table public.food_portions is
  'Null macros mean the programme has not supplied them yet. Never fill one with an estimate.';

-- What an athlete actually logged, slot by slot. Finer than the sheet, which
-- wants a tick per slot and one daily calorie figure; both roll up from here.
create table public.log_items (
  id              uuid primary key default gen_random_uuid(),
  daily_log_id    uuid not null references public.daily_logs (id) on delete cascade,
  slot            public.meal_slot not null,
  food_portion_id uuid references public.food_portions (id) on delete set null,
  quantity        numeric(5, 2) not null default 1 check (quantity > 0),
  free_text       text,                   -- what they typed, when no database match fits
  logged_at       timestamptz not null default now(),
  check (food_portion_id is not null or free_text is not null)
);

create index on public.log_items (daily_log_id, slot);

-- The four-week programme's challenges.
create table public.weekly_challenges (
  id           uuid primary key default gen_random_uuid(),
  week_number  smallint not null unique check (week_number between 1 and 4),
  theme        text not null,             -- "Carbohydrates"
  challenge    text not null,             -- "Add one carb to every meal"
  starts_on    date,
  created_at   timestamptz not null default now()
);

create table public.challenge_completions (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.weekly_challenges (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  completed_on   date not null,
  photo_path     text,                    -- storage object path, never a URL
  created_at     timestamptz not null default now(),
  unique (challenge_id, participant_id, completed_on)
);

-- The advice engine's rule table. Every row is a sentence the programme has
-- already taught, fired on a plain event. Thresholds are not invented here.
create table public.advice_rules (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,       -- 'no_carbs_at_slot'
  domain      text not null,              -- carbohydrate, hydration, timing
  trigger     text not null,              -- the event, in words, for review
  message_en  text not null,
  message_id  text,                       -- Bahasa Indonesia
  source      text not null,              -- 'week-1-deck'
  severity    smallint not null default 1 check (severity between 1 and 3),
  reviewed_by text,                       -- null until the dietitian signs it off
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on column public.advice_rules.reviewed_by is
  'Null means a seed rule. The dietitian''s name here is what marks a rule as cleared for the real programme.';
