-- The team leaderboard.
--
-- App tier, and engagement rather than nutrition: it ranks the squad on how
-- consistently they log and on nothing else.
--
-- **Rank on logging consistency, never on body metrics.** These are 14 to 16
-- year olds. A leaderboard sorted by weight, waist or calf circumference is a
-- safeguarding failure and would sink the pitch with any school, so the figures
-- that would allow one never leave the database: this function returns a first
-- name, a count of days and two booleans. Section 6 of the brief is the rule;
-- the return type is where it is enforced.
--
-- Diet quality is the brief's other permitted axis and is deliberately absent.
-- `daily_logs.dq_score` has no formula yet -- the sheet names the column and
-- states nothing else -- so ranking on it would mean inventing the scale. When
-- the dietitian supplies one, it is a second column here and a second sort key.
--
-- Security definer for the same reason `team_roster` is: row level security
-- lets an athlete read their own `daily_logs` and no one else's, which is
-- correct and makes a leaderboard impossible to assemble on the client. This
-- function is the one narrow hole in that wall, and it is narrow by its return
-- type -- a caller cannot widen it into a query.

create function public.team_leaderboard(
  p_today date    default current_date,
  p_days  integer default 7
)
returns table (
  participant_code text,
  name             text,
  days_logged      integer,
  logged_today     boolean,
  is_me            boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select private.current_participant_id() as participant_id
  ),
  -- The caller's own team. A device that has claimed nobody has no team and
  -- gets no rows, rather than a view of somebody else's squad.
  my_team as (
    select pp.team_id
    from public.participant_profiles pp, me
    where pp.participant_id = me.participant_id
      and pp.team_id is not null
  ),
  -- The window, clamped. The date comes from the caller because the app's
  -- "today" is a Jakarta wall-clock date and the server's current_date is UTC;
  -- at one in the morning in Jakarta those are different days, and the athlete
  -- who just logged would not be lit. A caller who passes a date of their own
  -- moves the window for everybody in it equally, so there is nothing to win.
  bounds as (
    select
      p_today as to_date,
      p_today - (least(greatest(coalesce(p_days, 7), 1), 31) - 1) as from_date
  )
  select
    p.participant_code,
    p.name,
    count(distinct dl.log_date)::integer,
    coalesce(bool_or(dl.log_date = (select to_date from bounds)), false),
    p.id = (select participant_id from me)
  from public.participant_profiles pp
  join my_team mt on mt.team_id = pp.team_id
  join public.participants p on p.id = pp.participant_id
  left join public.daily_logs dl
    on dl.participant_id = p.id
   and dl.log_date between (select from_date from bounds) and (select to_date from bounds)
  group by p.id, p.participant_code, p.name
  -- Ties break on the name, which is arbitrary and visibly so. Any other
  -- tiebreak would be a hidden second ranking, and the only figures available
  -- to hide one in are the ones this function exists to keep out.
  order by count(distinct dl.log_date) desc, p.name;
$$;

comment on function public.team_leaderboard(date, integer) is
  'Squad ranking on logging consistency. Returns a first name, a day count and two booleans -- never a body metric, because the athletes are minors. App tier; never exported.';

revoke all on function public.team_leaderboard(date, integer) from public, anon;
grant execute on function public.team_leaderboard(date, integer) to authenticated;
