-- The recall, filled in the app.
--
-- `recalls` has been read-only to everyone since the first RLS migration, on
-- the grounds that recalls are filled by the research team. That was true of
-- the baseline: the three-day recall behind this study arm was collected on
-- paper and typed into the tracker. It is not what the programme wants next.
-- From the 30 October call, on the four-week follow-up: "post one month, the
-- app can prompt the participant to try to fulfill the data again or food
-- recalls". A participant who is prompted by the app has to be able to answer
-- in it.
--
-- So an athlete may now write their own recall rows, and only their own. A
-- coach still cannot: `recalls` gets no coach write policy, for the same
-- reason `daily_logs` has none -- a coach who can write a recall can put words
-- in an athlete's mouth inside the study's own record.
--
-- The form carries the RECALL sheet's columns and adds none. `est_calories` is
-- the one column it does not ask for: the sheet holds hand-typed estimates
-- there, and the whole point of putting a recall through the food database is
-- to stop those being hand-typed. The computed figures land in
-- `recall_nutrition` below, which is app tier and is not exported.

create policy "insert own recalls" on public.recalls
  for insert to authenticated
  with check (participant_id = private.current_participant_id());

create policy "update own recalls" on public.recalls
  for update to authenticated
  using (participant_id = private.current_participant_id())
  with check (participant_id = private.current_participant_id());

-- What the food database made of a recall ------------------------------------
--
-- App tier, keyed on the recall, so the research table gains no column and the
-- CSV export cannot pick a computed number up and present it as a collected
-- one. Every macro is nullable for the same reason `food_portions` macros are:
-- the programme has supplied carbohydrate figures for seven foods and no
-- protein or fat figure for any food at all, so a null here is the honest
-- answer and a zero would be a fabricated one.

create type public.nutrition_method as enum (
  -- Nothing has been computed. The composition tables the dietitian described
  -- are not in this database yet, so this is what every row says today.
  'not_computed',
  -- Computed by matching the recall's meals against food_items/food_portions.
  'food_database'
);

create table public.recall_nutrition (
  recall_id    uuid primary key references public.recalls (id) on delete cascade,
  method       public.nutrition_method not null default 'not_computed',
  kcal         numeric(7, 1),
  carbs_g      numeric(7, 1),
  protein_g    numeric(7, 1),
  fat_g        numeric(7, 1),
  -- Why a figure is missing, in words, so a screen can say so rather than
  -- showing a dash and leaving an athlete to guess.
  note         text,
  computed_at  timestamptz not null default now()
);

comment on table public.recall_nutrition is
  'What the food database made of one recall day. App tier: never exported. Null macros mean not computed, never zero.';
comment on column public.recall_nutrition.method is
  'How the figures were arrived at. not_computed until the dietitian''s composition tables are loaded.';

alter table public.recall_nutrition enable row level security;

create policy "read own or coached recall nutrition" on public.recall_nutrition
  for select to authenticated using (
    exists (
      select 1 from public.recalls r
      where r.id = recall_id and private.can_see_participant(r.participant_id)
    )
  );

-- No insert or update policy. These rows are written by the function below and
-- nowhere else, so a phone cannot put a carbohydrate figure into the database
-- by hand.

/**
 * Put one recall day through the food database.
 *
 * This is the backend seam the dietitian asked for: "the calories is estimated
 * and calculated based on our composition data that we have ... This will be
 * backend. This is not manual calculation."
 *
 * **It computes nothing yet, on purpose.** A recall holds its meals as free
 * text, and turning that text into grams needs the Jakarta composition tables,
 * which are not in this database. What is here is the Week 1 deck's fifteen
 * foods: carbohydrate for seven of them, and no protein or fat for any. An
 * average protein figure derived from that would be invented, and inventing it
 * is the one thing the app does not do on the nutrition side.
 *
 * So the row is written with its method and its reason, and the screens say
 * "not computed yet" the way Today already says "not scored yet" for the DQ
 * score. When the tables arrive, the body of this one function changes: the
 * table, this function's name and signature, the app code that calls it and
 * the screens that read it all stay as they are.
 *
 * It deliberately does not write `recalls.est_calories`. That column is
 * research tier and the CSV export reads it; replacing a hand-typed estimate
 * there with an app-computed figure is the programme's call to make once there
 * is a real figure to write, not a side effect of a stub.
 */
create function public.compute_recall_nutrition(p_recall_id uuid)
returns public.recall_nutrition
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.recall_nutrition;
begin
  -- Answers only about a recall the caller may already see, so security
  -- definer buys the write and not a window onto somebody else's day.
  if not exists (
    select 1 from public.recalls r
    where r.id = p_recall_id and private.can_see_participant(r.participant_id)
  ) then
    raise exception 'no recall with that id' using errcode = '22023';
  end if;

  insert into public.recall_nutrition (recall_id, method, note)
  values (
    p_recall_id,
    'not_computed',
    'The programme''s food composition tables are not loaded yet, so no figure has been calculated for this day.'
  )
  on conflict (recall_id) do update
    set method      = excluded.method,
        note        = excluded.note,
        computed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.compute_recall_nutrition(uuid) from public, anon;
grant execute on function public.compute_recall_nutrition(uuid) to authenticated;
