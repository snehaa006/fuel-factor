-- Research tier.
--
-- These four tables mirror the programme's Google tracker column for column.
-- The CSV export reads ONLY these. Nothing the app invents is added here: if the
-- programme wants a new field it goes in their workbook first and here second.
--
-- Sources: PARTICIPANTS, RECALL - <athlete>, DAILY LOG and ASSESSMENTS sheets.

create extension if not exists "pgcrypto";

-- The tracker's Day Type dropdown only ever holds these two. The Week 1 material
-- also gives a game-day carbohydrate band, but "game" is not a value their sheet
-- carries, so it is deliberately absent until the dietitian adds it.
create type public.day_type as enum ('training', 'rest');

-- PARTICIPANTS sheet.
create table public.participants (
  id                uuid primary key default gen_random_uuid(),
  participant_code  text not null unique,          -- "J-01", "T-01"
  name              text not null,
  sport             text,
  age_band          text,                          -- the sheet records "14-16", not an integer
  height_cm         numeric(5, 1),
  weight_kg         numeric(5, 1),
  waist_cm          numeric(5, 1),
  muac_cm           numeric(5, 1),
  calf_cm           numeric(5, 1),
  consent_signed    boolean not null default false,
  parent_contact    text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.participants is
  'Mirrors the PARTICIPANTS sheet. Research tier: no app-only columns here.';
comment on column public.participants.age_band is
  'Text, because the sheet records a band ("14-16") rather than an age.';

-- DAILY LOG sheet. One row per athlete per day, columns 1-22 in sheet order.
create table public.daily_logs (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.participants (id) on delete cascade,
  log_date          date not null,
  day_type          public.day_type,

  -- Columns 4-9: the six meal slots, recorded as ticks.
  breakfast         boolean not null default false,
  pre_training      boolean not null default false,
  lunch             boolean not null default false,
  post_training     boolean not null default false,
  dinner            boolean not null default false,
  evening_snack     boolean not null default false,

  -- Columns 10-13: counts, not grades. The programme has set no serving targets.
  fruit_servings    smallint check (fruit_servings between 0 and 20),
  veg_servings      smallint check (veg_servings between 0 and 20),
  protein_sources   smallint check (protein_sources between 0 and 20),
  carb_portions     smallint check (carb_portions between 0 and 20),

  fluid_ml          integer  check (fluid_ml between 0 and 15000),
  urine_colour      smallint check (urine_colour between 1 and 8),

  -- Columns 16-20: the five 1-10 self-ratings.
  energy_am         smallint check (energy_am between 1 and 10),
  energy_training   smallint check (energy_training between 1 and 10),
  recovery          smallint check (recovery between 1 and 10),
  mood              smallint check (mood between 1 and 10),
  concentration     smallint check (concentration between 1 and 10),

  -- Column 21. The sheet names it and states no formula, so the app does not
  -- compute one. It stays null until the dietitian defines the rule.
  dq_score          smallint check (dq_score between 0 and 12),

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (participant_id, log_date)
);

comment on column public.daily_logs.dq_score is
  'DQ Score /12 from the sheet. No formula has been stated, so the app leaves this null rather than inventing one.';
comment on column public.daily_logs.fruit_servings is
  'A count. The programme has set no serving target, so nothing grades it.';

-- RECALL sheets, one per athlete, collapsed into one table.
create table public.recalls (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.participants (id) on delete cascade,
  day_number        smallint not null check (day_number > 0),
  recall_date       date,
  day_type          public.day_type,
  sleep_hours       numeric(3, 1) check (sleep_hours between 0 and 24),
  breakfast         text,
  lunch             text,
  dinner            text,
  activities        text,
  supplements       text,
  notes             text,
  fluid_ml          integer  check (fluid_ml between 0 and 15000),
  est_calories      integer  check (est_calories between 0 and 10000),
  energy            smallint check (energy between 1 and 10),
  recovery          smallint check (recovery between 1 and 10),
  urine_colour      smallint check (urine_colour between 1 and 8),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (participant_id, day_number)
);

comment on column public.recalls.est_calories is
  'The sheet currently holds hand-typed estimates. Re-entering these days through the food database replaces them with computed values.';

-- ASSESSMENTS sheet, normalised out of its one-column-pair-per-athlete layout.
create table public.assessments (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.participants (id) on delete cascade,
  domain            text not null,   -- ANTHROPOMETRY, AEROBIC, SPEED, POWER, CARDIOVASCULAR, DIETARY, SUBJECTIVE, HYDRATION
  measure           text not null,   -- "30m Sprint - Attempt 1"
  unit              text,
  pre_value         numeric(10, 2),
  post_value        numeric(10, 2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (participant_id, domain, measure)
);

comment on table public.assessments is
  'Measured on a pitch by a coach, not entered by an athlete. The app reads these for the before/after screen; it does not capture them in v1.';

create index on public.daily_logs (participant_id, log_date desc);
create index on public.recalls (participant_id, day_number);
create index on public.assessments (participant_id);

-- Keep updated_at honest without the app having to remember.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_participants before update on public.participants
  for each row execute function public.touch_updated_at();
create trigger touch_daily_logs before update on public.daily_logs
  for each row execute function public.touch_updated_at();
create trigger touch_recalls before update on public.recalls
  for each row execute function public.touch_updated_at();
create trigger touch_assessments before update on public.assessments
  for each row execute function public.touch_updated_at();
