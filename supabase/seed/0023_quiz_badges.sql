-- Seed: the mini quiz's badges (see 20261128000005_quiz_badges.sql). Names
-- and thresholds are Theo's to change, like every badge. Safe to run twice.

insert into public.badges (code, name, description, criterion, threshold, position)
values
  ('first_quiz',    'Quick Learner',    'Finish one weekly mini quiz.',
   'quizzes_done', 1, 8),

  ('all_quizzes',   'Four Quizzes',     'Finish the mini quiz in all four weeks.',
   'quizzes_done', 4, 9),

  ('perfect_quiz',  'Full Marks',       'Get 7 out of 7 on a mini quiz.',
   'perfect_quizzes', 1, 10),

  ('perfect_month', 'Top of the Class', 'Get full marks on all four quizzes.',
   'perfect_quizzes', 4, 11)
on conflict (code) do nothing;
