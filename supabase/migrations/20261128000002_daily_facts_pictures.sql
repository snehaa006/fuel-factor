-- App tier: pictures for the fact of the day.
--
-- Sneha, 28 November: make the fun fact fun -- a picture with each one and the
-- mascot beside it, so it is easy to remember. Each fact gets:
--
--   emoji        the fact's picture, drawn big on the card
--   headline     its one number or word, drawn bigger still ("60–70%"), and
--                headline_id in Bahasa; any figure in it is the fact's own
--   pose         which of the mascot board's eight poses stands beside it
--
-- The fact stays on the card, not in the mascot's speech: the astronaut is the
-- illustration, and never the one saying anything about food (mascot-copy.ts).

alter table public.daily_facts
  add column emoji text,
  add column headline text,
  add column headline_id text,
  add column pose text check (pose in ('float', 'stand', 'run', 'learn', 'think', 'fuel', 'best', 'balloons'));
