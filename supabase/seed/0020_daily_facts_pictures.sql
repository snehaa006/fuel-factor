-- Seed: a picture, a headline and a mascot pose for each fact of the day
-- (see 20261128000002_daily_facts_pictures.sql). Every figure in a headline is
-- one its fact already states -- daily-facts-seed.test.ts checks. Re-runnable.

update public.daily_facts f
set emoji = v.emoji, headline = v.headline, headline_id = v.headline_id, pose = v.pose
from (values
  (1, 1, '⚡', '60–70%', '60–70%', 'run'),
  (1, 2, '🙅', 'MYTH', 'MITOS', 'learn'),
  (1, 3, '🔋', '400 g', '400 g', 'fuel'),
  (1, 4, '⚽', '80–90%', '80–90%', 'run'),
  (1, 5, '🍌', '1–2 hours', '1–2 jam', 'think'),
  (1, 6, '⏱️', '30 min', '30 menit', 'best'),
  (1, 7, '🎯', '5–7 g/kg', '5–7 g/kg', 'stand'),
  (2, 1, '💪', '1.6–2.2 g/kg', '1,6–2,2 g/kg', 'stand'),
  (2, 2, '📉', '50–65%', '50–65%', 'fuel'),
  (2, 3, '🍗', '25–35 g', '25–35 g', 'learn'),
  (2, 4, '🔧', '4× a day', '4× sehari', 'run'),
  (2, 5, '⏰', '20–25 g', '20–25 g', 'think'),
  (2, 6, '🐟', 'Iron + Zinc + Omega-3', 'Zat besi + Seng + Omega-3', 'balloons'),
  (2, 7, '🥚', 'Rp 6,000', 'Rp 6.000', 'best'),
  (3, 1, '😴', '8–10 hours', '8–10 jam', 'float'),
  (3, 2, '🔍', '5+', '5+', 'learn'),
  (3, 3, '🌙', '10–15%', '10–15%', 'float'),
  (3, 4, '🥛', '30 min', '30 menit', 'fuel'),
  (3, 5, '💧', '2% = −10%', '2% = −10%', 'run'),
  (3, 6, '🚦', 'Every morning', 'Setiap pagi', 'think'),
  (3, 7, '🥥', '1–2 L/hour', '1–2 L/jam', 'stand'),
  (4, 1, '🧩', 'All 4 weeks', 'Semua 4 minggu', 'best'),
  (4, 2, '📊', '1,702 kcal', '1.702 kkal', 'think'),
  (4, 3, '🧠', '20%', '20%', 'learn'),
  (4, 4, '☀️', 'Food first', 'Makanan dulu', 'stand'),
  (4, 5, '🦴', 'RED-S', 'RED-S', 'learn'),
  (4, 6, '🏆', '8–9 hours', '8–9 jam', 'run'),
  (4, 7, '🛒', 'At the warung', 'Di warung', 'best')
) as v(week_number, day, emoji, headline, headline_id, pose)
where f.week_number = v.week_number and f.day = v.day;
