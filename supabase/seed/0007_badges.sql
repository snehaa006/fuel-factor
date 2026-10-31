-- Seed: the badge set.
--
-- These are placeholders in the same sense the team name and join code are:
-- the mechanic is real and complete, and the particular names and thresholds
-- are Theo's to change. Changing one is an UPDATE, not a deployment.
--
-- Every threshold counts logging, streaks or challenges. None of them counts
-- food, because a badge for eating well would need a definition of eating
-- well and the programme has not written one.

insert into public.badges (code, name, description, criterion, threshold, position)
values
  ('first_log',      'First Touch',    'Log anything, once.',
   'days_logged', 1, 1),

  ('ten_days',       'Ten Days',       'Log on ten different days.',
   'days_logged', 10, 2),

  ('thirty_days',    'Full Month',     'Log on thirty different days.',
   'days_logged', 30, 3),

  ('week_streak',    'Seven Straight', 'Log seven days in a row.',
   'streak', 7, 4),

  ('fortnight',      'Fourteen Straight', 'Log fourteen days in a row.',
   'streak', 14, 5),

  ('first_challenge','Challenger',     'Finish one weekly challenge.',
   'challenges_done', 1, 6),

  ('all_challenges', 'Four for Four',  'Finish a challenge in all four weeks.',
   'challenges_done', 4, 7);
