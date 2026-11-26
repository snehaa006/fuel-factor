-- Seed: the advice rules weeks 3 and 4 support.
--
-- Source: the week 3 deck and the week 4 slides, as already seeded in
-- 0013_week3_lessons.sql and 0014_week4_lessons.sql. Every message below is
-- copied from those two files. reviewed_by stays null: seed rules until the
-- dietitian signs them off, so the app shows "Awaiting dietitian review".
--
-- Only what the daily log can answer is a rule. What was left out, and why:
--
--   * "Breakfast before training" (week 4's morning protocol) is already
--     no_breakfast_training_day, which fires on training and match days alike.
--   * "Post-session recovery within 30 minutes" (week 4) is already
--     refuel_window_open and post_training_no_protein.
--   * "500mL water on waking" (week 4) is not recorded: the check-in keeps a
--     day's fluid total, not when it was drunk. No rule claims to check it.
--   * Urine colour 5 and above is urine_five_or_worse, from week 1. The week 3
--     rule below stops at 4 so a reading never fires both.
--   * Sleep hours, "do NOT arrive to it fasted" and the night-before carb load
--     need a field or a date the log does not hold.
--
-- Two of the messages are trimmed and say how: the week 3 snack sentence
-- drops its "Second: " list marker and capitalises its first word, and the
-- top-up snack joins the slide row's two cells with a full stop. No word is
-- added.

insert into public.advice_rules (code, domain, trigger, message_en, source, severity)
values
  ('no_presleep_snack_training_night', 'timing',
   'From week 3: a training or match day has dinner logged and no milk or banana in the evening snack (a food whose first word is susu, pisang, milk or banana)',
   'On training nights, have warm milk or a banana 30 minutes before sleep.',
   'week-3-deck', 1),

  ('urine_three_or_four', 'hydration',
   'From week 3: urine colour was recorded at 3 or 4, which the week 3 deck''s guide reads as drink more today (5 and above is urine_five_or_worse)',
   '3–4: drink more today.',
   'week-3-deck', 1),

  ('top_up_snack_hour_before', 'timing',
   'From week 4: a training or match day has the pre-training slot still unlogged in the hour before the session starts. In that hour it replaces pre_training_meal',
   'Top-up snack + 500mL fluid. Pisang (banana) or roti + selai kacang (bread + peanut butter).',
   'week-4-slides', 1);
