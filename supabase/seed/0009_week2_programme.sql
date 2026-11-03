-- Seed: week 2 of the programme, "Protein + Micronutrients", and the advice
-- rules it supports.
--
-- Source: "Fuel Factor - Week 2 - Protein and Recovery.pdf" and its seven
-- WhatsApp slides, in Sofia's WEEK 2 Drive folder (2 November 2026). Every
-- message below is a sentence from those two, fired on a plain event.
-- reviewed_by stays null: seed rules until the dietitian signs them off.
--
-- The deck is headed MALE ATHLETES and its 1.6-2.2 g/kg target is stated "for
-- teen male athletes". Every athlete in the study is male, so the app uses it
-- for everybody; a squad with girls in it would need Sofia's own band.

insert into public.weekly_challenges (week_number, theme, challenge)
values (2, 'Protein + Micronutrients', 'Add one protein source to every meal');

insert into public.advice_rules (code, domain, trigger, message_en, source, severity)
values
  ('no_protein_breakfast', 'protein',
   'From week 2: breakfast was logged with no protein source in it',
   'Starting your day at 0g protein means an entire repair window is missed before training even begins.',
   'week-2-deck', 2),

  ('no_protein_in_meal', 'protein',
   'From week 2: lunch, dinner or post-training was logged with no protein source in it',
   'Don''t change what you''re already eating — just add. Lunch has rice and veg? Add tempe or a boiled egg.',
   'week-2-deck', 1),

  ('protein_piled_at_dinner', 'protein',
   'From week 2: dinner carries more than 35g protein, the top of the deck''s per-meal sweet spot',
   'The body can only use 25–35g per meal for muscle protein synthesis. The goal is better-timed protein across the day, not a bigger dinner.',
   'week-2-deck', 1),

  ('post_training_no_protein', 'timing',
   'From week 2: a post-training entry was logged with no protein source in it',
   'Post-training in a hurry? 2 telur rebus + 1 pisang. Takes 30 seconds. That''s your recovery window covered.',
   'week-2-deck', 2);
