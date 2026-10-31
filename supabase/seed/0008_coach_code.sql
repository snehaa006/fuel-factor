-- Seed: the coach code for the demo team.
--
-- A placeholder in the same sense the join code is, and separate from it on
-- purpose: an athlete who knows FUEL01 must learn nothing about the coach's
-- reach. Theo changes both before anybody real uses them, which is an UPDATE.

update public.teams
set coach_code = 'COACH01'
where join_code = 'FUEL01';
