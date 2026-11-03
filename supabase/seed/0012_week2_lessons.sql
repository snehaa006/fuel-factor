-- Seed: Week 2 of the programme, "Protein + Micronutrients".
--
-- Every string is copied from the Week 2 deck (the PDF) or its seven slides.
-- Nothing is summarised or rewritten. Seeding these rows is what unlocks week
-- 2 on the Learn screen.
--
-- Three things in the deck are deliberately NOT copied, and the handoff says
-- so for Sofia:
--
--   * The individual lines. The deck names athletes -- one's calorie intake on
--     a training day, one's protein "critically low", two who "eat near-zero
--     vegetables". The Learn screen is the whole squad's, and a named
--     14-16 year old's diet does not belong on it. Where a card's figure is
--     the group's, the group figure is kept and the named sentence dropped.
--   * "THE GAP -66%", which is one athlete's figure, not the group's.
--   * The deck's PDF is laid out in columns and its text extraction
--     interleaves them; the micronutrient card below was reassembled column by
--     column and is worth one read against the PDF.

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (2, 1, 'intro', 'Build. Repair. Repeat.',
  'You trained hard last week. Protein is what rebuilds what training breaks down. This week: learn how to actually use it.',
  'week-2-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (2, 2, 'stats', 'Why it matters', 'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, value, label)
select card.id, p.position, p.value, p.label
from card, (values
  (1, '1.6–2.2g', 'Per kg bodyweight needed daily for teen male athletes'),
  (2, '25–35g',   'Per meal to trigger muscle protein synthesis — the sweet spot'),
  (3, '30 min',   'Post-training window — muscles absorb protein fastest here'),
  (4, '50–65%',   'This group''s actual calorie intake vs what training demands')
) as p(position, value, label);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (2, 3, 'stats', 'Before Protein — The Calorie Gap',
    'This is the group average: 50–65% of calorie needs met on training days. Protein distribution matters — but not if total intake is this low. Adding protein at breakfast doesn''t just fix the macro split — it closes part of this gap.',
    'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, value, label)
select card.id, p.position, p.value, p.label
from card, (values
  (1, '~3,000', 'kcal the body needed to support training, repair, and growth'),
  (2, '~90g',   'Avg protein at dinner (most of the group)'),
  (3, '0g',     'Protein at breakfast (most days)')
) as p(position, value, label);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (2, 4, 'myth_fact', 'The Biggest Myth in Protein', 'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'THE MYTH',
      '"Eat as much protein as possible — more protein equals more muscle." This leads to piling 150g chicken at dinner, skipping breakfast entirely, and thinking the job is done.'),
  (2, 'THE FACT',
      'The body can only use 25–35g per meal for muscle protein synthesis. Above that, surplus amino acids are burned as fuel — not stored as muscle. The goal is better-timed protein across the day, not a bigger dinner.')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (2, 5, 'process', 'What Protein Actually Does',
    'The repair cycle runs 4 times a day - at every meal. Miss a meal = miss a repair window. Dinner only = 1 out of 4 windows used.',
    'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'You Train',              'Micro-tears form in muscle fibres — the stimulus for growth'),
  (2, 'Amino Acids Arrive',     'From digested protein within 30–90 min'),
  (3, 'Leucine Triggers mTOR',  '2.5g leucine switches on the repair signal'),
  (4, 'MPS Begins',             'New protein strands built — stronger than before'),
  (5, 'Recovery Complete',      'Only if protein + carbs + sleep all present')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source_note, source)
  values (2, 6, 'timing', 'The Problem Isn''t How Much — It''s When',
    'Areta et al. (2013). Spreading protein across 4 meals produces 25% more muscle protein synthesis than eating the same total in 1–2 sittings — even with identical gram counts. The body cannot store amino acids for later use.',
    'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'CURRENT PATTERN (MOST OF THIS GROUP)',
      'Breakfast 0–10g
Lunch 20–30g
Dinner 60–90g ← everything here
Post-Training 0g'),
  (2, 'OPTIMAL PATTERN',
      'Breakfast 25–35g ← morning MPS
Lunch 25–35g
Dinner 25–35g
Post-Training 20–25g ← recovery window')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (2, 7, 'targets', 'Protein Targets', 'for 60–70 kg athlete', 'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'DAILY TARGET',        '96–154g', '1.6–2.2g per kg · spread across 4 meals'),
  (2, 'PER MEAL SWEET SPOT', '25–35g',  'Above 35g per meal adds no extra MPS benefit'),
  (3, 'POST-TRAINING',       '20–25g',  'Within 30 min · pair with 3:1 carbs'),
  (4, 'CURRENT GROUP RANGE', '64–134g', null)
) as p(position, label, value, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (2, 8, 'timing', 'Micronutrients — What Makes Protein Actually Work',
    'Protein is the raw material. Micronutrients are the tools that convert it into muscle. Three are critically low in this group — and all three come from the same foods that fix the protein gap.',
    'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'IRON — OXYGEN DELIVERY',
      'Makes haemoglobin. Without it, oxygen delivery to working muscles drops — you fatigue earlier in the second half regardless of fitness. Low iron reduces VO₂max by 15–20%.

Fix: tempe, bayam, kangkung, ikan teri — pair with jeruk for 2× absorption'),
  (2, 'ZINC — THE MPS SWITCH',
      'Cofactor for ribosomal protein assembly and testosterone synthesis. Without zinc, the mTOR pathway that protein triggers cannot complete the repair cycle. Teen boys lose zinc fastest during intense training.

Fix: daging sapi, tempe, kacang mete, telur'),
  (3, 'OMEGA-3 — RECOVERY SIGNAL',
      'Reduces exercise-induced inflammation and improves the muscle''s anabolic sensitivity to protein — the same protein dose produces more MPS when omega-3 status is adequate. Also improves decision-making during games.

Fix: ikan kembung, salmon, sarden — 2–3× per week'),
  (4, 'THE FOOD HACK',
      'Tempe, ikan kembung, and telur give you protein AND iron AND zinc AND omega-3. You don''t need to think about micronutrients separately. Add those three foods and you cover the most critical gaps.')
) as p(position, label, detail);

-- No points: the protein table is the food database (seed 0011), read from
-- food_items so there is one copy of each figure.
insert into public.lesson_cards (week_number, position, kind, heading, source)
values (2, 9, 'foods', 'Best Protein Sources in Jakarta', 'week-2-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (2, 10, 'timing', 'Smart Combos — Complete Profile',
    'Post-training in a hurry? 2 telur rebus + 1 pisang = 18g protein + 27g carbs. Costs Rp 6,000. Takes 30 seconds. That''s your recovery window covered.',
    'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'Tempe + nasi',                    'Complete amino acid profile'),
  (2, 'Tahu + kacang tanah',             'Leucine + lysine pair'),
  (3, 'Roti gandum + 2 telur',           'Best breakfast combination'),
  (4, 'Greek yogurt + pisang',           'Post-training: protein + fast carbs'),
  (5, 'Gado-gado (tempe+telur+kacang)',  'One of Indonesia''s most complete meals')
) as p(position, label, detail);

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (2, 11, 'challenge', 'Add One Protein Source to Every Meal',
  'Don''t change what you''re already eating — just add. Lunch has rice and veg? Add tempe or a boiled egg. Dinner already has chicken? Keep it and add tahu. Post-training is nothing? Add a glass of susu or 2 telur rebus. One protein add per meal, every day, three meals minimum. At the end of each day, ask yourself: did I hit protein at 3 or more meals today? Track it and report Sunday.',
  'week-2-deck');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (2, 12, 'references', 'References', 'week-2-deck')
  returning id
)
insert into public.lesson_points (card_id, position, detail)
select card.id, p.position, p.detail
from card, (values
  (1, 'Areta JL et al. (2013). Timing and distribution of protein ingestion during prolonged recovery from resistance exercise. Journal of Physiology, 591(9).'),
  (2, 'Moore DR et al. (2009). Ingested protein dose response of muscle and albumin protein synthesis after resistance exercise. AJCN, 89(1).'),
  (3, 'Norton LE & Layman DK (2006). Leucine regulates translation initiation of protein synthesis in skeletal muscle. Journal of Nutrition.'),
  (4, 'Thomas DT et al. (2016). Position of the Academy of Nutrition and Dietetics on nutrition and athletic performance. JADA, 116(3).')
) as p(position, detail);
