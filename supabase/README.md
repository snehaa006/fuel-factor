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
`log_items`, `weekly_challenges`, `challenge_completions`, `advice_rules`. None
of it is exported, and the whole tier could be dropped without touching a
research column.

## What is deliberately empty

| Column | Why |
|---|---|
| `daily_logs.dq_score` | The sheet names the column and states no formula. A diet quality score is nutrition, so the app does not invent one. |
| `food_portions.protein_g`, `fat_g` | The Week 1 deck gives neither for any food. Fill from TKPI, never from an estimate. |
| `food_portions.kcal`/`carbs_g` on 7 of 15 foods | The deck lists them with guidance but no figures. |
| `advice_rules.reviewed_by` | Null means a seed rule. The dietitian's name here is what clears a rule for the real programme. |
| `day_type` has no `game` | Their Day Type column only ever holds `training` or `rest`. The deck gives a game-day carb band, but the value is not in their schema. |

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

## Reading any of it from the app

Every policy is `to authenticated`, so an unauthenticated client sees nothing —
correctly. The app has no sign-in yet, which means the Today screen reads zero
rows until one exists. Two things unblock it, in this order:

1. **Enable anonymous sign-ins** in the Supabase dashboard, under
   Authentication → Sign In / Providers. Only the project owner can do this.
2. **Claim a participant** — point `participant_profiles.user_id` at the signed-in
   user. This is the team-code onboarding step the brief describes, and it is
   the first thing the consent gate will do.

Until then, `EXPO_PUBLIC_DEMO_DATA=1` draws the Today screen from a fixture that
mirrors these seeds, for layout work without a session.
