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
