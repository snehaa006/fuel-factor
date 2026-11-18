-- Seed: Week 3 of the programme, "Recovery: Sleep + Hydration".
--
-- Source: "Fuel Factor - Week 3 - Hydration.pdf" and "Week 3s message" in the
-- WEEK 3 Drive folder (10 November 2026). Every string below is copied from
-- them. Nothing is summarised, rewritten or added -- the app authors no
-- teaching material, which is why weeks 2 to 4 needed rows and not code.
--
-- The deck is headed MALE ATHLETES 14-16, the same audience as weeks 1 and 2.
--
-- Two things in the deck are deliberately not copied:
--
--   * The urine colour swatches. The app already draws that scale from the
--     workbook's own eight values (`UrineScale`), and a second copy of it as
--     lesson points would be the same scale maintained in two places. The
--     card below carries the deck's four *bands* and the sentence about what
--     to do, which is what the swatches are captioned with.
--   * Nothing is written into `food_items`. The deck's sleep and electrolyte
--     options -- warm milk and honey, the DIY electrolyte -- are combinations
--     given without per-portion macros, and inventing figures so they could
--     appear in the food picker is exactly what the food database must never
--     hold. They are kept as the deck's own text instead.

insert into public.weekly_challenges (week_number, theme, challenge)
values (3, 'Recovery: Sleep + Hydration',
  'Log urine colour every morning + pre-sleep recovery');

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (3, 1, 'intro', 'Recovery: Sleep + Hydration',
  'You''ve fixed the fuel. You''ve fixed the building blocks. Now fix the process that makes both of them work. Training creates the stimulus — sleep and hydration are where the adaptation actually happens.',
  'week-3-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (3, 2, 'stats', 'Why it matters', 'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, value, label)
select card.id, p.position, p.value, p.label
from card, (values
  (1, '8–10h',  'Sleep needed for teen male athletes — AASM guideline'),
  (2, '−15%',   'Testosterone drop after one week at 6hrs sleep (Leproult, 2011)'),
  (3, '−2%',    'Body weight loss from sweat = 10% drop in sprint speed'),
  (4, '1–2L',   'Sweat lost per hour in Jakarta heat vs 0.5L in temperate climates')
) as p(position, value, label);

-- The deck's own bridge back to week 1: a dark reading is two deficits, not
-- one. Kept because it is the only place the programme links hydration to
-- what was eaten.
insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (3, 3, 'myth_fact', 'Week 3 calorie thread',
  'Dark urine after training usually means two deficits at once — fluid AND calories. If you trained hard and your urine is 5+ on the scale, check what you ate post-training too. Both matter. Recovery is not just about drinking more water.',
  'week-3-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (3, 4, 'process', 'Sleep: The Anabolic Window',
    'Sleep is not passive downtime. It is when growth hormone, testosterone, and IGF-1 peak — when muscles repair and motor patterns from training get consolidated. Everything done in Week 1 and Week 2 only works if sleep closes the loop.',
    'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'GROWTH HORMONE (GH)',
      'Released in a large pulse during the first 1–2 hours of deep slow-wave sleep. Stimulates satellite cell activation and muscle repair. Teen male athletes produce 2–3× more GH during sleep than adults. Fragmented sleep cuts this pulse — a nap does not substitute for consolidated overnight sleep.'),
  (2, 'IGF-1 (INSULIN-LIKE GROWTH FACTOR 1)',
      'Released in response to GH. Directly activates the mTOR pathway — the same switch that dietary leucine triggers. Well-slept athletes have two simultaneous MPS signals: dietary protein AND overnight IGF-1. Cutting sleep removes one of them.'),
  (3, 'TESTOSTERONE',
      'Produced primarily during sleep. Teen males are at lifetime peak during puberty. One week of sleep restriction at 6hrs/night reduces testosterone by 10–15% in young men — equivalent to 10 years of ageing in anabolic hormone status. Consistently sleeping under 7 hours cuts production during the highest anabolic window of your life.'),
  (4, 'CORTISOL — THE THREAT',
      'Sleep deprivation chronically elevates cortisol — the catabolic hormone that breaks muscle protein down for energy. It peaks in the morning and is lowest during sleep. Athletes sleeping 5–6 hours have elevated cortisol that partially offsets the night''s repair work. Post-training carbs blunt cortisol by restoring blood glucose.')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (3, 5, 'timeline', 'Food and Sleep — The Tryptophan Pathway', 'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'Eat Tryptophan',             'Banana, warm milk, eggs, oats'),
  (2, 'Crosses Blood-Brain Barrier', 'Carbs alongside = faster uptake'),
  (3, 'Becomes Serotonin',          'Mood, calm, reduced anxiety'),
  (4, 'Becomes Melatonin',          'Regulates sleep onset and depth'),
  (5, 'Deep Sleep',                 'GH pulse releases — repair begins')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (3, 6, 'timing', 'Pre-Sleep Options', 'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'Warm Milk + Honey',
      'Tryptophan + casein (slow overnight protein) + simple carbs to drive tryptophan into the brain. Best pre-sleep option on training nights.'),
  (2, 'Banana',
      'Tryptophan + magnesium (muscle relaxation) + B6 (needed to convert tryptophan to serotonin). Cheap, portable, available everywhere.'),
  (3, 'Oats + Milk',
      'Melatonin precursors in oats + tryptophan in milk. If dinner was early, a small bowl 1 hour before bed provides overnight protein and sleep support.')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (3, 7, 'targets', 'Dehydration — What It Costs You',
    'Water makes up 73% of muscle tissue. Dehydration begins affecting performance before thirst is felt — by the time you''re thirsty, you''re already 1–2% dehydrated and speed has dropped.',
    'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, value, label)
select card.id, p.position, p.value, p.label
from card, (values
  (1, '−1%', 'body weight (0.6–0.7L lost) — impaired temperature regulation · harder to cool down'),
  (2, '−2%', 'body weight (~1.4L lost) — 10% drop in sprint speed · reduced passing accuracy'),
  (3, '−3%', 'body weight (~2.1L lost) — decision-making impaired · reaction time slows'),
  (4, '−4%', 'body weight (~2.8L lost) — cramps · heat exhaustion risk · forced withdrawal')
) as p(position, value, label);

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (3, 8, 'targets', 'The Urine Colour Check — Your Daily Data Point',
  'No app needed. Check every morning — it tells you yesterday''s hydration status and what to do today. 1–2: well hydrated. 3–4: drink more today. 5–6: dehydrated — act now. 7–8: flag this.

Jakarta at 30–34°C / 75–85% humidity: sweat rate is 1–2L/hour during intense sessions — 2–4× higher than temperate climate guidelines assume. The standard "drink when thirsty" rule does not apply here.',
  'week-3-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (3, 9, 'timing', 'Training Day Fluid Protocol',
    'Sweat is not just water — it contains sodium (~900mg/L), potassium (~200mg/L) and magnesium (~36mg/L). Replacing fluid without electrolytes during long sessions causes hyponatraemia (sodium dilution) which impairs performance worse than dehydration alone. For sessions under 60 minutes: water is adequate. Over 60 minutes or any match play: electrolyte replacement is essential.',
    'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'WAKE UP',       '500',     'mL water · first thing'),
  (2, 'PRE-TRAINING',  '500',     'mL water · 1–2 hrs before'),
  (3, 'DURING TRAINING','250',    'mL every 20 min · add electrolytes if >60 min'),
  (4, 'POST-TRAINING', '500–750', 'mL + electrolytes · replace 1.5× lost')
) as p(position, label, value, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (3, 10, 'timing', 'Best Electrolyte Sources — Jakarta', 'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'Fresh Coconut Water',
      '~600mg potassium · ~250mg sodium · ~60mg magnesium per 330mL. Better than sports drinks, cheaper, natural. Fresh only — avoid canned or sweetened variants.'),
  (2, 'Pocari Sweat',
      'Formulated electrolyte drink. Adequate sodium and potassium for sessions. Convenient during match play. Use during or immediately after sessions >60 min. Not necessary at rest.'),
  (3, 'DIY Electrolyte',
      '500mL fresh coconut water + squeeze of lime + pinch of salt + 1 tsp honey. Covers sodium, potassium, fast carbs. Athletes can make this themselves — better than any bottled option.')
) as p(position, label, detail);

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (3, 11, 'challenge', 'Log Urine Colour Every Morning + Pre-Sleep Recovery',
  'Two things this week. First: check your urine colour every morning and report it in Sunday''s check-in — this becomes your hydration data for the research. If you''re hitting 5+ regularly, drink more and check what you ate post-training.

Second: on training nights, have warm milk or a banana 30 minutes before sleep. That''s your tryptophan window — it directly supports the GH pulse that repairs what training broke.

Sunday check-in adds one new question this week: average sleep hours on training nights. This is your recovery data. The more complete, the stronger the Week 4 before/after story.',
  'week-3-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (3, 12, 'references', 'References', 'week-3-deck')
  returning id
)
insert into public.lesson_points (card_id, position, detail)
select card.id, p.position, p.detail
from card, (values
  (1, 'Leproult R & Van Cauter E (2011). Effect of 1 week of sleep restriction on testosterone levels in young men. JAMA, 305(21).'),
  (2, 'Halson SL (2014). Sleep in elite athletes and nutritional interventions to enhance sleep. Sports Medicine, 44(S1).'),
  (3, 'Maughan RJ & Shirreffs SM (2010). Dehydration and rehydration in competitive sport. SJMSS.'),
  (4, 'Casa DJ et al. (2000). National Athletic Trainers Association position statement: fluid replacement for athletes. JATA.'),
  (5, 'American Academy of Sleep Medicine (2016). Recommended amount of sleep for pediatric populations.')
) as p(position, detail);
