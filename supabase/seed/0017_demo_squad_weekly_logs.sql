-- Seed: the WEEKLY LOG tab's rows for the demo squad, Jakarta Youth Football.
--
-- Copied from the research tracker ("Fuel Factor - Research Tracker.xlsx",
-- WEEKLY LOG tab, as of 26 November 2026) for the three athletes the demo
-- squad holds, matched by their TEST-DEMO codes (supabase/README.md). Every
-- value is the tab's; two readings only:
--
--   * Trailing spaces trimmed ("Every meal " is "Every meal").
--   * "Everyday" and "Every day" are both kept as the tab has them, row by
--     row -- the tab is not tidied here.
--
-- The answer column is empty in the tab and stays empty. Kynan and Nathan are
-- in the tab but not in the demo squad, so they are not seeded.
--
-- Run against the live project after 20261127000001_weekly_logs.sql. Safe to
-- run twice: a week already logged is left as it is.

insert into public.weekly_logs (
  week, theme, participant_id, avg_training_energy, avg_urine_colour, avg_fluid_ml,
  breakfast_compliance, week_behaviour_check
)
select v.week, v.theme, p.id, v.energy, v.urine, v.fluid, v.breakfast, v.behaviour
from (values
  (1, 'Carbohydrates', 'TEST-DEMO-J01',  8, 5, 1500, 'Everyday', 'Less cramps'),
  (1, 'Carbohydrates', 'TEST-DEMO-T01',  7, 8, 1200, 'Everyday', 'More energy and better sleep after rice at night'),
  (1, 'Carbohydrates', 'TEST-DEMO-JA01', 7, 5, 2000, 'Everyday', 'Less muscle fatigue'),
  (2, 'Protein', 'TEST-DEMO-J01',  8, 4, 2000, 'Everyday', 'Every meal'),
  (2, 'Protein', 'TEST-DEMO-T01',  8, 5, 1500, 'Everyday', 'Every meal'),
  (2, 'Protein', 'TEST-DEMO-JA01', 5, 3, 2300, 'Everyday', 'Every meal'),
  (3, 'Recovery — Hydration + Sleep', 'TEST-DEMO-J01',  8, 5, 2000, 'Every day', '8'),
  (3, 'Recovery — Hydration + Sleep', 'TEST-DEMO-T01',  8, 4, 2300, 'Every day', '7:30 hours'),
  (3, 'Recovery — Hydration + Sleep', 'TEST-DEMO-JA01', 7, 3, 2000, 'Every day', '8'),
  (4, 'Integration + Game Day', 'TEST-DEMO-J01',  7, 3, 2500, 'Everyday', 'Bit better'),
  (4, 'Integration + Game Day', 'TEST-DEMO-T01',  9, 4, 2500, 'Everyday', 'Better'),
  (4, 'Integration + Game Day', 'TEST-DEMO-JA01', 8, 3, 2300, 'Everyday', 'Better')
) as v(week, theme, code, energy, urine, fluid, breakfast, behaviour)
join public.participants p on p.participant_code = v.code
on conflict (participant_id, week) do nothing;
