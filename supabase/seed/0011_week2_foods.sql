-- Seed: the protein table from "Fuel Factor - Week 2 - Protein and Recovery".
--
-- "Best Protein Sources in Jakarta -- COMPLETE PROTEINS, EAT DAILY". Every
-- figure is the deck's own: a portion and its protein, nothing else. The deck
-- gives no kcal, carbohydrate or fat for any of them, so those stay null --
-- fill them from TKPI, not from an estimate.
--
-- Tahu and susu are named as protein sources in the week 2 challenge ("add
-- tahu", "a glass of susu") but carry no figure anywhere in the deck. They
-- are here so they can be logged, and so the challenge can count them as
-- protein, with the figure left null exactly as week 1 left its unfigured
-- foods.
--
-- Two of the deck's own numbers disagree, and the table's is the one used:
--   * Greek yogurt is 200g = 20g in the table, and 17g in a sentence about
--     one athlete.
--   * Telur is 3 eggs = 18g in the table; a slide says 2 telur rebus + 1
--     pisang = 18g protein, which with pisang at 0 would make 2 eggs 18g.

with f as (
  insert into public.food_items (name_id, name_en, category, guidance, guidance_note, source)
  values
    ('Telur',         'Eggs',             'protein', 'eat_daily', 'Leucine threshold reached. Cheapest complete protein', 'week-2-deck'),
    ('Tempe',         'Tempeh',           'protein', 'eat_daily', 'Best local plant protein + iron',                      'week-2-deck'),
    ('Ayam dada',     'Chicken breast',   'protein', 'eat_daily', 'Complete amino acids',                                 'week-2-deck'),
    ('Ikan kembung',  'Indian mackerel',  'protein', 'eat_daily', 'Protein + omega-3',                                    'week-2-deck'),
    ('Greek yogurt',  'Greek yogurt',     'protein', 'eat_daily', 'Casein = overnight release',                           'week-2-deck'),
    ('Canned tuna',   'Canned tuna',      'protein', 'eat_daily', 'Convenient post-training',                             'week-2-deck'),
    ('Tahu',          'Tofu',             'protein', 'eat_daily', null,                                                   'week-2-deck'),
    ('Susu',          'Milk',             'protein', 'eat_daily', null,                                                   'week-2-deck')
  returning id, name_id
)
insert into public.food_portions (food_id, label, grams, kcal, carbs_g, protein_g, is_default, source_note)
select f.id, p.label, p.grams, null, null, p.protein_g, true, p.source_note
from f
join (values
  ('Telur',        '3 eggs',   null::numeric, 18.0::numeric, null::text),
  ('Tempe',        '100g',     100.0,         19.0,          null),
  ('Ayam dada',    '100g',     100.0,         24.0,          null),
  ('Ikan kembung', '100g',     100.0,         22.0,          null),
  ('Greek yogurt', '200g',     200.0,         20.0,          null),
  ('Canned tuna',  '85g',       85.0,         22.0,          null),
  ('Tahu',         '1 portion', null,         null,          'Named in the Week 2 challenge with no figure.'),
  ('Susu',         '1 glass',   null,         null,          'Named in the Week 2 challenge with no figure.')
) as p(name_id, label, grams, protein_g, source_note)
  on p.name_id = f.name_id;
