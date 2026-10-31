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
`advice_rules`, `lesson_cards`, `lesson_points`. None of it is exported, and the
whole tier could be dropped without touching a research column.

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
| `challenge_completions.photo_path` | The challenge records that it was done; the photo needs a storage bucket and a picker, which is its own piece of work. |
| Lessons for weeks 2 to 4 | Only week 1 has been written. A week with no `lesson_cards` rows shows locked, so seeding a week is all it takes to unlock it. |

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

### Two security advisor warnings are expected

`team_roster` and `claim_participant` are flagged as
`authenticated_security_definer_function_executable`. That is the point of
them: unlike the RLS helpers in `private`, these two are meant to be called by
a signed-in user. Do not "fix" them by revoking execute.

## Still needed before any of it runs

**Anonymous sign-ins are disabled on the project.** Turn them on in the
Supabase dashboard under Authentication → Sign In / Providers. Only the project
owner can. Until then the gate says so on screen rather than failing silently.

`EXPO_PUBLIC_DEMO_DATA=1` draws the Today screen from a fixture, skipping the
gate entirely, for layout work without a session.
