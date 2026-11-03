-- The Indonesian food composition database, and recalls that use it.
--
-- 1. FOOD_ITEMS TAKES THE COMPOSITION TABLE
--
-- 1,346 Indonesian foods and drinks with calories, protein, fat and
-- carbohydrate per 100 g (TKPI). They are loaded by
-- supabase/seed/0009_tkpi_foods.sql, keyed on the table's own id so the load
-- can be re-run without doubling anything.
--
-- `guidance` stops being required. It is the Week 1 deck's two registers
-- (eat daily / not the priority), and the deck sorted fifteen foods, not
-- thirteen hundred. A composition table says what is in a food, not which
-- register it belongs in, so those rows carry no guidance rather than an
-- invented one. The check constraint still holds for every row that has it.

alter table public.food_items alter column guidance drop not null;
alter table public.food_items add column if not exists tkpi_id integer unique;

comment on column public.food_items.tkpi_id is
  'Row id in the Indonesian food composition table the food was loaded from. Null for the deck''s own foods.';

-- Search by name, case-insensitively, without scanning 1,346 rows per keystroke.
create extension if not exists pg_trgm with schema extensions;
create index if not exists food_items_name_id_trgm
  on public.food_items using gin (name_id extensions.gin_trgm_ops);

-- 2. RECALL ITEMS
--
-- What an athlete picked from the food database for one meal of one recall
-- day. The meal's free text stays the research record; these are what the
-- figures are calculated from. Same write rule as `recalls`: the athlete,
-- for their own days, and nobody else.

create table public.recall_items (
  id               uuid primary key default gen_random_uuid(),
  recall_id        uuid not null references public.recalls (id) on delete cascade,
  meal             text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  food_portion_id  uuid not null references public.food_portions (id) on delete restrict,
  quantity         numeric(5, 2) not null default 1 check (quantity > 0),
  created_at       timestamptz not null default now()
);

create index on public.recall_items (recall_id);

alter table public.recall_items enable row level security;

create policy "read own or coached recall items" on public.recall_items
  for select to authenticated using (
    exists (
      select 1 from public.recalls r
      where r.id = recall_id and private.can_see_participant(r.participant_id)
    )
  );

create policy "write own recall items" on public.recall_items
  for all to authenticated
  using (
    exists (
      select 1 from public.recalls r
      where r.id = recall_id and r.participant_id = private.current_participant_id()
    )
  )
  with check (
    exists (
      select 1 from public.recalls r
      where r.id = recall_id and r.participant_id = private.current_participant_id()
    )
  );

-- 3. COMPUTE_RECALL_NUTRITION, FOR REAL
--
-- The seam step 14 left: same name, same signature, same table, same callers.
-- The body now adds up the foods picked for the day. A figure is left null
-- when any picked food has no value for it -- a sum that silently skipped a
-- food would read as a real total and be an undercount.

create or replace function public.compute_recall_nutrition(p_recall_id uuid)
returns public.recall_nutrition
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row     public.recall_nutrition;
  v_items   integer;
  v_kcal    numeric;
  v_carbs   numeric;
  v_protein numeric;
  v_fat     numeric;
  v_gaps    integer;
begin
  if not exists (
    select 1 from public.recalls r
    where r.id = p_recall_id and private.can_see_participant(r.participant_id)
  ) then
    raise exception 'no recall with that id' using errcode = '22023';
  end if;

  select
    count(*),
    case when bool_or(fp.kcal is null)      then null else round(sum(fp.kcal * ri.quantity), 1) end,
    case when bool_or(fp.carbs_g is null)   then null else round(sum(fp.carbs_g * ri.quantity), 1) end,
    case when bool_or(fp.protein_g is null) then null else round(sum(fp.protein_g * ri.quantity), 1) end,
    case when bool_or(fp.fat_g is null)     then null else round(sum(fp.fat_g * ri.quantity), 1) end,
    count(*) filter (
      where fp.kcal is null or fp.carbs_g is null or fp.protein_g is null or fp.fat_g is null
    )
  into v_items, v_kcal, v_carbs, v_protein, v_fat, v_gaps
  from public.recall_items ri
  join public.food_portions fp on fp.id = ri.food_portion_id
  where ri.recall_id = p_recall_id;

  if v_items = 0 then
    insert into public.recall_nutrition (recall_id, method, kcal, carbs_g, protein_g, fat_g, note)
    values (
      p_recall_id, 'not_computed', null, null, null, null,
      'No foods were picked from the food database for this day. Add them under each meal to calculate it.'
    )
    on conflict (recall_id) do update
      set method = excluded.method, kcal = null, carbs_g = null, protein_g = null, fat_g = null,
          note = excluded.note, computed_at = now()
    returning * into v_row;
    return v_row;
  end if;

  insert into public.recall_nutrition (recall_id, method, kcal, carbs_g, protein_g, fat_g, note)
  values (
    p_recall_id, 'food_database', v_kcal, v_carbs, v_protein, v_fat,
    case when v_gaps > 0
      then v_gaps || ' of the foods picked have no figure for some of these, so those totals are left blank.'
      else null
    end
  )
  on conflict (recall_id) do update
    set method = excluded.method, kcal = excluded.kcal, carbs_g = excluded.carbs_g,
        protein_g = excluded.protein_g, fat_g = excluded.fat_g,
        note = excluded.note, computed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.compute_recall_nutrition(uuid) from public, anon;
grant execute on function public.compute_recall_nutrition(uuid) to authenticated;
