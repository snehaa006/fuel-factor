-- App tier: badges for the mini quiz.
--
-- Sneha, 28 November: "add rewards for completing quiz". Two new criteria,
-- both behavioural like the rest -- they count quizzes taken and quizzes got
-- fully right, read from quiz_results on the fly, exactly as days logged are
-- read from daily_logs. The badges themselves are rows (seed 0023).
--
-- A value added to an enum cannot be used in the same transaction, which is
-- why the badge rows are a seed of their own.

alter type public.badge_criterion add value if not exists 'quizzes_done';
alter type public.badge_criterion add value if not exists 'perfect_quizzes';
