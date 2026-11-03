-- Assessments get entered in the app, and a day can be a match day.
--
-- 1. MATCH DAY
--
-- The tracker's Day Type column is Training / Match / Rest, and the Week 1
-- deck already gives match days their own carbohydrate band (6-8 g/kg). The
-- enum only had the two, so a match had to be logged as training.
--
-- `add value` cannot be used by anything else in the same transaction, which
-- is why nothing below touches it.

alter type public.day_type add value if not exists 'match' after 'training';

-- 2. ASSESSMENTS, WRITTEN IN THE APP
--
-- `assessments` has been read-only since the first RLS migration, on the
-- grounds that the ASSESSMENTS tab is filled by hand on a pitch. The
-- programme now wants the Week 0 and Week 4 values entered in the app, so the
-- table takes writes from the two people who take those measures:
--
--   * the athlete, for their own row (subjective scores, urine colour, and
--     anything they read off themselves), and
--   * a coach of that athlete's team, who runs the sprint, the jump and the
--     Cooper run.
--
-- Same helper the read policy already uses, so "who may write" and "who may
-- read" cannot drift apart. No delete policy: a value is cleared by writing
-- null, so a measure row, once it exists, stays in the research record.

create policy "insert own or coached assessments" on public.assessments
  for insert to authenticated
  with check (private.can_see_participant(participant_id));

create policy "update own or coached assessments" on public.assessments
  for update to authenticated
  using (private.can_see_participant(participant_id))
  with check (private.can_see_participant(participant_id));

comment on table public.assessments is
  'ASSESSMENTS tab, one row per participant per measure. pre_value is Week 0, post_value is Week 4. Written in the app by the athlete or their coach.';
