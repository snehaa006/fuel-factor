-- Seed: the Jakarta food table from "Fuel Factor - Week 1: Carbohydrates".
--
-- Every value here is quoted from that deck. Where the deck gives no number the
-- column stays NULL -- it gives kcal and carbohydrate for the eight foods it
-- recommends daily, and nothing at all for the seven it lists as lower priority.
-- It gives protein and fat for none of them, so every protein_g and fat_g below
-- is null. Fill these from TKPI, not from an estimate.

with f as (
  insert into public.food_items (name_id, name_en, category, guidance, guidance_note, source)
  values
    ('Nasi putih',      'White rice',          'carbohydrate', 'eat_daily', null,                              'week-1-deck'),
    ('Nasi merah',      'Brown rice',          'carbohydrate', 'eat_daily', 'More fibre',                      'week-1-deck'),
    ('Ubi jalar',       'Sweet potato',        'carbohydrate', 'eat_daily', null,                              'week-1-deck'),
    ('Pisang',          'Banana',              'fruit',        'eat_daily', 'Potassium',                       'week-1-deck'),
    ('Oat',             'Oats',                'carbohydrate', 'eat_daily', 'Slow-release',                    'week-1-deck'),
    ('Roti gandum',     'Wholemeal bread',     'carbohydrate', 'eat_daily', null,                              'week-1-deck'),
    ('Singkong rebus',  'Boiled cassava',      'carbohydrate', 'eat_daily', null,                              'week-1-deck'),
    ('Pepaya / mangga', 'Papaya / mango',      'fruit',        'eat_daily', 'Quick carbs and vitamins',        'week-1-deck'),

    ('Mie instan',      'Instant noodles',     'carbohydrate', 'not_the_priority', 'Carbs yes, but high sodium and low nutrition',        'week-1-deck'),
    ('Roti putih',      'White bread',         'carbohydrate', 'not_the_priority', 'Fast carb, fine pre-training, not ideal daily',       'week-1-deck'),
    ('Teh botol / Pocari', 'Sugary drinks',    'drink',        'not_the_priority', 'Only for during or after sessions over 90 minutes',   'week-1-deck'),
    ('Keripik',         'Crackers / crisps',   'snack',        'not_the_priority', 'Low nutritional density, okay as a snack',            'week-1-deck'),
    ('Bubur',           'Rice porridge',       'carbohydrate', 'not_the_priority', 'Easy on the stomach pre-training, a good choice',     'week-1-deck'),
    ('Nasi goreng',     'Fried rice',          'carbohydrate', 'not_the_priority', 'High fat from frying reduces carb efficiency',        'week-1-deck'),
    ('Kue',             'Pastries',            'snack',        'not_the_priority', 'Sugar spike without sustained energy',                'week-1-deck')
  returning id, name_id
)
insert into public.food_portions (food_id, label, grams, kcal, carbs_g, is_default, source_note)
select f.id, p.label, p.grams, p.kcal, p.carbs_g, true, p.source_note
from f
join (values
  -- The deck's own portion, kcal and carbohydrate figures.
  ('Nasi putih',      '200g cooked',  200.0,  260.0, 57.0, null::text),
  ('Nasi merah',      '200g cooked',  200.0,  220.0, 46.0, null),
  ('Ubi jalar',       '200g',         200.0,  172.0, 40.0, null),
  ('Pisang',          '1 medium',      null,  105.0, 27.0, null),
  ('Oat',             '80g dry',       80.0,  300.0, 54.0, null),
  ('Roti gandum',     '2 slices',      null,  160.0, 30.0, null),
  ('Singkong rebus',  '150g',         150.0,  165.0, 40.0, null),
  ('Pepaya / mangga', '150g',         150.0,   null, null,
     'The deck gives a range of 70-100 kcal per 150g and no carbohydrate figure, so no single value is stored.'),

  -- Listed without any figures. Logging them records what was eaten; the macros
  -- arrive with TKPI.
  ('Mie instan',         '1 portion',  null, null, null, 'No figures in the Week 1 deck.'),
  ('Roti putih',         '2 slices',   null, null, null, 'No figures in the Week 1 deck.'),
  ('Teh botol / Pocari', '1 bottle',   null, null, null, 'No figures in the Week 1 deck.'),
  ('Keripik',            '1 packet',   null, null, null, 'No figures in the Week 1 deck.'),
  ('Bubur',              '1 bowl',     null, null, null, 'No figures in the Week 1 deck.'),
  ('Nasi goreng',        '1 portion',  null, null, null, 'No figures in the Week 1 deck.'),
  ('Kue',                '1 piece',    null, null, null, 'No figures in the Week 1 deck.')
) as p(name_id, label, grams, kcal, carbs_g, source_note)
  on p.name_id = f.name_id;
