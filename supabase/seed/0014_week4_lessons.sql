-- Seed: Week 4 of the programme, "Integration & Game Day".
--
-- Source: the ten WhatsApp slides in the WEEK 4 Drive folder (18 November
-- 2026) and "Week 4 messaging". Every string below is copied from them.
--
-- ## Why the week 4 PDF is not the source
--
-- The WEEK 4 folder also holds "Fuel Factor - Week 4 - Intensive Guide.pdf",
-- and it is **not** what this seeds from, for two reasons:
--
--   * It says so itself. Its header reads "SCIENTIFIC BACKGROUND" and
--     "Audience: Practitioner reference". It is Sofia's clinical companion to
--     the slides -- RED-S thresholds, supplement dosing, energy availability
--     arithmetic -- not material written to be read by a 15 year old.
--   * **It names athletes and prints their individual data.** Section 1 is a
--     table of five named squad members with their average calories, carbs,
--     protein, fruit-and-veg servings and urine readings; section 4 prints
--     each one's urine colour week by week. The Learn screen is the whole
--     squad's. A named 14-16 year old's intake and hydration on a screen his
--     team-mates can open is a different thing from a group average, and the
--     week 2 seed dropped the same kind of line for the same reason.
--
-- The slides carry the same teaching at group level -- "Group avg daily
-- calories ~1,702 kcal", "Lowest carb intake in group 87g/day" -- which is
-- what the athletes were shown and what is seeded here.
--
-- The PDF's last two contents entries, "Game Day Nutrition — The Science" and
-- "Realistic Outcomes in a 4-Week Intervention", are listed but absent: the
-- file is eight pages and stops mid-sentence in section 8. Nothing here
-- depends on them; flagged for Sofia.

insert into public.weekly_challenges (week_number, theme, challenge)
values (4, 'Integration & Game Day',
  'Run the full morning protocol one day — 500mL water on waking, breakfast before training, check your urine colour');

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (4, 1, 'intro', 'Game Ready. The Final Chapter.',
  'Four weeks ago you came in with the numbers. Today you understand them. This is where everything — carbs, protein, hydration, sleep — comes together into one game plan.',
  'week-4-slides');

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (4, 2, 'process', 'Four Weeks. Four Building Blocks.', 'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'WEEK 1 · Carbs',
      '6–10g CHO/kg/day — build to 2–3 cups rice per meal.',
      'Sprint fuel. Glycogen powers the first touch, the press, the final run — not willpower.'),
  (2, 'WEEK 2 · Protein',
      '1.4–1.7g/kg/day — 20–25g protein at each meal.',
      'Not for size. For repair. Post-session muscle damage needs protein as the building material.'),
  (3, 'WEEK 3 · Hydration & Sleep',
      'Urine colour 1–3. 35–40mL fluid/kg/day. 8–9 hrs.',
      'The two things that make everything else work. Under-slept or dehydrated, Weeks 1–2 mean very little.'),
  (4, 'WEEK 4 · Integration',
      'Pre-load, sustain, and recover — every training and competition day.',
      'Apply all three on the same day — game day, assessment day, any day your body is working hard.')
) as p(position, label, value, detail);

-- Group figures only. The slide states them as the group's, and the deck's
-- own per-athlete table is left in the practitioner PDF where it belongs.
with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (4, 3, 'stats', 'The Numbers Don''t Lie',
    'The standout gap: every athlete was eating 50–60% of daily needs while training. Carbohydrates were the biggest deficit across the board.',
    'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, value, label)
select card.id, p.position, p.value, p.label
from card, (values
  (1, '~1,702 kcal',  'Group avg daily calories'),
  (2, '~3,000 kcal',  'Target on a training day'),
  (3, '87g/day',      'Lowest carb intake in group'),
  (4, '262g/day',     'Highest carb intake in group'),
  (5, '400–455g/day', 'Carbohydrate target'),
  (6, '134g/day',     'Best protein in group'),
  (7, '64g/day',      'Lowest protein in group'),
  (8, '5–6',          'Urine colour avg (group) — dehydrated')
) as p(position, value, label);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (4, 4, 'stats', 'You Started Moving the Numbers',
    'The pattern: imperfect, but real. Consistency over perfection is what moves scores.',
    'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, value, label, detail)
select card.id, p.position, p.value, p.label, p.detail
from card, (values
  (1, 'Every day', 'BREAKFAST — WHOLE GROUP, BOTH WEEKS',
      'The simplest habit held consistently across all athletes. One meal. That''s the foundation everything else builds on.'),
  (2, '↑ 2×',      'AVERAGE FLUID INTAKE, WEEK 1→2',
      'Daily fluid intake roughly doubled from baseline. One athlete hit urine colour 2 — the clearest single turnaround in the group.'),
  (3, '7→8',       'SELF-RATED ENERGY, GROUP TREND',
      'Athletes with the lowest baseline carb intakes showed the sharpest energy improvements once fuelling consistently.')
) as p(position, value, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (4, 5, 'stats', 'Your Brain Runs on Glucose Too',
    'The wrong pass in the 75th minute. The missed read. The slow first touch. These aren''t always fitness problems — they''re often fuel problems.

For a sharper second half: low-GI carbs 2–3 hrs before (nasi merah [brown rice], oat, noodles) + protein. Avoid high-sugar drinks 1 hr before — the insulin spike causes a glucose crash at kickoff.',
    'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, value, label, detail)
select card.id, p.position, p.value, p.label, p.detail
from card, (values
  (1, '20%',  'BRAIN''S DAILY GLUCOSE SHARE',
      'The brain is 2% of body weight but consumes 20% of daily glucose. During high-pressure sport that demand increases. Blood glucose dips = slower thinking, worse decisions.'),
  (2, '−10%', 'REACTION TIME DROP',
      'At just 2% dehydration — before you feel thirsty — reaction time measurably drops.'),
  (3, 'DHA',  'THE BRAIN-BUILDING FAT',
      'Omega-3 DHA is a structural part of brain cell membranes. It affects how fast neural signals travel.')
) as p(position, value, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (4, 6, 'myth_fact', 'Know What You''re Actually Taking',
    'Only supplement what food cannot fix. For this group, that''s Vitamin D. Everything else has a food solution.',
    'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'Creatine Monohydrate', 'Mixed for youth',
      'ACSM advises caution under 18. Adult evidence is strong for power sport; benefit for intermittent sport is modest. If using: 3–5g/day, not loading doses.'),
  (2, 'Magnesium', 'Good evidence',
      'Athletes lose magnesium through sweat. Supports sleep quality, reduces cramping. 300–400mg magnesium glycinate is the best-absorbed form.'),
  (3, 'Vitamin D', 'Strong evidence',
      'Indoor training in Jakarta means limited UV synthesis. All athletes should consider 1,000–2,000IU D3 — not just those already supplementing.'),
  (4, 'Pre-workouts & Protein Powders', 'Not needed',
      'Food-first targets haven''t been hit yet — fix that first. Pre-workouts marketed to teens often contain stimulants not appropriate under 18.')
) as p(position, label, value, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (4, 7, 'process', 'What Chronic Under-Fuelling Does',
    'This group entered the programme eating 50–60% of daily energy needs while active. This is called RED-S — Relative Energy Deficiency in Sport — a clinical condition recognised by the IOC that affects lean, athletic-looking athletes at any age.',
    'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, label, detail)
select card.id, p.position, p.label, p.detail
from card, (values
  (1, 'BONE DENSITY',
      'Peak bone mass is built right now. Under-fuelling during this window cannot be recovered later.'),
  (2, 'HORMONES',
      'Low energy availability suppresses testosterone — the main driver of muscle development at 14–16.'),
  (3, 'IMMUNITY',
      'More frequent illness, slower healing, longer recovery between sessions.'),
  (4, 'MOOD & FOCUS',
      'Irritability and poor concentration — especially in afternoons after activity.'),
  (5, 'PERFORMANCE DECLINES',
      'Strength and endurance drop — not because fitness fell, but because the body is protecting vital organs.')
) as p(position, label, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, body, source)
  values (4, 8, 'timing', 'Execute This When It Counts',
    'Your post-assessment is coming. What you eat the night before and morning of will show up in your numbers.',
    'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'NIGHT BEFORE',   'Carb-load dinner + 8–9 hrs sleep',
      'Bigger rice portion. Nasi (rice) + ayam (chicken) + sayur (veg). No new foods.'),
  (2, 'MORNING',        'Breakfast + 500mL water on waking',
      'Nasi (rice) or noodles + telur (eggs). Familiar food. No heavy fat.'),
  (3, '1 HR BEFORE',    'Top-up snack + 500mL fluid',
      'Pisang (banana) or roti + selai kacang (bread + peanut butter). Pocari or kelapa muda (coconut water).'),
  (4, 'DURING',         'Sip every 15–20 min',
      'Don''t wait for thirst. Small consistent sips beats big gulps at the end.'),
  (5, 'WITHIN 30 MIN',  'Recovery — carbs + protein',
      'Jus semangka (watermelon juice) + telur rebus (boiled egg). Full meal within 2 hours.')
) as p(position, label, value, detail);

with card as (
  insert into public.lesson_cards (week_number, position, kind, heading, source)
  values (4, 9, 'timing', 'Everything You Need Already Exists Here', 'week-4-slides')
  returning id
)
insert into public.lesson_points (card_id, position, label, value, detail)
select card.id, p.position, p.label, p.value, p.detail
from card, (values
  (1, 'Pisang (Banana)', 'Fast carbs + potassium',
      'Pre-session or half-time. Cheap, available everywhere, no prep.'),
  (2, 'Susu + Madu (Milk + Honey)', 'Casein protein before sleep',
      '30 min before bed. Slow-release protein overnight while growth hormone peaks.'),
  (3, 'Kelapa Muda (Coconut Water)', 'Natural electrolytes',
      'Na, K, Mg. Better profile than most sports drinks. Cold. Every warung.'),
  (4, 'Telur (Eggs)', 'Complete protein — all 9 EAAs',
      'Breakfast daily. Post-session. 2–3 eggs = 12–18g protein.'),
  (5, 'Tempe (Fermented Soybean)', 'Protein + iron + calcium + probiotics',
      'Fermented = better gut absorption. The most underrated food on this list.'),
  (6, 'Ikan Kembung (Mackerel)', 'Omega-3 DHA — brain + reaction speed',
      'Biggest dietary gap in this group. 2–3×/week. Sarden kaleng (sardines) works too.')
) as p(position, label, value, detail);

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (4, 10, 'challenge', 'Run the Full Morning Protocol',
  'Three things this week. Run the game day protocol at least once — bigger carb dinner the night before, 500mL water on waking, breakfast before training, top-up snack 1hr before. Even if it''s just a training session, treat it like a game.

Post-session recovery within 30 minutes every time — something with carbs + protein. This is the habit that separates being sore tomorrow from being ready tomorrow.

Post-assessment is coming — do NOT arrive to it fasted. Everything we''ve built shows up in those numbers or it doesn''t.

This week''s challenge: run the full morning protocol one day — 500mL water on waking, breakfast before training, check your urine colour.',
  'week-4-message');

insert into public.lesson_cards (week_number, position, kind, heading, body, source)
values (4, 11, 'intro', 'You Already Knew How to Eat. Now You Know Why.',
  'Nasi (rice) is not the enemy. Pisang (banana) before training is not baby food. Susu (milk) at night is not random. The food at every warung (food stall) in Jakarta is genuinely good athlete fuel — you just needed to know when, how much, and what to add.

The habits that moved your scores in four weeks are the same ones that will keep moving them.',
  'week-4-slides');
