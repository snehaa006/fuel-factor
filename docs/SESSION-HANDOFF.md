# Context for a new session

Paste this as the first message in a fresh session.

---

I'm building **Fuel Factor**, a sports nutrition app for 14–16 year old footballers
in Jakarta. It's for Theo, a student in Ascend Now's entrepreneurship programme,
who pitches it at their **bullpen in the first or second week of December 2026**
(date still unconfirmed). I'm the developer.

Read these first — they hold the detail and I don't want it re-derived:

- `docs/PRODUCT-BRIEF.md` — the whole analysis: locked decisions, the state of
  their baseline data, the v1 feature set, the advice engine, the stack, the
  two-tier schema, and the open questions
- `docs/diagrams/*.puml` — five PlantUML activity diagrams of the app's flows
  (`plantuml -tpng *.puml` to render; it's installed)
- `supabase/README.md` — what's in the database and what's deliberately empty
- `mobile/` — the Expo app

## The people

**Theo** — the student founder, plays football in Jakarta. **Sofia** — the
dietitian; the nutrition is hers. **Bhavesh** — business mentor; pushed the B2B
angle. **Marilena** — Ascend Now coordinator.

## The one rule that matters most

**Nutrition belongs to the programme. Everything else belongs to the app.**

Never invent anything on the nutrition side — not a target, a threshold, a serving
guideline, an advice sentence, a scale, or a database column. If the Week 1 deck,
the transcript or their tracker doesn't state it, the app records the value and
says nothing about it. That's why the serving counters have no targets, fluid has
no daily goal, the carb ring shows a band rather than a midpoint, and `dq_score`
sits empty.

The engagement side is mine and needs nobody's permission: streaks, leaderboard,
MVP, challenges, photos, motion, haptics, navigation. Don't flag these or ask —
just build them.

## How the schema is split

Research tables (`participants`, `daily_logs`, `recalls`, `assessments`) mirror
their Google tracker **column for column** and are the only thing the CSV export
reads. Everything the app invents lives in app tables that are never exported.
There are tests that fail if a research table gains an app column.

## How we build

**Seed data and seed logic.** The app is built complete and working on seeded
content — nothing stubbed, no dead screens. When Sofia's real data and rules
arrive we replace the seeds; the app doesn't change shape. Build what we can with
what we have now and slot the rest in later.

**It's a native mobile app, not a website.** React Native via Expo, one codebase
for iOS and Android. Jakarta is Android-dominant.

## What's built

**Step 1** — Expo SDK 58, Expo Router, TypeScript. `design-system/tokens.json`
compiles to a typed theme via `mobile/scripts/generate-theme.mjs`, so a colour
change is `npm run theme`, never a hand edit. PiePie (local .ttf) and Josefin Sans
load behind a held splash. `PushButton` with its solid under-edge, 80ms drop,
spring release and haptics. Verified running on the iOS simulator in both themes.

**Step 2** — Supabase project `fuel-factor` (`nprvrlpkdrgckzceyryc`),
`ap-southeast-1` Singapore. 13 tables, RLS on all of them, security advisors
clean. 15 foods seeded from the Week 1 deck: 7 with its carbohydrate figures, the
rest null, zero protein and fat anywhere because the deck gives neither.

**71 tests pass.** `cd mobile && npm run check` runs theme generation, typecheck,
lint and tests.

## What's next

3. Today screen — fuel ring and meal timeline, reading seeded data
4. Food logger (search + portion) — **this one lets us re-run their 15 existing
   recall-days through the food database, replacing hand-typed calorie guesses
   with real macro grams for Theo's pitch**
5. Evening check-in — every field, which fills the two biggest holes in their data
6. Streak and advice cards
7. Learn — Week 1 from the PDF
8. Team and leaderboard
9. Coach dashboard (web, after the demo)

## Still waiting on Sofia

The DQ Score /12 formula · the eight urine swatch colours (mine are
approximations, and it's a measuring instrument) · serving and fluid targets ·
weeks 2–4 themes and challenges · whether to add `game` as a third day type.

## How I work

- **Commit as me, with no Claude attribution or co-author trailers.**
- Tests properly done. Run them, and actually run the app to look at it — don't
  just assume it works.
- Tell me plainly when something's wrong or you got it wrong. Don't pad.
