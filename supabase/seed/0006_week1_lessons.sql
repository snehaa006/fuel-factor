-- Seed: Week 1 of the programme, "Carbohydrates: Your Training Fuel".
--
-- Every string below is copied from the Week 1 deck. Nothing is summarised,
-- rewritten or filled in: where the deck gives a figure the figure is here,
-- and where it does not there is no row. Weeks 2 to 4 have not been written,
-- so they have no rows at all and the app shows them locked.
--
-- Two things worth knowing when reading this:
--
--   * The deck gives a GAME DAY band of 6-8 g/kg. It is reproduced here
--     because it is on their page, but it is teaching material only -- the
--     tracker's Day Type column still holds Training and Rest alone, and
--     targets.ts computes no game-day band. Showing the deck is not the same
--     as adding a day type.
--
--   * "CURRENT AVERAGE (LAB RATS) 87-156g" is the athletes' own baseline, as
--     the deck states it. It is their figure about themselves, not a target.

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (1, 1, 'intro', 'Carbohydrates: Your Training Fuel',
  'Team sports are glycolytic. That means carbohydrates — not protein, not fat — are the primary fuel for sprints, tackles, jumps, and decisions. This week we cover why, how much, and where to find them in Jakarta.',
  'week-1-deck');

-- The four figures the deck leads with.
with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (1, 2, 'stats', 'Why it matters', 'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, value, label)
select card.id, p.position, p.value, p.label
from card, (values
  (1, '60–70%',  'Of energy during team sports comes from carbohydrates'),
  (2, '2%',      'Body weight loss from dehydration = 10% drop in sprint speed'),
  (3, '5–7g',    'Per kg body weight needed on training days (ISSN guidelines)'),
  (4, '90 min',  'Full game depletes glycogen by 80–90% without fuelling')
) as p(position, value, label);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (1, 3, 'myth_fact', 'The Biggest Myth in Teen Nutrition', 'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'THE MYTH',
      '"Carbs make you fat. Athletes should eat mostly protein." This comes from adult weight-loss culture — it is not relevant for a growing athlete burning 1,500–2,000 kcal in training per day.'),
  (2, 'THE FACT',
      'Carbohydrates are stored as glycogen in your muscles and liver. Glycogen is the fuel that powers every sprint, jump, and change of direction in training. Without it, you slow down — not because you''re unfit, but because you''re unfuelled.')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (1, 4, 'process', 'What Carbohydrates Actually Do', 'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'You Eat Carbs',          'Nasi, pisang, roti, ubi, oat'),
  (2, 'Digested to Glucose',    'Broken down in the small intestine'),
  (3, 'Stored as Glycogen',     '~400g in muscles, ~100g in liver'),
  (4, 'Released During Training','Powers sprints, tackles, jumps'),
  (5, 'Must Be Replaced',       'Post-training nutrition refills the tank')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source_note, source)
  values (1, 5, 'timeline', 'What Happens to Glycogen During a Full Game',
    'Bangsbo et al. (1994), Maughan & Leiper (1994). This is why second-half performance drops — especially for athletes who start the game underfuelled.',
    'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, value)
select card.id, p.position, p.label, p.value
from card, (values
  (1, 'Kick-off (0 min)',    '100%'),
  (2, 'Half-time (45 min)',  '~60%'),
  (3, '75 minutes',          '~30%'),
  (4, 'Full time (90 min)',  '~12%')
) as p(position, label, value);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (1, 6, 'timing', 'When to Eat Carbs Around Training', 'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'PRE-TRAINING (1–2 HRS BEFORE)',
      'Goal: Top up glycogen stores before you deplete them.

Best options: 1–2 pisang · roti gandum + selai kacang · ubi jalar rebus · oat dengan susu

Avoid: Heavy or fatty food (slows digestion, causes stomach issues)'),
  (2, 'DURING TRAINING (>60 MIN SESSIONS)',
      'Goal: Maintain blood glucose and delay fatigue.

Best options: 1 pisang at half-time · small sip of Pocari or air kelapa muda · orange/jeruk slices

If under 60 min: Water only — no food needed during session'),
  (3, 'POST-TRAINING (WITHIN 30 MIN)',
      'Goal: Replenish glycogen + start muscle repair. This is the most important window.

Best options: 1–2 pisang + glass susu · nasi + ayam · roti + telur · jus semangka + telur rebus

Target ratio: 3:1 carbs to protein')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (1, 7, 'targets', 'Your Carbohydrate Targets', 'for 60–70 kg athlete', 'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'TRAINING DAY', '350–490g',
      '5–7g per kg body weight · Most of this should come from nasi, ubi, pisang, roti'),
  (2, 'REST DAY', '210–280g',
      '3–4g per kg body weight · Slightly reduced — muscle demand is lower'),
  (3, 'GAME DAY', '420–560g',
      '6–8g per kg · High output day · Start loading the night before'),
  (4, 'CURRENT AVERAGE (LAB RATS)', '87–156g',
      'This is 20–40% of target — the biggest performance gap we are addressing')
) as p(position, label, value, detail);

-- No points: the deck's food table is already the food database, and the
-- screen reads it from food_items so there is one copy of those figures.
insert into public.lesson_cards (week_number, position, kind, heading, source)
values (1, 8, 'foods', 'Best Carbohydrate Sources in Jakarta', 'week-1-deck');

-- The challenge itself lives in weekly_challenges, which is what an athlete
-- marks done. This card carries the deck's fuller wording of it.
insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (1, 9, 'challenge', 'Add One Carb to Every Meal',
  'Don''t change what you''re eating — just add. If you''re having chicken and salad for lunch, add a bowl of nasi. If you''re skipping breakfast, have a pisang. If your pre-training meal has no carbs, add ubi jalar rebus or 2 slices roti. One addition per meal, three meals a day, every day this week. That''s it. Track whether your energy in the second half of training feels different by Thursday.',
  'week-1-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (1, 10, 'references', 'References', 'week-1-deck')
  returning id
)
insert into public.lesson_points (card_id, position, detail)
select card.id, p.position, p.detail
from card, (values
  (1, 'Burke LM et al. (2011). Carbohydrates for training and competition. Journal of Sports Sciences, 29(S1), S17–S27.'),
  (2, 'Bangsbo J et al. (1994). Activity profile of competition soccer. Canadian Journal of Sport Sciences.'),
  (3, 'ISSN Position Stand: Nutrient Timing (Kerksick et al., 2017).'),
  (4, 'Thomas DT, Erdman KA, Burke LM (2016). Academy of Nutrition and Dietetics position paper on nutrition and athletic performance. Journal of the Academy of Nutrition and Dietetics, 116(3), 501–528.')
) as p(position, detail);
