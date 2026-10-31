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

**The Week 1 deck is not in this repository.** It lives at
`~/Downloads/Fuel Factor — Week 1_ Carbohydrates.pdf` — three pages, read it with
`pdftotext -layout`. It is the source for the food database, every advice rule
sentence, the carbohydrate bands and the whole Learn section. If you need a
nutrition fact, it comes from there or it does not go in.

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

Showing the programme's own page is not the same as adopting it into the app's
logic. The Learn screen prints the deck's game-day band of 6–8 g/kg because that
is their page; `day_type` still holds Training and Rest only, and `targets.ts`
computes no game band. A test asserts both at once.

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

Anything that will change later is **rows, not code**: the advice rules, the food
database, the lesson cards. Weeks 2–4 of the programme arrive as an INSERT.

**It's a native mobile app, not a website.** React Native via Expo, one codebase
for iOS and Android. Jakarta is Android-dominant.

## What's built

**Step 1** — Expo SDK 58, Expo Router, TypeScript. `design-system/tokens.json`
compiles to a typed theme via `mobile/scripts/generate-theme.mjs`, so a colour
change is `npm run theme`, never a hand edit. PiePie (local .ttf) and Josefin Sans
load behind a held splash. `PushButton` with its solid under-edge, 80ms drop,
spring release and haptics.

**Step 2** — Supabase project `fuel-factor` (`nprvrlpkdrgckzceyryc`),
`ap-southeast-1` Singapore. **16 tables, RLS on every one**, security advisors
clean apart from two deliberate RPCs (`claim_participant`, `team_roster`). 15
foods seeded from the deck: 7 with its carbohydrate figures, the rest null, zero
protein and fat anywhere because the deck gives neither.

**Step 3** — Today screen. Streak chip, Training/Rest switch, the fuel ring
drawn as a *band* (5–7 g/kg training, 3–4 g/kg rest, never a midpoint), the
six-slot meal timeline, advice cards and the DQ slot showing "Not scored yet".
Seeds 0003–0005 added the three footballers, their nine baseline urine readings,
two Cooper runs, the team, and a demo day for Theo.

**Step 3.5** — Auth and the consent gate. A device signs in anonymously, enters
a team code, and claims one athlete; `claim_participant` takes consent as an
argument and refuses without it, so the gate is enforced in the database and not
only in the UI. `consent_ack_at` is app tier — deliberately NOT
`participants.consent_signed`, which means the paper form.

**Step 4** — Food logger. Tap a meal slot (or Log a meal) → search the food
database in Indonesian or English → portion → how many → the carbohydrate for
that choice. Writing an item ticks the slot on `daily_logs`, because the CSV
export reads the tick; removing the last item unticks it. A food the deck gives
no figure for says so and is still logged.

**Step 5** — Evening check-in. Every DAILY LOG column the athlete fills: four
serving counters with no target beside them, fluid in mL, the 1–8 hydration
reading, the five 1–10 self-ratings, and notes. Blank stays null, never zero.
`dq_score` is never written.

**Step 6** — Streak and advice cards. A seven-day strip under the chip, so a gap
two days back is visible rather than hidden inside a count, plus "best so far"
when the best run beats the current one. Today is marked by a larger dot and a
darker initial, never an outline (see the gotchas). The hydration rule came off
the bench once step 5 started writing `urine_colour`, and Today carries up to two
cards, tinted by domain — categorical, never severity.

**Step 6b** — Training session time. `training_sessions` is a tier-2 table keyed
on the daily log, holding a start and an end as local wall clocks, with a
quarter-hour stepper on Today. With it `pre_training_meal` fires in the two hours
before the session and `refuel_window_open` thirty minutes after it ends.
**All five seeded advice rules now fire.** The windows are the deck's; the app
supplies only the clock.

**Step 7** — Learn. Four weeks, with week 1 built card for card from the deck:
intro, the four headline figures, myth vs fact, the five-step glycogen chain, the
depletion timeline with its citation, pre/during/post timing, the four target
bands, the Jakarta food table and the references. Weeks 2–4 are locked, and a
locked week shows its number and nothing else — no invented theme. Lessons are
rows in `lesson_cards` / `lesson_points`; locked is *derived* from a week having
no cards, so seeding week 2 unlocks it with no flag to remember. The food table
reads `food_items` rather than carrying a second copy of those figures.

**Step 7b** — The weekly challenge photo. `expo-image-picker` for camera or
library, `expo-image-manipulator` to cap the long edge at 1280 and re-encode
before upload, into a **private** `challenge-photos` bucket. The row stores a
path, never a URL; drawing the image asks for a signed URL that expires in five
minutes. Adding a photo marks the day done; removing it leaves the day done.

**Step 8** — Team and leaderboard. The squad ranked on days logged over the last
seven, the week's MVP, and a dot per athlete for whether they logged today, which
is the nudge-your-mate half of what Theo asked for. It is a `security definer`
RPC rather than a query, because RLS lets an athlete read their own `daily_logs`
and nobody else's — correct, and it makes a client-side board impossible. **The
function returns a code, a first name, a day count and two booleans and nothing
else**, so there is no column a body metric could travel in; six tests fail if
that list grows. Equal day counts share a position and a shared week names both.
The screen says out loud, at the bottom, that nobody is ranked on their weight
or their size.

**Step 8b** — Badges and player of the month, which step 8 should have carried
and did not. The badge ladder is seven rows in `badges`; awards are *derived on
read* like the streak, so there is no awards table to drift and no midnight job.
Every criterion is behavioural — days logged, best streak, challenges done — and
the enum is the whole list, because a badge for eating well would need a
definition of eating well. Player of the month is `team_leaderboard` over thirty
days: the window was already an argument.

**Step 9** — Progress. Baseline against now on hydration, fluid, breakfast and
morning energy, plus the Cooper run. Three of the four have **no baseline in this
database** — the three-day recall holds them as free text that has not been
exported, and fluid has never been collected at all — so the screen says which
and why. It passes no judgement: both figures and the signed arithmetic between
them, no colour, no arrow, no "improved", because nobody has said which direction
is better. The one piece of meaning on the screen is the tracker's own printed
wording for a urine level.

**Step 10** — Coach dashboard. Roster, who logged today, breakfast days, days
inside the deck's band, and the brief's two flags. It is a route in this same
codebase and runs on web with `npm run web`, which is where a coach opens it.
`teams.coach_code` is a **second** code: handing the squad their join code must
not hand them the team's logs. `claim_coach` refuses a device already holding an
athlete and never writes `participant_profiles`, so a coach has no
`current_participant_id()` — which is what keeps the leaderboard and badges silent
for them rather than wrong. Both flags quote the programme's own threshold.

**Step 11** — The palette, re-derived. Theo's call on 31 October: the app uses
the boards' colours and no others. Every token is now sampled from
`design-system/brand/brand-board.jpg` and `mascot-board.jpg`. Three findings came
out of it: **`langit` `#0a2639` did not exist** — the five-colour set had no name
for the navy the icon sits on, and it is now the dark theme's surface, so the
splash continues straight into the app instead of cutting from navy to brown.
**`daun` and `air` were invented** and are board colours now, from the mascot
sheet's nutrient planets. **`ink-muted` can no longer alias `gula`**: the board's
mid-brown reaches 3.8:1 on the board's cream, under the 4.5:1 the system
promises, so it stays a graphic colour. All thirteen contrast pairs pass in both
themes; the worst is 5.5:1.

**Step 12** — The mascot. Theo's astronaut, seven poses plus the balloon bunch,
cut from the mascot sheet and animated with Reanimated. Six motions:

| Motion | What it does | Where |
|---|---|---|
| `idle` | One slow bob, forever | A day part-logged, a ladder part-earned |
| `enter` | Drops in and lands, stretching | Learn, Welcome, Progress |
| `celebrate` | Crouch, launch, land, wiggle, burst, one haptic | A day fully logged, every badge earned |
| `nudge` | One hop every 4.2s | Nothing logged yet, no badges yet |
| `shake` | Wobble, four cycles | Something refused |
| `none` | Still | Reduced motion, and tests |

The movement is **squash and stretch**, not a sprite slid up the screen: the
character compresses before it leaves the ground and stretches on the way up,
which is what makes a jump read as weight. The frame scales from its bottom
edge, so the feet stay put while the body squashes.

`SparkleBurst` throws eight marks outward on a celebration — amber and orange
ticks, which is what the boards already draw around the astronaut, so the
flourish is the board's own punctuation rather than borrowed confetti. One
shared value drives all eight; a burst costs no render.

**Every motion has a still version** and the whole thing falls back to it under
reduced motion. The haptic deliberately still fires: reduced motion is about
what moves on screen, and somebody who turned it on still deserves to be told
they finished the day.

`cancelAnimation` runs on unmount. `idle` and `nudge` repeat forever, and
without it they keep ticking after the screen is gone — which showed up as a
jest worker that would not exit.

**The mascot never says anything about food.** Every line it can utter lives in
`mobile/src/lib/mascot-copy.ts` and is about logging, streaks, badges or
challenges. The programme's sentences stay in `NudgeCard`, which carries a rule
code and a source and can be reviewed. A cartoon astronaut is the most persuasive
voice on the screen and the least qualified one, and a test holds its whole
vocabulary to that. The balloons are labelled B, C, Mg and Ca; **the app tracks
none of those** and the Week 1 deck gives no micronutrient figures at all, so they
appear once, as brand art, with no number near them.

**Step 13** — Builds. The app is an EAS project under `snehaa006`, with
`android.package` and `ios.bundleIdentifier` both `dev.snehaa006.fuelfactor` —
Android installs and updates against that string, so it must not move.
`eas.json` has three profiles: `share` (an APK anybody can install, demo data,
anonymised names), `live` (the same APK against Supabase, blocked at the gate
until sign-ins are on) and `production`. **`docs/RUNNING-IT.md` is the page to
hand someone.**

**The demo's three athletes are real minors.** `EXPO_PUBLIC_ANON_DEMO=1` swaps
their names for stand-ins and changes nothing else; the `share` profile sets it.
The stand-ins sort the same way the real names do, because the coach's roster is
alphabetical and the fixture is written in that order — a test holds the two in
step, and the whole suite passes with the flag on and off.

The app also exports as a single-page web build (`web.output: "single"`), which
is what the coach dashboard is eventually for. It runs, and it is **not deployed
anywhere**.

**627 tests pass.** `cd mobile && npm run check` runs theme generation, typecheck,
lint and tests. Run it before saying anything is done.

To look at the app without a session:
`cd mobile && EXPO_PUBLIC_DEMO_DATA=1 npx expo start --ios`

### Where things are

| Path | What |
|---|---|
| `mobile/src/app/index.tsx` | Today |
| `mobile/src/app/welcome.tsx` | Consent gate, team code, claim an athlete |
| `mobile/src/app/log/[slot].tsx` | Food logger |
| `mobile/src/app/check-in.tsx` | Evening check-in |
| `mobile/src/app/team.tsx` | The leaderboard, the MVPs and the badges |
| `mobile/src/app/progress.tsx` | Baseline against now |
| `mobile/src/app/coach.tsx` | The coach dashboard. Web via `npm run web` |
| `mobile/src/app/learn/index.tsx` | The week list |
| `mobile/src/app/learn/[week].tsx` | One week's cards |
| `mobile/src/lib/targets.ts` | The carbohydrate bands. The deck's numbers, nothing else |
| `mobile/src/lib/today.ts` | Day summary, slot roll-up, day type |
| `mobile/src/lib/logger.ts` | Food search, portions, writes and slot ticks |
| `mobile/src/lib/check-in.ts` | The DAILY LOG fields, limits, urine wording |
| `mobile/src/lib/advice.ts` | Rule evaluation. Pure — `now` is passed in, never read |
| `mobile/src/lib/streak.ts` | Streak length, the seven-day strip, best run |
| `mobile/src/lib/session.ts` | Training session times, as minutes since midnight |
| `mobile/src/lib/team.ts` | Ranking, the MVP, the board query. Pure — `today` is passed in |
| `mobile/src/lib/badges.ts` | The ladder. Awards derived on read, never stored |
| `mobile/src/lib/progress.ts` | Baseline vs now. Verdict-free by design |
| `mobile/src/lib/coach.ts` | The squad roll-up and the two flags |
| `mobile/src/lib/learn.ts` | The four weeks, the cards, challenge completion |
| `mobile/src/lib/photos.ts` | Challenge photo paths, upload, signed URLs |
| `mobile/src/lib/auth.ts` | Anonymous sign-in, roster, claim |
| `mobile/src/lib/errors.ts` | `messageOf` / `asError` — read before touching error handling |
| `mobile/src/lib/__fixtures__/today.ts` | The demo day, demo foods and the week 1 cards |
| `mobile/src/components/mascot.tsx` | The astronaut. Poses, motions, reduced-motion fallback |
| `mobile/src/lib/mascot-copy.ts` | Every line the mascot can say. Read the note at the top |
| `mobile/src/components/` | `mascot-banner`, `lesson-card`, `challenge-photo`, `session-times`, `streak-strip`, `leaderboard-row`, `badge-grid`, `metric-compare`, `nudge-card`, `fuel-ring`, `meal-timeline` |

## Where the code is right now

Branch **`sneha`** = `origin/sneha`, everything pushed, nothing uncommitted.

**PR #1 is merged**, so `main` carries everything through step 7. Local `main`
has been fast-forwarded and sits level with `origin/main`.

**Step 7b (the challenge photo) and this handoff are on `sneha` only**, two
commits ahead of `main`. They want a second PR when you are ready; nothing has
been merged locally.

## The one thing blocking live data

**Anonymous sign-ins are disabled on the project.** Turn them on in the Supabase
dashboard under Authentication → Sign In / Providers. Only the project owner can,
and nothing else is needed — the claim flow is built and the gate says so on
screen until then.

This is also why the things below are unverified rather than wrong: without a
session there is no authenticated client, so nothing that needs RLS or storage
can be exercised on a device. `EXPO_PUBLIC_DEMO_DATA=1` draws Today and Learn
from a fixture meanwhile.

## Decisions I made that are really Sofia's or Theo's

Each of these was the honest call with what we have. None should stay mine.

**Sleep hours and supplements are not on the check-in.** They are RECALL columns,
not DAILY LOG ones, and recalls are filled by the research team. Putting them on
the daily log means adding columns to a research table. Ask Sofia where they belong.

**The hydration scale has numbers, not swatches.** The eight chart colours are not
in this repository, and an approximated swatch does not make a reading vaguer — it
makes it wrong. This is the measurement Theo's three days at 6 rest on. The athlete
matches the workbook's printed chart and taps the number; the tracker's own wording
shows for levels 3–6 and the rest show none.

**The Progress screen passes no judgement on a change.** It shows the baseline,
the current figure and the arithmetic between them, with no colour, no arrow and
no word like "improved". Which direction is better is a nutrition call, and the
programme has given a direction for none of these four measures. Ask Sofia
whether the app may say that a urine reading moving from 6 to 3 is an
improvement — it plainly is, and it is still not mine to assert.

**The coach's two flags fire on the programme's thresholds**, not on mine:
three recorded days below the deck's own band, and a urine reading of 5 or worse,
which is what the seeded `urine_five_or_worse` rule already uses. What *is* mine
is counting consecutive days in **recorded** days rather than calendar days — a
day with nothing logged is evidence of not logging, not of under-fuelling, and
conflating them would put a clinical-sounding flag on a child who went on
holiday.

**A day holding a food with no carbohydrate figure is left unjudged.** Seven of
the fifteen seeded foods have no number, and treating unknown as zero would
manufacture an under-fuelling flag out of a gap in the food database.

**The leaderboard ranks on logging consistency alone.** The brief allows two axes
— logging consistency *and* diet quality — and only one of them exists. `dq_score`
has no formula, so the second axis would have to be invented, and inventing a
nutrition scale to sort 14-year-olds against each other is the worst place to do
it. The board ranks on days logged and says so on screen. When Sofia supplies the
DQ formula, ask her whether it should become a second sort key or stay off the
board entirely.

**Ties share a position and a shared MVP names everyone on the top count.** The
alternative is a tiebreak, and the only figures available to break a tie with are
the body metrics the whole feature exists to keep out of a ranking.

**The refuel rule fires on any day a session was recorded, including a Rest day**,
because the rule is about having trained rather than about the Day Type column.
That reading is mine.

**A coach can read a challenge completion but not the photo.** A tick on a log is
what the coach dashboard is for; a photo of a 14-year-old is not, nobody asked for
it, and it cannot be un-shared afterwards. Granting it later is one policy. Four
tests assert the current state, including that the bucket is private and that no
storage policy mentions a coach.

## What is built but not verified end to end

**The challenge photo upload.** Picker, downscale, preview, replace and remove were
all exercised on the simulator, but in demo mode with a local preview. What *was*
checked against the live project: the bucket is private, 5 MB, image MIME types
only, and all four policies are deployed, scoped to the athlete's own folder and
granted to `authenticated` only — `storage.objects` has no other policy, so anon
has no access at all. Watch the first real upload.

**Anything behind the consent gate on a real device**, for the same reason.

## Two places the fixture carries a second copy

Both exist only because the app cannot be looked at on a device without a session.

**The week strip's lit days.** A day lights because a `daily_logs` row exists, and
`daily_logs` is a research table the export reads — seeding six dated rows nobody
filled would be fabricating collected data. Against the real database the strip
shows one lit day. The honest fix is Theo logging through November.

**The leaderboard's day counts**, in `DEMO_LEADERBOARD`. Same reason as the strip:
a day counts because a `daily_logs` row exists, and seeding dated rows nobody
filled would be fabricating collected data. Theo's six is pinned to the strip's
own six by a test, so the two screens cannot contradict each other in the demo.
Against the real database the board shows the three athletes with the days they
have actually logged, which today is one between them.

**The week 1 lesson text**, in `mobile/src/lib/__fixtures__/today.ts`. A test
asserts the card kinds and their order match `supabase/seed/0006_week1_lessons.sql`,
so it cannot drift unnoticed — but if you edit the deck's wording, edit both.

## Things that will bite, and did

**supabase-js rejects with a plain object, not an Error.** `e instanceof Error` is
false for it and `String(e)` gives `[object Object]` — which is what reached the
screen before running the app caught it, because the tests had rejected with real
Errors and hidden it. Everything goes through `messageOf` / `asError`. If you write
a test that rejects, reject the way supabase-js actually does.

**A default parameter that calls an imported function is a runtime import, and it
crashed the app while every test passed.** `evaluate(summary, rules, now =
nowMinutes())` pulled a value out of `session.ts`, which imports `supabase.ts`;
under Metro it resolved to undefined and Today rendered blank with "Property
'nowMinutes' doesn't exist". 343 tests passed against a bundle that could not boot.
Keep the rule engine pure. **If a screen goes white, read the Metro log first.**

**A second Expo dev server from an older session will serve your app and you will
not notice.** Port 8081 had one running; every `expo start` took 8082 and logged no
bundle while 8081 served the simulator the whole time. Symptom: edits appear, but a
newly installed native module does not resolve. Check for an `iOS Bundled` line in
*your* log before believing what is on screen, and force-quit Expo Go from the app
switcher to make it reconnect. **Two such servers are running now and I could not
kill them — close those terminal windows.**

**Metro serves a stale bundle after a crash**, reporting an old source line from a
file that no longer contains it. Restart with `--clear`; don't doubt the edit.

**An async `onPress` swallows its own rejection.** The photo picker threw and the
button did nothing — no error, no log, no red box. Every async handler needs a
`.catch` that puts the message where the athlete can see it.

**Fast refresh does not re-run `useToday`.** Its effect keys on a reload nonce, so
editing a fixture changes nothing on screen. Relaunch the app or you will read a
stale render and believe it.

**Firing several events in one synchronous block breaks the *next* test.** It leaves
a state update in flight past the end of the test, and the next test renders an empty
tree with a baffling "Unable to find element". `await waitFor(...)` between them.
**`screen.unmount()` then a second `render` in one test does the same thing** — one
render per test; to compare two prop values, write two tests.

**Lint catches `setState` called synchronously in an effect**, and it is always
right. Three times now the fix was lazy initial state or derived state, which also
removed a render.

**A ring has to contrast with whatever is inside it, and the fill changes with the
theme.** The week strip first marked today with a `pisang-deep` outline: dark brown
on orange in light, a *light* orange on orange in dark, where it vanished. Caught by
looking at the simulator in dark mode, not by a test. Check both themes on anything
that draws a border.

**A jest mock factory can only reach variables named `mock*`.** Renaming them with a
blanket regex also renames the factory's keys, so the module exports the wrong names
and every call becomes "is not a function". Rename the variables, not the keys.

**`toHaveTextContent` matches exactly here**, not as a substring. Use a regex.

**RN 0.88 has no `StyleSheet.absoluteFillObject`.** Write the four offsets.

**A computed key in a Supabase `.update()` widens to a string index** and loses the
column types. `logger.ts` spells the six slot ticks out as a `Record` over the enum
so a seventh slot breaks the build instead of writing to nothing.

**`sed -i '' 's/\b.../'` does not work on macOS** — BSD sed has no `\b`. Use perl.

**The Expo dev-menu button sits over the top-right of the screen** in the simulator
and will eat taps meant for a Cancel control. It is not in the app.

## What's next

Every item in the brief's numbered v1 list (0 to 8) is built. **Two requirements
elsewhere in the brief are not**, and both are easy to miss for exactly that
reason — they are not in the numbered list. Sneha's call on 31 October: remember
them, build them later. Don't start either without asking.

**The CSV export does not exist.** Not a line of it. Seven comments in this
codebase and `supabase/README.md` justify the entire two-tier schema with "the
CSV export reads only these four research tables", and nothing writes a CSV.
The brief's research journey ends there: every log row out with columns matching
the ASSESSMENTS and COMPARISON tabs, for Sofia's analysis, and from there Theo's
deck. It is the step that turns the study into the pitch.

**Offline logging does not exist.** The stack table specifies `expo-sqlite` plus
background sync, with the reason attached: athletes log at the training ground on
patchy signal, and logging cannot require a connection. `expo-sqlite` is not a
dependency; every write needs a live connection or it errors.

Then, and none of it is code:

- Turn anonymous sign-ins on, then exercise the whole thing on a device.
- Replace the seeds as Sofia's and Theo's real content arrives.
- The app icon and the logo lockups.

## Still waiting on Theo

The four logo lockups **as their own files** — ideally SVG, PNG at 3x otherwise.
The board itself is now in the repository at `design-system/brand/brand-board.jpg`
and **the app icon, the Android adaptive icon, the splash and the favicon are all
cut from it**, so this is no longer blocking: what is missing is resolution. The
icon is a 335 px tile upscaled to 1024, which is fine at the 60 to 180 px an icon
is drawn at and soft in an App Store listing. `design-system/brand/README.md` has
the exact crop and the one-line command to recut it.

**The board's navy is not in the colour tokens.** The icon tile's sky is
`#132936`, a sixth colour beside the five the design system knows, and it is
written into `app.json` as a literal rather than a token. Ask Theo whether the
navy is part of the brand — in which case it belongs in `tokens.json` — or
whether the icon should be recoloured onto `kecap`. An earlier README assumed
`kecap`; the board says navy.

The app was also still called **"mobile"** — the Expo template's name, and what
would have sat under the icon on Theo's home screen. It is `Fuel Factor` now,
with the slug and scheme to match.

The 15 recall-days' meal text, so they can be re-run through the food database.
The roster seed has everything else the tracker holds.

## Still waiting on Sofia

The DQ Score /12 formula · **the eight urine swatch colours** · serving and fluid
targets · the anchor text for the five 1–10 scales (they ship with no adjectives) ·
weeks 2–4 themes, challenges and lesson content · whether `game` becomes a third
day type · whether sleep hours and supplements belong on the daily log · whether the
refuel rule should fire on a Rest day · whether a coach should see challenge photos ·
whether diet quality should become a second axis on the leaderboard once the DQ
formula exists.

## How I work

- **Commit as me, with no Claude attribution or co-author trailers.**
- Tests properly done. Run them, and actually run the app to look at it — don't just
  assume it works. Several of the worst bugs here passed every test.
- Tell me plainly when something's wrong or you got it wrong. Don't pad.
- Flag the nutrition-side calls rather than making them quietly. Every entry in
  "Decisions I made that are really Sofia's or Theo's" was the right call and
  every one of them needed saying.
