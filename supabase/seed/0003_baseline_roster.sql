-- Seed: the study arm and what their tracker already records about it.
--
-- Every value here is transcribed from the programme's own Google tracker, by
-- way of the roster and baseline tables in docs/PRODUCT-BRIEF.md section 2.
-- Nothing is estimated. Where the tracker is blank the column stays null, which
-- is most of it -- that emptiness is itself the finding the pitch rests on.
--
-- Only the three footballers are seeded. Kynan (basketball) and Nathan
-- (racing) are in the PARTICIPANTS sheet but out of the study arm after the
-- football-only decision, and the ASSESSMENTS and COMPARISON tabs carry no
-- columns for them either.

insert into public.participants
  (participant_code, name, sport, age_band, height_cm, weight_kg, calf_cm, notes)
values
  ('J-01',  'Jeongho', 'Football', '14-16', 176.0, 71.0, 38.0,
   'Height disagrees between tabs: 176 cm here, 175 cm on the other. Unconfirmed.'),
  ('T-01',  'Theo',    'Football', '14-16', 174.0, 68.0, 36.0,
   'Height and weight agree across both tabs.'),
  ('JA-01', 'Jacob',   'Football', '14-16', 175.0, 67.0, 35.0,
   'Height and weight disagree between tabs: 175 cm / 67 kg here, 177 cm / 66 kg on the other. Unconfirmed.');

-- consent_signed stays false, its default. The programme requires parental
-- consent for under-18s and the tracker does not record that it was collected,
-- so the app does not assert it was.

-- The 3-day baseline recall. The tracker carries no dates on any recall row and
-- no fluid figure for any athlete on any day, so recall_date and fluid_ml are
-- null throughout -- the second of those is the hydration gap in its own right.
-- Urine colour is the one per-day reading the baseline does hold for all three.
insert into public.recalls (participant_id, day_number, urine_colour)
select p.id, d.day_number, d.urine_colour
from public.participants p
join (values
  -- Jeongho, 3/3/3 -- within range on their scale.
  ('J-01',  1, 3), ('J-01',  2, 3), ('J-01',  3, 3),
  -- Theo, 6/6/6. The workbook's own scale reads 6 as "Dehydrated - drink
  -- immediately". Three days at 6 is a finding, not noise.
  ('T-01',  1, 6), ('T-01',  2, 6), ('T-01',  3, 6),
  -- Jacob, 5/4/5 -- the scale's "drink more today".
  ('JA-01', 1, 5), ('JA-01', 2, 4), ('JA-01', 3, 5)
) as d(participant_code, day_number, urine_colour)
  on d.participant_code = p.participant_code;

-- The meals eaten on those nine days are deliberately absent. The tracker holds
-- them as free text per athlete per day; that text is not in this repository,
-- and writing plausible meals for three named minors into a research table
-- would put invented food in the study's own record. They land here when the
-- tracker export does, and re-running them through food_items is what replaces
-- the hand-typed calorie estimates.

-- ASSESSMENTS. Two of the three Cooper runs were completed; Jeongho's was not,
-- so no row exists for him and the before/after screen reads it as not yet
-- measured rather than as a zero.
insert into public.assessments (participant_id, domain, measure, unit, pre_value)
select p.id, 'AEROBIC', 'Cooper 12-min run', 'm', a.pre_value
from public.participants p
join (values
  ('T-01',  2680.0),
  ('JA-01', 2800.0)
) as a(participant_code, pre_value)
  on a.participant_code = p.participant_code;
