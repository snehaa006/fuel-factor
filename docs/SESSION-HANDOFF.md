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

**Step 3** — Today screen. Streak chip, Training/Rest switch, the fuel ring
drawn as a *band* (5-7 g/kg training, 3-4 g/kg rest, never a midpoint), the
six-slot meal timeline, one advice card and the DQ slot showing "Not scored
yet". Seeds 0003-0005 added the three footballers, their nine baseline urine
readings, two Cooper runs, the team, and a demo day for Theo. Verified on the
iOS simulator in both themes.

**Step 3.5** — Auth and the consent gate. A device signs in anonymously, enters
a team code, and claims one athlete; `claim_participant` takes consent as an
argument and refuses without it, so the gate is enforced in the database and
not only in the UI. `consent_ack_at` is app tier — it is deliberately NOT
`participants.consent_signed`, which means the paper form.

**Step 4** — Food logger. Tap a meal slot (or Log a meal) → search the food
database in Indonesian or English → portion → how many → the carbohydrate for
that choice. Writing an item ticks the slot on `daily_logs`, because the CSV
export reads the tick; removing the last item in a slot unticks it. A food the
deck gives no figure for says so and is still logged.

**Step 5** — Evening check-in. Every DAILY LOG column the athlete fills: four
serving counters with no target beside them, fluid in mL, the 1-8 hydration
reading, the five 1-10 self-ratings, and notes. Blank stays null, never zero.
`dq_score` is never written.

**Step 6** — Streak and advice cards. The streak grew a seven-day strip under
the chip, so a gap two days back is visible rather than hidden inside a count,
plus a "best so far" line when the best run beats the current one. The
hydration rule now fires: step 5 gave `daily_logs.urine_colour` a value, so
`urine_five_or_worse` came off the bench and the Today screen carries up to two
cards, tinted by domain.

**Step 6b** — Training session time, so the last two advice rules can fire.
`training_sessions` is a tier-2 table keyed on the daily log, holding a start
and an end as local wall clocks. On a training day the Today screen offers a
quarter-hour stepper for each. With it, `pre_training_meal` fires in the two
hours before the session and `refuel_window_open` thirty minutes after it
ends. **All five seeded rules now fire.** The windows are the deck's; the app
supplies only the clock.

**Step 7** — Learn. The four weeks, with week 1 built from the deck: the
intro, the four headline figures, myth vs fact, the five-step glycogen chain,
the depletion timeline with its citation, pre/during/post timing, the four
target bands and the Jakarta food table. Weeks 2 to 4 are locked. Lessons are
rows in `lesson_cards` / `lesson_points`, so weeks 2 to 4 arrive as an INSERT
and not as a code change — locked is derived from a week having no cards, so
seeding week 2 unlocks week 2 with nothing else to remember. The food table
reads `food_items` rather than carrying a second copy of those figures. The
week's challenge can be marked done, which writes `challenge_completions`.

**Step 7b** — The challenge photo. `expo-image-picker` for camera or
library, `expo-image-manipulator` to cap the long edge at 1280 and re-encode
before upload, into a **private** `challenge-photos` bucket. The row stores a
path, never a URL; drawing the image asks for a signed URL that expires in
five minutes. Adding a photo also marks the day done; removing it leaves the
day done.

**398 tests pass.** `cd mobile && npm run check` runs theme generation, typecheck,
lint and tests. Run it before saying anything is done.

### Where things are

| Path | What |
|---|---|
| `mobile/src/app/index.tsx` | Today |
| `mobile/src/app/welcome.tsx` | Consent gate, team code, claim an athlete |
| `mobile/src/app/log/[slot].tsx` | Food logger |
| `mobile/src/app/check-in.tsx` | Evening check-in |
| `mobile/src/lib/targets.ts` | The carbohydrate bands. The deck's numbers, nothing else |
| `mobile/src/lib/today.ts` | Day summary, slot roll-up, day type |
| `mobile/src/lib/logger.ts` | Food search, portions, writes and slot ticks |
| `mobile/src/lib/check-in.ts` | The DAILY LOG fields, limits, urine wording |
| `mobile/src/lib/advice.ts` | Rule evaluation. All five seeded rules fire |
| `mobile/src/lib/streak.ts` | Streak length, the seven-day strip, best run |
| `mobile/src/lib/session.ts` | Training session times, as minutes since midnight |
| `mobile/src/lib/learn.ts` | The four weeks, the cards, challenge completion |
| `mobile/src/lib/photos.ts` | Challenge photo paths, upload, signed URLs |
| `mobile/src/components/challenge-photo.tsx` | Pick, downscale, preview, remove |
| `mobile/src/app/learn/index.tsx` | The week list |
| `mobile/src/app/learn/[week].tsx` | One week's cards |
| `mobile/src/components/lesson-card.tsx` | A card per shape the deck uses |
| `mobile/src/components/session-times.tsx` | The start/end stepper |
| `mobile/src/components/streak-strip.tsx` | The week strip |
| `mobile/src/lib/auth.ts` | Anonymous sign-in, roster, claim |
| `mobile/src/lib/errors.ts` | `messageOf` / `asError` — read this before touching error handling |
| `mobile/src/lib/__fixtures__/today.ts` | The demo day and demo foods |

## Where the code is right now

On branch **`sneha`**, pushed. `origin/sneha` is up to date — the push the last
session's sandbox kept refusing went through on the first try this time, so
that whole workaround note is gone.

Local `main` is still eight commits ahead of `origin/main` and carries
everything except steps 5 and 6. Nothing has been merged into it.

## The one thing blocking live data

**Anonymous sign-ins are disabled on the project.** Turn them on in the
Supabase dashboard under Authentication → Sign In / Providers. Only the project
owner can, and nothing else is needed — the claim flow is built and the gate
says so on screen until then. `EXPO_PUBLIC_DEMO_DATA=1` draws the Today screen
from a fixture meanwhile, skipping the gate.

## Two things the check-in could not do honestly

**Sleep hours and supplements are not on it.** The brief lists them with this
screen, but they are RECALL columns, not DAILY LOG ones, and recalls are
filled by the research team rather than through the app. Putting them here
means adding columns to a research table, which goes into the programme's
workbook first and here second. Ask Sofia whether they belong on the daily log.

**The hydration scale has numbers, not swatches.** The eight chart colours are
not in this repository and an approximated swatch does not make the reading
vaguer, it makes it wrong — and this is the measurement Theo's three days at 6
rest on. The athlete matches against the workbook's printed chart and taps the
number. The tracker's own wording shows for the levels it has worded (3 to 6);
the rest show none rather than a guess. When Sofia gives the eight values they
become colour tokens and each cell gets its fill.

## Things that will bite, and did

**supabase-js rejects with a plain object, not an Error.** `e instanceof Error`
is false for it and `String(e)` gives `[object Object]` — which is what reached
the screen before it was caught by running the app, because the tests had
rejected with real Errors and hidden it. Everything now goes through
`messageOf` / `asError` in `mobile/src/lib/errors.ts`. If you write a test that
rejects, reject the way supabase-js actually does.

**Firing several events in one synchronous block breaks the *next* test.** It
leaves a state update in flight past the end of the test, and the following
test then renders an empty tree with a baffling "Unable to find element". Let
each event land — `await waitFor(...)` between them. This cost two separate
debugging sessions before it was pinned down.

**`screen.unmount()` followed by a second `render` in one test breaks the
*next* test** in exactly the same way, with the same "Unable to find element"
pointing at a line that is fine. Same cause, different trigger. One render per
test: to compare two prop values, write two tests.

**A default parameter that calls an imported function is a runtime import,
and it crashed the app while every test passed.** `evaluate(summary, rules,
now = nowMinutes())` in `advice.ts` pulled a value out of `session.ts`, which
imports `supabase.ts`; under Metro that resolved to undefined and the Today
screen rendered blank with "Property 'nowMinutes' doesn't exist". Jest's
resolver did not care, so 343 tests passed against a bundle that could not
boot. `now` is now a required argument and `advice.ts` imports only a type.
Keep the rule engine pure — and if a screen goes white, read the Metro log
before anything else.

**Metro serves a stale bundle after a crash like that.** It kept reporting the
old source line, from a file that no longer contained it, through several
reloads. Restart with `--clear`; do not spend time doubting the edit.

**A second Expo dev server from an older session will serve your app and you
will not notice.** Port 8081 had a server running from a previous session;
every `expo start` here took 8082 and logged no bundle, while the simulator
was being served by 8081 the whole time. Symptom: edits appear, but a newly
installed native module does not resolve. Check for an `iOS Bundled` line in
*your* log before believing what is on screen, and force-quit Expo Go from
the app switcher to make it reconnect.

**An async `onPress` swallows its own rejection.** The photo picker threw and
the button simply did nothing — no error, no log. Every async handler needs a
`.catch` that puts the message somewhere the athlete can see it.

**Fast refresh does not re-run `useToday`.** Its effect keys on a reload
nonce, so editing a fixture and waiting changes nothing on screen. Relaunch the
app — `open_url` with the `exp://…` address — or you will be reading a stale
render and believing it.

**`toHaveTextContent` matches exactly here**, not as a substring. Use a regex.

**RN 0.88 has no `StyleSheet.absoluteFillObject`.** Write the four offsets.

**A ring has to contrast with whatever is inside it, and the fill changes
with the theme.** The week strip first marked today with a `pisang-deep`
outline, which is a dark brown on orange in light and a *light* orange on
orange in dark, where it all but vanished. Caught by looking at the simulator
in dark mode, not by a test. Today is now marked by a larger dot and a darker
initial — size and text colour mean the same thing in both themes. Check both
themes on anything that draws a border.

**A computed key in a Supabase `.update()` widens to a string index** and loses
the column types. `logger.ts` spells the six slot ticks out as a `Record` over
the enum so a seventh slot breaks the build instead of writing to nothing.

**`sed -i '' 's/\b.../'` does not work on macOS** — BSD sed has no `\b`. Use perl.

**A jest mock factory can only reach variables named `mock*`.** Renaming them
with a blanket regex also renames the factory's keys, so the module exports
the wrong names and every call becomes "is not a function". Rename the
variables, not the keys.

**The Expo dev-menu button sits over the top-right of the screen** in the
simulator and will eat taps meant for a Cancel control. It is not in the app.

## What step 6 left, and where it landed

**The timing rules are live.** They were dormant because nothing recorded a
training session; `training_sessions` now does, as an app-tier table, and both
fire. One thing to put to Sofia: the refuel rule fires on any day a session was
recorded, including one marked Rest, because the rule is about having trained
rather than about the Day Type column. That reading is mine and she may want it
otherwise.

**The week strip still shows one lit day against the real database, and six in
the fixture.** A day lights because a `daily_logs` row exists for it, and
`daily_logs` is a research table the CSV export reads. Seeding six dated rows
nobody filled would be fabricating collected data, not demo content, so the
seed was left alone and the extra days live only in
`mobile/src/lib/__fixtures__/today.ts` behind `EXPO_PUBLIC_DEMO_DATA=1`. The
honest fix is Theo actually logging through November, which the programme runs
anyway. If the strip has to look full on stage against live data, that is a
decision to take deliberately and not a seed to slip in.

## What step 7 left

**The photo is built, and one privacy call in it is mine.** A coach can read
the completion row, because a tick on a log is what the coach dashboard is
for. A coach **cannot** read the image. Nobody asked for that, the dashboard
is specified as roster, compliance and flags with no photos in it, and a
photo of a minor cannot be un-shared once it has been. Granting it later is
one policy; four tests assert the current state, including that the bucket is
private and that no policy mentions a coach. Worth putting to Sofia and Theo
rather than leaving as my decision by default.

**The upload itself is unverified against the server.** The picker,
downscale, preview, replace and remove were all exercised on the simulator,
but that runs on `EXPO_PUBLIC_DEMO_DATA` with a local preview, because
anonymous sign-ins are still off and storage needs a session. What *was*
checked against the live project: the bucket is private with a 5 MB limit and
image-only MIME types, and all four policies are deployed, scoped to the
athlete's own folder and granted to `authenticated` only — `storage.objects`
has no other policy, so anon has no access at all. The first real upload
should still be watched.

**The deck's game-day band is now on screen.** Week 1 prints 6–8 g/kg for a
game day and the Learn page shows it, because the page is their material.
The app still has no game day type: `day_type` holds Training and Rest, and
`targets.ts` computes no game band. A test asserts both at once, so showing
the deck cannot quietly turn into adding a value to their schema.

**The fixture carries a second copy of the week 1 text**, in
`mobile/src/lib/__fixtures__/today.ts`, because the Learn screen cannot be
looked at on a device while anonymous sign-ins are off. A test asserts the
card kinds and their order match the seed file, so the copy cannot drift
unnoticed — but if you edit the deck's wording, edit both.

## What's next

8. Team and leaderboard
9. Coach dashboard (web, after the demo)

## Still waiting on Theo

The four logo lockups as files — the brand board came through as an image, so
`design-system/brand/` holds the spec and the README but no artwork. The app
icon is still Expo's placeholder. See `design-system/brand/README.md`.

The 15 recall-days' meal text, so they can be re-run through the food database.
The roster seed has everything else the tracker holds.

## Still waiting on Sofia

The DQ Score /12 formula · **the eight urine swatch colours** (the check-in
ships numbers and the workbook's own wording for levels 3-6; no swatch is
drawn, because an approximated colour makes a reading wrong rather than vague)
· serving and fluid targets · the anchor text for the five 1-10 scales (they
ship with no adjectives) · weeks 2-4 themes and challenges · whether `game`
becomes a third day type · whether sleep hours and supplements belong on the
daily log or stay on the recall.

## How I work

- **Commit as me, with no Claude attribution or co-author trailers.**
- Tests properly done. Run them, and actually run the app to look at it — don't
  just assume it works.
- Tell me plainly when something's wrong or you got it wrong. Don't pad.
- Flag the nutrition-side calls rather than making them quietly. The last
  session left sleep/supplements off the check-in and shipped the hydration
  scale without swatches; both were the right call and both needed saying.
