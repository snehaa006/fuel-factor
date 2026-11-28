-- App tier: the fun fact, written to be read at a glance.
--
-- Sneha, 28 November: "it just looks like text ... it should be very easily
-- readable, highlight things" -- the way Duolingo teaches. So each fact gets a
-- short catchy title and a "try this" action, and the fact itself is
-- rewritten short, with the words that matter marked **like this** for the
-- app to highlight. Bahasa beside each, as before. Seed 0021 holds the words;
-- every figure in a title, fact or tip is one its week's lesson prints
-- (daily-facts-seed.test.ts).

alter table public.daily_facts
  add column title text,
  add column title_id text,
  add column tip text,
  add column tip_id text;
