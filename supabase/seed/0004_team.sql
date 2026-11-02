-- Seed: the team the three athletes train with.
--
-- App tier. The tracker has no team column and never will; Theo asked for a
-- squad to compete inside, so the entity lives here and is never exported.
-- The name and join code are placeholders until Theo gives the real ones --
-- changing them is an update, not a migration.

-- Day one is a placeholder like the name and the code, and relative rather
-- than fixed: the three athletes' baseline is already in the seeds, so a
-- squad that started four weeks and two days ago is the state the app is
-- actually interesting in -- logging open, follow-up recall due. A literal
-- date would have gone stale the week after it was typed.
--
-- `teams` is app tier. The tracker has no team row and the CSV export reads
-- none of this, so a placeholder here puts nothing invented into the study's
-- own record.
insert into public.teams (name, join_code, programme_starts_on)
values ('Jakarta U16', 'FUEL01', current_date - 30);

insert into public.participant_profiles (participant_id, team_id)
select p.id, t.id
from public.participants p
cross join public.teams t
where t.join_code = 'FUEL01'
  and p.participant_code in ('J-01', 'T-01', 'JA-01');

-- user_id stays null on all three. It is filled when an athlete signs in and
-- claims their row; until auth ships there is nobody to point it at.
