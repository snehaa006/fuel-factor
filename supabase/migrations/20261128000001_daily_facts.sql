-- App tier: the fact of the day.
--
-- Sofia, 25 November: "maybe it could be a toggle that they can click in, did
-- you know, or fact for the day." Theo: fun facts "so they can just read it on
-- the side, so it's not too overwhelming." Sneha, 28 November: the week's
-- lesson taught over its seven days, a part a day, so that by the seventh day
-- the whole lesson has been covered.
--
-- So: seven facts per programme week, one for each day, in the order the
-- week's lesson runs. Each is a sentence or two in the lesson's own words and
-- with its own figures (seed 0019, checked against the lesson seeds by
-- daily-facts.test.ts), with the lesson card it comes from. Bahasa sits beside
-- the English, as message_id does on advice_rules.
--
-- Content, like checkin_questions: readable by any signed-in account, written
-- by nobody from a phone, never exported.

create table public.daily_facts (
  week_number  smallint not null check (week_number between 1 and 4),
  day          smallint not null check (day between 1 and 7),
  fact         text not null,
  fact_id      text,
  -- The heading of the lesson card the fact is taken from.
  topic        text not null,
  source       text not null,
  reviewed_by  text,
  created_at   timestamptz not null default now(),
  primary key (week_number, day)
);

comment on table public.daily_facts is
  'App tier, never exported. The fact of the day: the week''s lesson in seven daily parts.';

alter table public.daily_facts enable row level security;

create policy "read daily facts" on public.daily_facts
  for select to authenticated using (true);
