# Database

Supabase project `fuel-factor` (`nprvrlpkdrgckzceyryc`), region `ap-southeast-1`
Singapore — about 30 ms from Jakarta.

## The two tiers

**Research tables mirror the programme's Google tracker column for column.**
`participants`, `daily_logs`, `recalls`, `assessments`. The CSV export reads only
these four, and nothing the app invents is ever added to them. A new field goes
into their workbook first and here second.

**App tables carry what the product needs and the study does not record.**
`teams`, `team_members`, `participant_profiles`, `food_items`, `food_portions`,
`log_items`, `training_sessions`, `weekly_challenges`, `challenge_completions`,
`advice_rules`, `lesson_cards`, `lesson_points`, `badges`, `recall_nutrition`.
None of it is exported, and the whole tier could be dropped without touching a
research column.

`recall_nutrition` is the newest case and the same argument as
`training_sessions`. The dietitian asked for calories, carbohydrate, protein and
fat to be computed from a recall's free text — *"This will be backend. This is
not manual calculation"* — and the RECALL sheet has one column for it,
`est_calories`, which holds hand-typed estimates. Computed figures land in a
table of their own keyed on the recall, so the export cannot pick one up and
present it as something the study collected. **It is written by
`compute_recall_nutrition` and by nothing else**: there is no insert or update
policy, so a phone cannot put a carbohydrate figure in by hand.

`training_sessions` is the clearest case of why the split exists. Two advice
rules are written against a training session — "2 to 3 hours before", "refuel
within 30 minutes" — so the app has to know when the session was. The tracker
has no column for it, so it is a table of its own rather than two more columns
on `daily_logs`, and the export never sees it.

## What is deliberately empty

| Column | Why |
|---|---|
| `daily_logs.dq_score` | The sheet names the column and states no formula. A diet quality score is nutrition, so the app does not invent one. |
| `food_portions.protein_g`, `fat_g` | The Week 1 deck gives neither for any food. Fill from TKPI, never from an estimate. |
| `food_portions.kcal`/`carbs_g` on 7 of 15 foods | The deck lists them with guidance but no figures. |
| `advice_rules.reviewed_by` | Null means a seed rule. The dietitian's name here is what clears a rule for the real programme. |
| `day_type` has no `game` | Their Day Type column only ever holds `training` or `rest`. The deck gives a game-day carb band, and the Learn page shows it because that page is their material — but showing the deck is not adding a value to their schema. |
| `challenge_completions.photo_path` | Null until the athlete adds a photo. It holds a storage path, never a URL — a URL in the database would outlive the policy meant to guard it. |
| Lessons for weeks 2 to 4 | Only week 1 has been written. A week with no `lesson_cards` rows shows locked, so seeding a week is all it takes to unlock it. |
| `recall_nutrition.kcal`, `carbs_g`, `protein_g`, `fat_g` | `compute_recall_nutrition` computes nothing yet and says so in `method` and `note`. Turning a recall's free text into grams needs the Jakarta composition tables; this database has carbohydrate for seven foods and no protein or fat for any. A zero would assert an athlete ate none. |
| `recalls.est_calories` | Still the sheet's hand-typed estimate. The app never writes it: replacing it with a computed figure is a decision about a column the export reads, not a side effect of the stub. |
| `teams.programme_starts_on` | Null until a coach sets it. Every recall prompt is counted from it, and the app never guesses a date nobody chose. |

## The two codes, and why one of them is revoked

`teams.join_code` is handed out; `teams.coach_code` makes another coach. The
read policy on `teams` lets any member select the row, and an athlete is a
member — so `select coach_code from teams` answered for them. `claim_coach`
refuses a device already holding an athlete, so they could not promote the phone
in their hand; they could read the code and use it on a second install.

Closing it took two goes, and the first one is worth knowing about.
`20261101000001` wrote `revoke select (coach_code) on public.teams from
authenticated`, which removes a *column-level* grant — and Supabase grants
`select` on every public table to `anon` and `authenticated` at **table
level**, which covers every column. The statement succeeded and changed
nothing.

`20261101000004` does it the other way round and is what actually works:

```sql
revoke select on public.teams from authenticated, anon;
grant select (id, name, join_code, created_at, created_by, programme_starts_on)
  on public.teams to authenticated;
```

Now `select coach_code from teams` and `select *` are both refused for
`authenticated`, `anon` holds nothing on the table at all, and the six columns
the app actually reads are unchanged. A coach reads their own code through
`my_team()`, which is security definer and answers only a coach.

If you ever touch grants on `teams`, re-run:

```sql
select has_column_privilege('authenticated','public.teams','coach_code','SELECT');  -- must be false
```

Both codes are generated by `private.new_code`, never chosen. A coach picking a
join code picks a guessable one, and a guessable join code is a stranger reading
a roster of named minors through `team_roster`. The alphabet omits 0/O and
1/I/L, because these get typed off a WhatsApp message and read out across a
pitch.

## Writing a participant row from the app

`join_team` is the only route by which a `participants` row is created from a
phone, and `participants` gains no insert policy — the same shape
`claim_participant` has. It takes the PARTICIPANTS sheet's own columns and no
others, generates the `participant_code` rather than accepting one (a joiner
typing `T-01` would be typing Theo's real row), and refuses without the app's
consent argument.

`consent_signed` and `consent_ack_at` stay separate records. The first is the
programme's parental form signed on paper, which the joiner is *reporting* on;
the second is the app's own gate. Writing one from the other would put an app
event into the study's record dressed as a collected fact.

## The challenge photo

`challenge-photos` is a **private** bucket: 5 MB, image MIME types only,
nothing served from a public URL. The app holds an object path and asks for a
signed URL that expires in five minutes.

The path is `<participant_id>/<challenge_id>/<date>.<ext>`, so the first
folder is the owner and the policy checks it against the caller's own
participant — not against anything the client claimed.

**A coach can read the completion row and not the image.** A tick on a log is
what the coach dashboard is for; a photo of a 14-year-old is not, nobody
asked for it, and it cannot be un-shared afterwards. Four tests assert this,
including that no storage policy mentions a coach.

## The leaderboard

`team_leaderboard(p_today, p_days)` is the squad's standings. It exists as a
function rather than a query because row level security lets an athlete read
their own `daily_logs` and nobody else's -- which is correct, and makes a
leaderboard impossible to assemble on the client.

**It ranks on logging consistency and on nothing else.** The athletes are 14 to
16 years old, so a board sorted by weight, waist or calf circumference is a
safeguarding failure; the return type is where that is enforced, because it
carries a participant code, a first name, a day count and two booleans and has
no column a measurement could travel in. Six tests in
`mobile/src/lib/__tests__/schema.test.ts` fail if that list grows.

Diet quality is the brief's other permitted axis and is deliberately absent:
`dq_score` has no formula, and ranking minors on a scale the app invented would
be worse than ranking them on nothing. When the dietitian supplies one it is a
second column here and a second sort key.

`p_today` is the caller's date, not `current_date`, because the app's day is a
Jakarta wall clock and the server's is UTC -- at one in the morning in Jakarta
those are different days and the athlete who just logged would not be lit. A
caller who passes a date of their own moves the window for everybody in it
equally, so there is nothing to win by it.

It takes no join code, unlike `team_roster`: it answers only about the team the
caller's own claimed athlete belongs to, so a device cannot ask about a squad
it has not joined. A device that has claimed nobody gets no rows.

A coach has no `participant_profiles` row, so they get no rows either. The
coach's view of the squad is the dashboard, which is still to be built.

## Badges

`badges` holds the definitions; nothing holds the awards. A badge is earned
when the athlete's own rows satisfy its criterion, worked out on read exactly
as the streak is, so there is no awards table to drift out of step with the
logs and no job that has to run at midnight.

**Every criterion is behavioural** -- `days_logged`, `streak`,
`challenges_done` -- and the enum is the whole list. That is not only because
the athletes are minors: a badge for eating well would need a definition of
eating well, and the programme has not written one. A badge for logging ten
days needs nothing from anybody.

The names and thresholds are Theo's. Changing one is an UPDATE.

## Coach access

The policies have said "a coach sees their team's rows" since the first
migration, but until `20261031000011` nothing could make a coach:
`claim_participant` only ever writes role `athlete`.

`teams.coach_code` is a second code, deliberately not `join_code`. Handing the
squad their join code must not hand them the whole team's logs, so an athlete
who knows `FUEL01` learns nothing about the coach's reach — though for a while
they could simply *read* the column, which is what the revoke above fixes.

`claim_coach(coach_code)` adds the membership row and returns the team name. It
refuses a device that already holds an athlete, rather than releasing the
athlete: a shared phone must not quietly gain a coach's reach. It never touches
`participant_profiles`, so a coach has no `current_participant_id()` -- which is
what keeps the leaderboard and the badges silent for them rather than wrong.

`create_team(name, starts_on)` is the other way in, and the one a coach who owns
a squad uses. It **refuses an anonymous session**, checking the `is_anonymous`
claim Supabase signs into the token: a team owned by an anonymous device is lost
the moment the app is reinstalled, with nothing to prove it was theirs. So a
coach has an email and a password and the athletes do not — which is also why
the coach half of the app can be exercised live while anonymous sign-ins stay
off. Like `claim_coach` it refuses a device already signed in as an athlete,
because holding a participant row and a coach membership at once gives every
"which athlete is this" question two right answers.

`create_team` and `claim_coach` remain the only two ways a coach row is ever
written: the insert policy on `team_members` only ever allowed role `athlete`,
so nobody can PATCH themselves into a coaching role.

The dashboard itself needs no function. Everything it reads -- the team's
participants, their daily logs, their log items -- a coach may already read
under the existing policies. **Challenge photos are the one exception and stay
that way**: the storage policies grant a coach nothing, and the tests assert no
policy mentions one.

## Row level security

Every table has RLS on. An athlete sees their own rows; a coach sees their
team's; a coach can read but never write an athlete's log. Reference data — the
food database, the challenges, the advice rules — is readable by any signed-in
user and writable by none, because it changes through migrations and the
dietitian's review, not from a phone.

The three helper functions live in the `private` schema rather than `public`, so
PostgREST gives them no RPC endpoint. Supabase's security advisor flags them
otherwise.

## Applying

Migrations in `migrations/` ran in filename order. Seeds in `seed/` are data, not
schema, and ran after them.

## What is seeded

| Seed | Holds |
|---|---|
| `0001_week1_foods.sql` | 15 foods from the Week 1 deck |
| `0002_week1_programme.sql` | Week 1's challenge and 5 advice rules |
| `0003_baseline_roster.sql` | The three footballers, their nine baseline urine readings, two Cooper runs |
| `0004_team.sql` | The team they belong to. App tier |
| `0005_demo_today.sql` | **Demo only.** A part-finished day for Theo, so the Today screen has something to draw |
| `0006_week1_lessons.sql` | Week 1's lesson cards, built from the deck |
| `0007_badges.sql` | The badge ladder. Names and thresholds are Theo's to change |
| `0008_coach_code.sql` | The demo team's coach code. Separate from the join code on purpose |

`0003` is transcribed from the programme's tracker by way of
`docs/PRODUCT-BRIEF.md` section 2. The meals eaten on those nine recall days are
deliberately absent: the tracker holds them as free text, that text is not in
this repository, and writing plausible meals for three named minors into a
research table would put invented food into the study's own record. They land
when the tracker export does.

`0005` is the one seed holding food nobody ate. Drop it with:

```sql
delete from public.daily_logs where log_date = current_date;
```

## Onboarding: how a device becomes an athlete

No per-athlete passwords. The squad is 14 to 16 years old, so identity is a
team code plus the athlete you pick, which is the brief's own fallback.

1. The app signs in **anonymously**. The session exists only so row level
   security has a user to answer about; no credential is ever collected.
2. `team_roster(join_code)` returns who is in that team and who is still free.
   It is `security definer` because a device that has claimed nobody can see no
   participant row at all. It returns a code and a first name and nothing else.
3. `claim_participant(join_code, participant_code, consent_ack)` links the user
   to one athlete. **Consent is an argument, not a later update**, so there is
   no ordering in which a device is linked to an athlete before the screen was
   accepted — decision 8 of the brief is enforced here, not only in the UI.

It refuses: no session, consent not given, unknown team code, unknown athlete,
and an athlete already held by another device. Re-claiming the athlete this
device already holds is a no-op, so a retry after a dropped connection does not
read as theft. Claiming a second athlete releases the first.

`participant_profiles.user_id` has no insert or update policy, so claiming goes
through that function and nowhere else — nobody can point a profile at
themselves with a direct PATCH.

### consent_ack_at is not consent_signed

`participant_profiles.consent_ack_at` records that the in-app screen was
accepted. `participants.consent_signed` mirrors their sheet, where it means a
parental consent form was signed on paper. A checkbox is not that form, and the
app never writes one into the other.

### Four security advisor warnings are expected

`team_roster`, `claim_participant`, `team_leaderboard` and `claim_coach` are
flagged as `authenticated_security_definer_function_executable`. That is the
point of them: unlike the RLS helpers in `private`, these four are meant to be
called by a signed-in user. Do not "fix" them by revoking execute.

## Still needed before any of it runs

**Anonymous sign-ins are disabled on the project.** Turn them on in the
Supabase dashboard under Authentication → Sign In / Providers. Only the project
owner can. Until then the gate says so on screen rather than failing silently.

`EXPO_PUBLIC_DEMO_DATA=1` draws the Today screen from a fixture, skipping the
gate entirely, for layout work without a session.
