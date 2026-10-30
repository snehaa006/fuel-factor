-- Seed: week 1 of the programme, and the advice rules it supports.
--
-- Only week 1 exists. The call settled that the programme runs four weeks with
-- carbohydrates first; the themes and challenges for weeks 2 to 4 have not been
-- written, so they are not invented here.

insert into public.weekly_challenges (week_number, theme, challenge)
values (1, 'Carbohydrates', 'Add one carb to every meal');

-- Every message is a sentence from the Week 1 deck, fired on a plain event.
-- reviewed_by stays null: these are seed rules until the dietitian signs them off.
insert into public.advice_rules (code, domain, trigger, message_en, source, severity)
values
  ('no_carbs_in_slot', 'carbohydrate',
   'A meal slot was logged with no carbohydrate food in it',
   'Nasi, ubi jalar or roti all count.',
   'week-1-deck', 1),

  ('no_breakfast_training_day', 'carbohydrate',
   'A training day reached midday with the breakfast slot still unlogged',
   'Eat breakfast every training day, even a pisang or roti with telur. No training on empty.',
   'week-1-deck', 2),

  ('refuel_window_open', 'timing',
   'A training session was logged and nothing has been logged in the 30 minutes since',
   'Refuel within 30 minutes. Aim for roughly 3 parts carbohydrate to 1 part protein.',
   'week-1-deck', 2),

  ('urine_five_or_worse', 'hydration',
   'Urine colour was recorded at 5 or worse, which the tracker''s own scale calls act now',
   'Losing 2% of your body weight to dehydration cuts sprint speed by about 10%.',
   'week-1-deck', 2),

  ('pre_training_meal', 'timing',
   'A training day has a pre-training slot still unlogged two hours before the session',
   'Eat a proper meal 2 to 3 hours before training. Rice, pasta, nasi campur, anything carb-heavy.',
   'week-1-deck', 1);
