# Running Fuel Factor

Three ways, in the order most people will want them.

## What is live right now

As of 1 Nov 2026, everything that can be deployed is. Three surfaces, and they
deliberately carry different bundles.

| Surface | Carries | Bundle |
|---|---|---|
| **Expo Go link**, `preview` channel | step 14 | demo data, anonymised names |
| **Android APK**, `share` channel | step 14 | demo data, anonymised names |
| **Web / coach dashboard**, <https://fuel-factor--step14.expo.app> | step 14 | **real database** |
| **Supabase** `nprvrlpkdrgckzceyryc` | 15 migrations | live |

Step 15's `20261102000001_programme_start_required.sql` and step 16's
`20261103000001_assessment_entry_and_match_day.sql` are **both applied** (17
migrations live). The second adds `match` to `day_type` and lets an athlete,
or their coach, write `assessments` rows -- the Week 0 / Week 4 form at
`/assessments` and `/coach/assessments`.

**Food database.** `20261103000002_food_database.sql` (applied) and seed
`supabase/seed/0009_tkpi_foods.sql` (loaded) put the programme's Indonesian
composition table in `food_items`: 1,346 foods, per-100 g calories, protein,
fat and carbohydrate, five gram portions each. The daily log searches it on the
server; the recall has a picker under each meal, and `compute_recall_nutrition`
now adds up what was picked (`recall_items`). The seed is keyed on `tkpi_id`
and can be re-run safely.

**Assessments testing mode.** `OPEN_BOTH_FOR_TESTING` in
`mobile/src/lib/assessments.ts` opens the Week 4 form from day one. Set it to
`false` before the real programme runs, and Week 4 opens on day 22.
`FOLLOW_UP_OPEN_FOR_TESTING` in `mobile/src/lib/recall-window.ts` does the same
for the four-weeks-on recall (days 4-6): on, it opens as soon as the baseline
is in, with no start date needed. Turn both off together.

**Assessments read the recall.** Calories, carbohydrate, protein, fat,
breakfast frequency, fluid, morning energy (the recall's Energy rating),
recovery and urine colour are filled from the recall's averages -- days 1-3 for
Week 0, days 4-6 for Week 4 -- wherever nobody has typed a value. Saving the
form writes them into `assessments`.

The split is on purpose. The two phone surfaces get passed around, so they show
the fixture under stand-in names and write nothing. The web build talks to the
real database, and both sign-ins work against it today -- an athlete can make
an account and claim their name, and a coach can sign up, create a team and
get a real invite code out of it.

**Both phone surfaces are a publish behind**, and the publish is what carries
the sign-in work and the configuration fix. Until they are republished they
still serve the step-14 bundle.

**The APK does not need rebuilding.** It was built on channel `share`, so
publishing to that branch updates every install on next launch. A rebuild is
only needed when native code changes, and step 14 added no native modules.

**The web deployment is a preview, not production.** `eas deploy --prod` would
claim the production alias; this session could not run it, so the alias above
is what exists. Promote it when you want the stable URL:

```bash
cd mobile && npx eas-cli@latest deploy --prod
```

**Anonymous sign-ins no longer matter.** They were the one blocker nobody but
the project owner could clear, and the athlete half now does not use them:
athletes sign in with an email and a password, the same provider the coach
side has always used and the one that is on by default. The team code kept
the job it was good at -- finding the squad and the right name on its roster
-- and the account underneath it is what survives a new phone. Republish the
phone bundles without the two demo flags and the whole thing works for real.

## 1. On an Android phone, with nothing installed

This is the one to hand people. EAS builds an **APK** that installs directly —
no Play Store, no account, no cable, no Expo Go.

```bash
cd mobile && npx eas build --platform android --profile share
```

It builds on Expo's servers and ends with a URL and a QR code. Open that link
on the phone, download, install. Android asks once to allow installing from
that browser; that is normal for an app outside the Play Store.

The `share` profile builds with `EXPO_PUBLIC_DEMO_DATA=1` and
`EXPO_PUBLIC_ANON_DEMO=1`, which matters for two reasons:

- **Demo data**, so a build that gets passed around draws every screen from
  the fixture and writes nothing to the study's database.
- **Anonymised names**, because the three athletes in the demo are real
  14 to 16 year olds and the figures beside them are from the programme's own
  tracker. A build passed around gets stand-ins. Every number stays.

Builds for this project live at
<https://expo.dev/accounts/snehaa006/projects/fuel-factor/builds>.

### The one to hand out

<https://expo.dev/artifacts/eas/m9WbHnG3XIIkiklCHKe6FK0yG51ogzg6l56Z2em6N7g.apk>

Verified by unpacking it: the bundle carries the Supabase configuration, the
stand-in names are in it and none of the real ones are.

**The earlier build, versionCode 1, is dead** — its bundle shipped with no
Supabase configuration and it crashes on launch. `eas.json` now carries the
configuration in every profile, so that cannot recur. If you handed that link
to anyone, send them this one.

### It is 106 MB, and it does not have to be

That is a **universal** APK: it carries `arm64-v8a`, `armeabi-v7a`, `x86` and
`x86_64`. Every modern phone uses `arm64-v8a`; `x86` and `x86_64` are emulators
only and `armeabi-v7a` is for devices from roughly before 2015.

A download that size over mobile data is a real obstacle for the people this is
meant for. Cutting it to the architectures that are actually phones roughly
halves it — add this to the `share` profile in `eas.json` and rebuild:

```json
"android": { "buildType": "apk", "ndk": { "abiFilters": ["arm64-v8a", "armeabi-v7a"] } }
```

Keep `armeabi-v7a` unless you know the squad's phones; dropping it saves a
little more and silently excludes older handsets.

### The same build against the real database

```bash
cd mobile && npx eas build --platform android --profile live
```

No demo flags, so it talks to Supabase. It opens on the sign-in: an athlete
makes an account or signs in, then enters the team code and picks their name
off the roster. A coach taps **I am a coach** and gets their own door.

## 2. On an iPhone

**Apple does not allow an app to be installed from a link.** There is no iOS
equivalent of the APK above, and no free way to make one. The two real options:

### Expo Go, free, nothing running on your machine

The bundle is published to Expo's servers, so it keeps working whether or not
anyone's laptop is on.

1. Install **Expo Go** from the App Store.
2. Open this on the phone:

```
exp://u.expo.dev/32b11a9f-9dfa-4ca6-9bae-2950fae749bd?channel-name=preview&runtime-version=exposdk:58.0.0
```

Send it by message and tap it, or point the **Camera** app at a QR of it. (The
Camera app, not Expo Go's scanner — that one is Android.) The same link works
on Android in Expo Go.

Published updates live at
<https://expo.dev/accounts/snehaa006/projects/fuel-factor/updates>.

**What this link currently serves.** Step 14 — coach accounts, the invite
flow, the questionnaire, the sidebar and the recall form — published 1 Nov
2026, update group `c544368d`. It is a **demo bundle**:
`EXPO_PUBLIC_DEMO_DATA=1` so every screen draws from the fixture and nothing
writes to the database, and `EXPO_PUBLIC_ANON_DEMO=1` so the three athletes
appear under their stand-in names. That second flag matters here and not only
in the APK: this link gets forwarded by message, and the athletes are real
minors. Verified in the uploaded bundle — the stand-ins are present and none
of the three real names is.

**Pushing to GitHub does not change this link.** The bundle moves only when
somebody runs `eas update`. The two are separate systems, and the link served
a day-old bundle for a while because of exactly that assumption:

```bash
cd mobile && EXPO_PUBLIC_DEMO_DATA=1 EXPO_PUBLIC_ANON_DEMO=1 \
  npx eas-cli@latest update --branch preview --environment preview \
  --platform all --message "what changed"
```

`--environment` is required in non-interactive mode on EAS CLI 27. Drop the two
flags to publish a bundle that talks to the real database instead; both halves
work against it today.

**The Supabase configuration no longer rides on that command.** It used to:
`eas.json` sets `EXPO_PUBLIC_SUPABASE_URL` for `eas build` and for nothing
else, `.env` is gitignored so it only exists on one laptop, and `eas update`
sees neither unless both are exported into the shell first. One publish
without them and the phone opened on *"Missing EXPO_PUBLIC_SUPABASE_URL ...
Copy .env.example to .env"* at the team-code gate, which is what the preview
channel served. `mobile/src/lib/supabase-config.ts` now holds both values as
committed defaults, so every bundle carries them by every route; the
environment still wins wherever it is set. Checkable the same way the APK
was:

```bash
cd mobile && EXPO_NO_DOTENV=1 npx expo export --platform ios --output-dir /tmp/check
strings /tmp/check/_expo/static/js/ios/*.hbc | grep -c nprvrlpkdrgckzceyryc
```

To check what the link is actually serving, without a phone:

```bash
curl -s "https://u.expo.dev/32b11a9f-9dfa-4ca6-9bae-2950fae749bd" \
  -H "expo-runtime-version: exposdk:58.0.0" \
  -H "expo-channel-name: preview" -H "expo-platform: ios" \
  -H "accept: multipart/mixed" | grep -oE '"createdAt":"[^"]*"'
```

Two things to expect, so they do not look like faults:

- **Expo Go shows its own icon, name and splash**, never Fuel Factor's. It is a
  container; it cannot show your icon. That is exactly what the Android APK is
  for.
- The first open takes a few seconds while it fetches the bundle.

Publishing a new one, after any change:

```bash
cd mobile && EXPO_PUBLIC_DEMO_DATA=1 EXPO_PUBLIC_ANON_DEMO=1 \
  npx eas update --branch preview --environment preview --message "what changed"
```

`runtimeVersion` is on the `sdkVersion` policy, which is what makes an update
openable in Expo Go rather than only in a custom build. Changing that policy
breaks this route.

### TestFlight, $99 a year, a real app

A paid Apple Developer account, and then:

```bash
cd mobile && npx eas build --platform ios --profile share
npx eas submit --platform ios
```

Testers install from TestFlight and get the real icon, the real name and the
real splash — the iOS equivalent of the APK. Up to 10,000 of them. This is the
only way an iPhone runs this as an actual app rather than inside Expo Go.

## 3. On a machine, for development

```bash
cd mobile && EXPO_PUBLIC_DEMO_DATA=1 npx expo start --ios
```

Watch for an `iOS Bundled` line in **your own** terminal before believing what
is on screen — a dev server left running by an earlier session will serve the
simulator and log nothing.

### In a browser

The app also exports as a single-page web build, which is what the coach
dashboard is eventually for:

```bash
cd mobile && EXPO_PUBLIC_DEMO_DATA=1 npx expo export --platform web
```

That writes `dist/` (57 files, about 4.7 MB). It uses absolute paths, so it
has to be served from the root of a host:

```bash
cd mobile/dist && python3 -m http.server 8099
```

It is not deployed anywhere yet.

## What the three flags do

| Flag | Effect |
|---|---|
| `EXPO_PUBLIC_DEMO_DATA=1` | Draws every screen from the fixture. No network, no gate. |
| `EXPO_PUBLIC_ANON_DEMO=1` | Swaps the three athletes' names for stand-ins. Figures unchanged. |
| neither | The real app against Supabase. Opens on the sign-in. |

## Identity, once and never again

`android.package` and `ios.bundleIdentifier` are both
`dev.snehaa006.fuelfactor`. Android installs and updates against that string,
so changing it later makes a different app rather than an update. It was set
when the first build was made and should not move.
