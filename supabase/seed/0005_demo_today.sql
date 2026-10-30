-- Seed: a part-finished day for Theo, so the Today screen demonstrates.
--
-- DEMO CONTENT. This is the one seed file that holds food nobody actually ate.
-- It exists because a screen showing an empty ring demonstrates nothing, and it
-- is quarantined here so it can be dropped whole:
--
--   delete from public.daily_logs where log_date = current_date;
--
-- Once the logger ships (step 4) Theo fills this himself and this file goes.
-- Nothing here reaches the CSV export in a form that could be mistaken for
-- collected data: the row carries today's date, not a recall day.

insert into public.daily_logs (participant_id, log_date, day_type, breakfast, lunch)
select p.id, current_date, 'training', true, true
from public.participants p
where p.participant_code = 'T-01';

-- Breakfast: oats. Lunch: a bowl of nasi putih. Both are foods the Week 1 deck
-- recommends daily, so the carbohydrate figures are the deck's own.
insert into public.log_items (daily_log_id, slot, food_portion_id, quantity)
select l.id, s.slot::public.meal_slot, fp.id, s.quantity
from public.daily_logs l
join public.participants p on p.id = l.participant_id and p.participant_code = 'T-01'
join (values
  ('breakfast', 'Oat',        '80g dry',     1.0),
  ('lunch',     'Nasi putih', '200g cooked', 1.0)
) as s(slot, name_id, label, quantity) on true
join public.food_items fi on fi.name_id = s.name_id
join public.food_portions fp on fp.food_id = fi.id and fp.label = s.label
where l.log_date = current_date;
