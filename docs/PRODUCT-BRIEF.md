# Fuel Factor — App Scope & Stack Brief

**As of 30 Oct 2026 · Sneha Gupta · Pre-build analysis, nothing built yet**

**Recommendation in one paragraph.** Build the athlete-facing daily logging app as the
bullpen demo, leave the Google Sheet as the research system of record, and build it as a
**native mobile app in React Native via Expo**, on a Supabase backend. Core build is 2–3 days
once the food database is seeded; demo-ready by 10–11 November as agreed on the call. The
highest-value thing the app can do before the bullpen is **re-run the existing 15 recall-days
through a real Indonesian food database**, so Theo pitches defensible carbohydrate grams
instead of hand-typed calorie guesses.

---

## 1. What is already locked

These came out of the call and should not be re-litigated — they are decisions, not options.

| # | Decision | Who set it | Consequence for the build |
|---|---|---|---|
| 1 | **Duolingo-style engagement** — streaks, daily habit, challenges | Theo | Streak + daily score is the home screen, not a settings-page afterthought |
| 2 | **Team-based, not solo** — MVP / player of the month, rewards | Theo | Needs a team entity, leaderboard, award mechanic from day one |
| 3 | **Advice is generic, never a prescription** — "the more you customize, the ethical value of dietetics is compromised" | Sofia | No gram-by-gram meal plans. A reviewed rule table, not a diet generator |
| 4 | **Free-text food in → nutrition estimate out → advice** | Sofia | Needs a food composition database. This is the core engine |
| 5 | **Jakarta / Indonesian food tables** are the differentiator vs MyFitnessPal | Sofia | Food DB seeded with nasi, pisang, ubi, mie, roti — not USDA |
| 6 | **Football only** (basketball's 40–45 min ≠ football's 90 min fuelling) | Bhavesh | One sport profile in v1. Kynan and Nathan drop out of the study arm |
| 7 | **B2B first** — sell to schools and clubs in Jakarta, coaches distribute | Bhavesh | A coach view is a revenue feature, not a nice-to-have |
| 8 | **Under-18 consent screen is mandatory** | Sofia | Consent gate before any data capture. Blocking requirement |
| 9 | **Halal / cultural constraint** — keep pork etc. out | Theo | App must never *suggest* pork. Logging stays non-judgemental |
| 10 | **Branding** — rocket made of nutrients, blasting up; yellow / green / red, vibrant | Theo | Logo + palette direction settled |
| 11 | **4-week program, one theme per week**, Week 1 = carbohydrates | Sofia + Theo | Learn section has a fixed 4-slot shape |
| 12 | **A circular gap metric** — "this is ideal, this is where you stand" | Sofia | The fuel ring is an explicitly requested UI element |

---

## 2. What we actually have to build on

I pulled the live tracker (it is publicly readable) rather than working from the screenshots.
Here is the honest state of it.

### Roster

| ID | Name | Sport | Height | Weight | Calf | In study arm? |
|---|---|---|---|---|---|---|
| J-01 | Jeongho | Football | 176 cm | 71 kg | 38 cm | Yes |
| T-01 | Theo | Football | 174 cm | 68 kg | 36 cm | Yes |
| JA-01 | Jacob | Football | 175 cm | 67 kg | 35 cm | Yes |
| K-01 | Kynan | Basketball | 172 cm | — | — | Out (football-only decision) |
| N-01 | Nathan | Racing | 174 cm | — | — | Out (Theo: different goals — cardio, keep weight down) |

**n = 3** for the pre/post study. ASSESSMENTS and COMPARISON only have Jeongho / Theo / Jacob
columns, which is consistent. Theo should be coached to say "preliminary, n=3" confidently
rather than be caught out on it.

### What the 3-day baseline actually shows

This is good pitch material and it is already in hand:

- **Breakfast skipping is real and specific.** Jeongho ate breakfast 1 day in 3, Theo 1 in 3.
  Jacob, Kynan and Nathan ate it 3 in 3. The Week 1 WhatsApp message ("a few of us are
  skipping it") maps to two named athletes.
- **Theo is dehydrated, consistently.** Urine colour 6 / 6 / 6 — the workbook's own scale reads
  6 as *"Dehydrated — drink immediately."* Jacob sits at 5 / 4 / 5 ("drink more today").
  Jeongho at 3 / 3 / 3 is fine. Three days at 6 is a finding, not noise.
- **The diets are meat-heavy and carb-light.** Jeongho: beef and rice, beef and rice. Theo day 2:
  Korean BBQ, wagyu, pork belly, one bowl of rice. This is exactly the 87–156 g/day carb figure
  the Week 1 deck cites against a 5–7 g/kg target.
- **Energy intake looks low against load.** Theo averages ~1,470 kcal across three days that
  include 2 hrs padel + 1 hr soccer, 1 hr gym, and a soccer match + 45 min S&C.

### The gaps that will bite

| Gap | Detail | Impact |
|---|---|---|
| **Fluid intake: zero data** | Not one mL recorded for any athlete, any day | Hydration is a stated pillar with no baseline |
| **Subjective: zero data** | Energy / Recovery blank for all 5. Mood, concentration, morning energy never collected | 5 of the COMPARISON rows cannot be filled |
| **No dates on any recall row** | Day 1/2/3 only | Weakens the research write-up; easy to fix now, impossible later |
| **Assessments ~85% empty** | No sprint, no vertical jump, no resting HR, no dietary averages | The before/after story has almost no "before" yet |
| **Cooper run: 2 of 3** | Theo 2,680 m, Jacob 2,800 m, Jeongho missing | — |
| **Height/weight disagree between tabs** | Jeongho 176 vs 175 cm; Jacob 175 vs 177 cm and 67 vs 66 kg | **Targets are g per kg body weight — this directly changes every number the app shows** |
| **Calories are hand-typed guesses** | "~1,400", "~2,800" with no macro split anywhere | The central claim of the pitch rests on estimates nobody can defend |

That last one is the opportunity. Sofia said it herself: *"This will be backend. This is not
manual calculation."* Build the food database and logger first, re-enter the 15 existing
recall-days through it, and the pitch gains real carb/protein/fat grams per athlete per day.

---

## 3. Scope: there are two products here, and only one is the demo

The call blurred them together. Separating them is the most important call to make now.

**Product A — the athlete app.** Duolingo-style daily habit, food logging, advice, streaks,
team leaderboard. This is what Theo pitches and what a school would buy.

**Product B — the research instrument.** 3-day recall, pre/post assessments, before/after
comparison. This is how Theo *gets the data* that makes the pitch credible. It currently exists
as a working spreadsheet.

**Recommendation: build A, keep B in the spreadsheet for this cycle.**

- B works today. Rebuilding assessment capture as app screens burns days and produces nothing
  the judges will see.
- A's daily log naturally *emits* the data B needs → one CSV export, columns matched to the
  ASSESSMENTS and COMPARISON tabs. That is the integration, and it is an afternoon's work.
- **Do not move the live study onto a half-built app mid-November.** The post-program data
  (recall 30 Nov – 2 Dec) is what makes the entire pitch work. If athletes have to learn a new
  tool while the intervention is running, and it has a bug, the post data is lost and there is
  no second chance before the bullpen. The app ships *seeded with their real baseline*, and the
  spreadsheet stays the system of record until after the competition.

---

## 4. v1 feature set — demo-ready 10–11 November

**The approach: seed data and seed logic.** The app is built complete and working from day one
— every screen, every calculation, every advice card functioning end to end on seeded content.
Nothing is stubbed out, nothing is a dead screen. When Sofia's real food data and real advice
logic arrive, we replace the seeds. The app does not change shape; the content underneath it does.

This is the plan as stated on the call: build what we can with what we have now, and slot the
rest in easily once it exists.

### Built now, on seed data and seed logic

**0. Consent & onboarding gate** *(blocking requirement)*
Splash → age confirmation → "I am under 18 and have parental consent" screen → profile
(name, team code, height, weight). Height and weight are not vanity fields; they
drive every g/kg target in the app.

**1. Home / Today — the Duolingo surface**
Streak counter · day-type switch (Training / Rest — their sheet's only two values; see §7) ·
**the fuel ring** (carbs eaten vs today's target — the circular metric Sofia asked for) ·
meal timeline with tick states across all six slots of the sheet (breakfast, pre-training,
lunch, post-training, dinner, **evening snack**) · today's DQ score out of 12 · one nudge card.

The DQ Score /12 already exists as a column in the DAILY LOG tab, which makes it a ready-made
daily score to hang streaks off.

**2. Log a meal**
Pick a meal slot → search the Indonesian food DB → portion presets ("1 bowl", "200 g",
"1 medium") → immediate macro feedback. Quick-add tiles for the foods these athletes actually
eat. Optional photo (the Week 1 challenge already asks for breakfast photos).

Seed the database from the Week 1 deck, which conveniently already contains a composition
table: nasi putih 200 g = 260 kcal / 57 g carbs · nasi merah 200 g = 220 / 46 · ubi jalar
200 g = 172 / 40 · pisang = 105 / 27 · oat 80 g = 300 / 54 · roti gandum 2 slices = 160 / 30 ·
singkong rebus 150 g = 165 / 40. Extend from TKPI (Tabel Komposisi Pangan Indonesia).

**3. Advice engine, running on seed rules.** The evaluator, the card UI and the `advice_rules`
table are built now and genuinely work — seeded with rules written from the Week 1 deck, which
is itself research-backed. The demo shows real advice firing against real logged food. Sofia's
reviewed rules replace the seed rows later. See §5.

**4. Evening check-in**
Sleep hours · four servings counters (fruit, veg, protein sources, carb portions) · fluid (mL) ·
urine colour 1–8 picker with the actual swatches · five 1–10 sliders (morning energy, training
energy, recovery, mood, concentration) with the workbook's anchor text · supplements · notes.

This is the DAILY LOG tab turned into a form, and it closes the two biggest data gaps in §2.
**It must carry every one of those fields** — they are columns of the research instrument. The
counters count and record; they do not grade, because the programme has set no serving targets.

**The DQ Score /12 stays empty until Sofia defines it.** The sheet names the column and states no
formula, and a diet quality score is nutrition, so the app does not invent one. The streak runs
off the check-in being submitted instead — behavioural, not nutritional — so the engagement loop
works regardless.

**5. Learn — the 4-week program**
Week 1 Carbohydrates as in-app cards built from the existing PDF (myth vs fact, the glycogen
depletion timeline, pre/during/post timing, the Jakarta food table, targets by day type).
Weeks 2–4 locked with teasers. Each week carries its **challenge** with a check-in and photo —
the same mechanic as the WhatsApp message, but tracked.

**6. Team, streaks and awards**
Team leaderboard · player of the week/month · badges.
**Design rule: rank on logging consistency and diet quality, never on body metrics.** These
are 14–16 year olds; a leaderboard sorted by weight or body composition is a safeguarding
failure and would sink the pitch with any school.

**7. Coach dashboard** *(the B2B hook — web, built after the app; see §7)*
Roster · who logged today · team average carb adherence vs target · breakfast frequency ·
flags (athlete under-fuelling three days running, athlete dehydrated). Even a thin version
changes the pitch from "an app for my friends" to "a product a club buys", which is the
business angle Bhavesh pushed for.

**8. Progress / before-after**
Baseline vs current on carbs, breakfast frequency, hydration, energy. Seeded with their real
spreadsheet data for the demo; genuinely populated once the December recall lands.

### Replaced later, when the real data lands

| Piece | Arrives | How it lands |
|---|---|---|
| Seed advice rules → Sofia's reviewed rules | Her review, ~20 Nov | Replace rows in `advice_rules`. No code change |
| Seed food DB (13 items from the deck) → full TKPI set | TKPI + Sofia | Insert rows into `food_items`. No code change |
| Post-program numbers | 30 Nov – 2 Dec recall | Rows. The before/after screen renders baseline-only until then |
| Confirmed heights/weights | Theo, 8 Nov | A field update. Targets recompute automatically |

### What makes the swap trivial

The seeds are only easy to replace if everything variable lives in **data**, not code:

- Targets are a pure function of `(body_weight, day_type)` — change the weight, every number
  in the app recomputes. Nothing hardcoded.
- Advice rules are rows (`condition`, `threshold`, `message_en`, `message_id`), evaluated by a
  generic engine. Sofia's sign-off becomes an INSERT, not a refactor.
- Food items are rows with per-portion macros. Extending the database is seeding, not coding.
- The before/after screen reads whatever assessment rows exist and renders the gaps as "not yet
  measured" rather than breaking.

Get this right in the first 2–3 days and replacing every seed in November and December is a
paste job, not a rebuild. That is the whole point of seeding rather than stubbing.

### Deliberately out of v1

Say this out loud to the team so expectations are set:

- Free-text NLP food parsing — phase 2, LLM-assisted with a confirm step. A picker satisfies
  Sofia's "calculated by the app, not manually" requirement without inventing a parser in a week.
- Barcode scanning · wearable / HealthKit sync for resting HR · push notifications (in-app
  reminders only for v1) · payments · full assessment capture (sprint, jump, Cooper) ·
  multi-sport logic · personalised gram-by-gram prescriptions (ethically ruled out, §1.3).

---

## 5. The advice engine

Sneha asked on the call: *"How do you want to build the diet plan in the app? The backend
logic of it?"* That was never answered. Here is the proposal.

**It is a rule table, not an AI, and not a meal planner.** Every rule is pre-written, reviewed
and signed off by Sofia before it ships. This is both the fastest build and the only version
that survives the ethics constraint she set.

Bands are computed, not prescribed — straight from the Week 1 deck, and shown as a range rather
than collapsed to a midpoint the programme never set:

| Day type | Carbohydrate band |
|---|---|
| Training | 5–7 g per kg body weight |
| Rest | 3–4 g per kg |

(The deck also gives 6–8 g/kg for game days, but their Day Type column only holds Training and
Rest, so that band waits for Sofia.)

Rules fire on events and produce at most 2–3 cards:

| Trigger (a plain event, never an invented percentage) | Card — a sentence from the Week 1 deck |
|---|---|
| A meal slot logged with no carbohydrate | "Nasi, ubi jalar or roti all count." |
| No breakfast logged on a training day | The Week 1 breakfast message |
| No post-training entry within the deck's own 30-minute window | Refuel within 30 minutes, 3:1 carbs to protein |
| Urine colour 5 or worse (their scale's own wording: "act now") | The 2% / 10% sprint-speed fact |

**Guardrails, which are product requirements and not polish:** no weight-loss framing anywhere ·
no calorie-deficit advice · no body-composition goals · no food labelled "bad" · every advice
string reviewed by Sofia · a visible disclaimer · the consent gate. These athletes are minors
and Sofia's professional standing is attached to whatever the app says.

---

## 6. Workflows

**Athlete, daily.** Open → fuel ring and streak → set day type → log meals across the day →
evening check-in (fluid, urine, five sliders) → day scores out of 12 → streak increments →
one advice card.

**Athlete, weekly.** Monday: new theme unlocks, lesson cards plus the week's challenge.
Sunday: weekly recap (average carb adherence, breakfast days, best day) and the team
leaderboard awards its MVP.

**Coach.** Open dashboard → today's compliance at a glance → flags → nudge an athlete or the
team.

**Research.** Every log row exports to CSV with columns matching the ASSESSMENTS and
COMPARISON tabs → Sofia's analysis → Theo's pitch deck.

---

## 7. Tech stack

**Decided (30 Oct):** native mobile app in React Native via Expo, on Supabase. Not a website.
That is the product Theo is pitching, and it is also the right technical call — reasoning below.

| Layer | Choice | Why |
|---|---|---|
| App | **React Native via Expo + TypeScript** | One codebase, real native app on iOS and Android |
| Navigation | **Expo Router** | File-based routing |
| Styling | **NativeWind** (Tailwind for React Native) | Fast to a polished look; the vibrant yellow/green/red palette drops into tokens |
| Backend | **Supabase (Postgres, Auth, RLS)** | Genuinely relational data; row-level security gives per-team isolation, which is the B2B story; SQL export for the research |
| Offline | **expo-sqlite + background sync** | Athletes log at the training ground on patchy signal. Logging cannot require a connection |
| Charts | **react-native-svg** (fuel ring hand-rolled), **victory-native** | Recharts is web-only and does not apply here |
| Notifications | **expo-notifications** | Streak reminders — this is the Duolingo mechanic, and the single strongest technical argument for native |
| Camera | **expo-image-picker / expo-camera** | The breakfast-photo challenge |
| Builds | **EAS Build + EAS Update** | Over-the-air updates push fixes without a store round-trip |
| Feedback distribution | **Expo Go / EAS internal distribution** | Sofia, Theo and his coach test by scanning a QR code — no store review involved |
| Language | **expo-localization + i18next**, EN + Bahasa Indonesia | Cheap now, expensive to retrofit, and a real differentiator for a Jakarta pitch |

### Why native is the right call, not just the preferred label

- **Push notifications are the Duolingo mechanic.** Streaks do not hold teenagers without
  reminders, and that was Theo's explicit hook. Web push is unreliable, especially on iOS.
- **Offline logging.** Athletes log meals at the training ground, not at a desk.
- **Home-screen presence.** The product only works if it is opened daily.
- **It demos as an app**, because it is one. At a pitch competition that framing matters.

Store review is not a constraint on this timeline: it only applies to a public launch, which
comes after the bullpen. The feedback rounds run on Expo Go and internal distribution.

### The one piece that stays on the web

The **coach dashboard** belongs on a laptop. Coaches and school buyers review a roster on a
desktop, not a phone. Build it later as a small Next.js page against the same Supabase project
— separate build, after the athlete app, and it does not change the stack above.

### What I am ruling out

- **PWA / web app.** My earlier recommendation, and wrong: it loses push reliability, offline
  logging, and the pitch framing.
- **Flutter.** A second language to carry, with no advantage over Expo here.
- **Bare React Native.** Losing EAS and Expo Go costs exactly the fast feedback loop the
  November schedule depends on.
- **Firebase.** The data is relational (teams → athletes → logs → food items; assessments
  pre/post). Postgres gives the research export for free and RLS gives team isolation cleanly.

### Supabase vs Cloudflare — settled

Supabase, decisively. Cloudflare (Workers + D1 + R2) has no managed auth, so auth and per-team
access control would be hand-built — which is most of the 2–3 day budget. Supabase gives auth
with an Expo SDK, RLS for team isolation (the B2B story), photo storage, and a table editor
Sofia can read without an admin panel. Cloudflare's edge advantage does not apply when every
user is in one city: put Supabase in Singapore (`ap-southeast-1`), ~30 ms from Jakarta. Revisit
Cloudflare only if cost at scale starts to matter, which is a post-bullpen problem.

> **Deployment risk:** Supabase free-tier projects **pause after 7 days of inactivity**. If the
> project sits quiet between the November program and the December pitch, it can be paused on
> the morning of the bullpen. Mitigation: Pro (\$25) for December, or confirm it is awake the
> day before. Do not leave this to chance on a one-shot pitch.

**If the timeline tightens:** ship Android first (Indonesia is overwhelmingly Android), seed
all data, and drop auth to a team code. A pitch demo does not need a real user base — it needs
to be fast and to never break on stage.

### The data model, in two tiers

The schema is split so that **nothing the app invents can ever reach the research export.**

**Tier 1 — research tables. Columns map 1:1 to the workbook.**

| Table | Mirrors |
|---|---|
| `participants` | PARTICIPANTS: id, name, sport, age, height, weight, waist, muac, calf, consent_signed, parent_contact, notes |
| `daily_logs` | DAILY LOG: date, participant, day_type, the six meal ticks, fruit, veg, protein, carbs, fluid_ml, urine, energy_am, energy_training, recovery, mood, concentration, dq_score, notes |
| `recalls` | RECALL: day, date, day_type, sleep_hrs, breakfast, lunch, dinner, activities, supplements, notes, fluid_ml, est_calories, energy, recovery, urine |
| `assessments` | ASSESSMENTS: domain, measure, unit, pre, post per participant |

The CSV export reads **only these four**. No column is added to them, ever. If the programme
wants a new field, it goes in their workbook first and here second.

**Tier 2 — app tables. Nothing here is exported.**

`teams` · `food_items` · `food_portions` · `log_items` (the per-slot food rows that *roll up*
into `daily_logs`) · `weekly_challenges` · `challenge_completions` · `photos` · `advice_rules`

None of these exist in the workbook. They carry the streak, the leaderboard, the challenge and
the food database — the things Theo asked for that the research simply does not record. Keeping
them in their own tier means they can be dropped whole without touching a research column.

### Columns I invented, and what happened to them

| Invented | Verdict |
|---|---|
| `teams` / team code | Kept, tier 2. Theo's leaderboard needs it; the workbook has no team column and now never sees one. |
| `weekly_challenges`, `challenge_completions`, `photos` | Kept, tier 2. The challenge is real (it is in the WhatsApp message) but has no column. |
| Streak | Kept, derived. Counted from `daily_logs`, stored nowhere. |
| Per-slot macro grams | Kept, tier 2 (`log_items`). Strictly finer than the sheet, which wants a tick per slot and one daily calorie figure — both roll up exactly, so nothing conflicts. |
| `position` on the athlete | **Dropped.** Not a PARTICIPANTS column, and nobody asked for it. |
| **"Game" as a third day type** | **Needs a decision.** Their Day Type only ever holds `Training` or `Rest` across all fifteen recall days. The Week 1 deck does give game-day carb targets (6–8 g/kg), so the concept is theirs — but the column is not. Adding it puts a value in their Day Type column that their sheet was not built for. Ask Sofia before shipping it; until then the app offers two values. |

---

## 8. Timeline to the bullpen

| Date | Milestone | Owner |
|---|---|---|
| 30 Oct – 7 Nov | Food DB seeded; core build (consent, home, logger, advice engine) | Sneha |
| 8 Nov | Theo fills the remaining baseline gaps in the tracker | Theo |
| 10–11 Nov | **Working prototype on a real device**, shared via Expo Go; sync call | All |
| 11–25 Nov | Feedback rounds. Coach dashboard, learn section, polish | Sneha |
| 26 Nov | Last Week 4 material goes out | Sofia |
| 30 Nov – 2 Dec | Post-program 3-day recall (one weekend + two weekdays) | Theo |
| ~3–5 Dec | Post data into the app; before/after screens go live with real numbers | Sneha + Sofia |
| Week 1–2 Dec | **Bullpen pitch** (date still unconfirmed) | Theo |

The risk on this line is that the bullpen date is not confirmed and could land *before* the
post data exists. Worth having Marilena pin the date down now, and worth building the
before/after screen so it degrades gracefully to baseline-only if the post data is not ready.

---

## 9. What I need from Theo and Sofia — and when it is actually needed

**Nothing here blocks the start.** Tier 1 begins immediately. Each row below has a fallback, so
a late answer costs nothing.

| What | Needed by | What it unblocks | If it is late |
|---|---|---|---|
| **Sofia signs off the advice rules** | ~20 Nov | Advice cards carry her reviewed wording | Demo runs on seed rules drawn from the Week 1 deck; swapping them is a table update |
| **Confirm Jeongho's and Jacob's height / weight** (the two tabs disagree) | Before the demo | Accurate per-kg targets for those two | Demo on Theo's 68 kg, which both tabs agree on |
| **Confirm the DQ Score /12 formula** (6 slots + 4 counters + fluid + urine — my inference) | ~10 Nov | The exact daily score | Ship on the inferred formula; it is a config change |
| **Pork in the food DB: log-only, or absent?** | Before food seeding | Food DB completeness | Default to log-only, never suggested. Reversible |
| **EN only, or EN + Bahasa Indonesia?** | ~15 Nov | Translation pass | Strings externalised from day one either way |
| **Athlete-first or coach-first demo?** | ~10 Nov | Demo script | Athlete-first — it demos better and the coach view is the later web build |
| **iOS or Android for the bullpen demo?** | ~25 Nov | Which device gets hammered in testing | Assume Android; Indonesia is Android-dominant |

The only genuinely time-sensitive item is Sofia's advice copy, because it needs her professional
review and that cannot be rushed at the end. Everything else has a working default.

## 10. Flags worth raising with the team

- **Fluid intake has never been collected**, yet hydration is one of the program's pillars and
  Theo's own urine readings sit at "drink immediately" for three straight days. This needs to
  start being recorded immediately, with or without the app.
- **No dates on any recall row.** Trivial to fix now, impossible to reconstruct later, and a
  reviewer will notice.
- **n = 3.** Fine for a preliminary study, but Theo should be ready for the question rather
  than surprised by it.
- **The calorie estimates cannot currently be defended.** Re-running the baseline through the
  food database fixes this and is the single strongest argument for building the logger first.
