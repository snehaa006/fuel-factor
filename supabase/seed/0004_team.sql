-- Seed: the team the three athletes train with.
--
-- App tier. The tracker has no team column and never will; Theo asked for a
-- squad to compete inside, so the entity lives here and is never exported.
-- The name and join code are placeholders until Theo gives the real ones --
-- changing them is an update, not a migration.

insert into public.teams (name, join_code)
values ('Jakarta U16', 'FUEL01');

insert into public.participant_profiles (participant_id, team_id)
select p.id, t.id
from public.participants p
cross join public.teams t
where t.join_code = 'FUEL01'
  and p.participant_code in ('J-01', 'T-01', 'JA-01');

-- user_id stays null on all three. It is filled when an athlete signs in and
-- claims their row; until auth ships there is nobody to point it at.
