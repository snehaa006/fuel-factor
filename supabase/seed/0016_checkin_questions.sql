-- Seed: each week's behaviour question for the Sunday check-in.
--
-- The check-in asks five things. Four are the WEEKLY LOG tab's own columns and
-- the same every week, worded as Theo sent them in the week 3 message:
--
--   "Average training energy last week (1–10)
--    Average urine colour — 1 = pale/clear, 8 = dark brown
--    Average water per day (glasses or mL)
--    Breakfast last week — every day / most days / some days / skipped"
--
-- The fifth is the tab's "Week Behaviour Check" and changes with the week.
-- Where it comes from, week by week:
--
--   Week 2 -- verbatim from the week 3 message ("Did you add a protein source
--             to 3+ meals last week? — every meal / most meals / some meals /
--             no"), which the week 2 challenge slide also asks ("Sunday
--             check-in: did you hit protein at 3+ meals?").
--   Week 3 -- the week 3 challenge slide: "Report Sunday: colour + sleep
--             hours". The colour is already question 2, so this is the hours.
--   Weeks 1 and 4 -- not written down in the programme's folder. The tracker
--             holds the answers ("Less cramps", "More energy and better sleep
--             after rice at night"; "Better", "Bit better"), and these two
--             questions are the ones those answers reply to, source
--             'tracker-answers'. Rewording either is an UPDATE of its row.
--
-- reviewed_by stays null: nobody has signed the wording off as such.

insert into public.checkin_questions (week_number, question, kind, options, source)
values
  (1, 'Did you notice any difference after adding carbs this week?',
      'text', null, 'tracker-answers'),
  (2, 'Did you add a protein source to 3+ meals last week?',
      'choice', array['Every meal', 'Most meals', 'Some meals', 'No'], 'week-3-message'),
  (3, 'Sleep hours last week (average per night)',
      'number', null, 'week-3-slides'),
  (4, 'How did you feel this week compared with week 1?',
      'choice', array['Better', 'A bit better', 'The same', 'Worse'], 'tracker-answers')
on conflict (week_number) do nothing;
