# Running Fuel Factor

**There is one app, and it is the real one.** Every build, every published
update and every dev server talks to the live Supabase project and opens on
the sign-in. There is no demo mode: it was removed on 3 November 2026, and no
flag, profile or script can produce a build that draws from sample data.

## What is live right now

| Surface | Serves |
|---|---|
| **Expo Go link**, `preview` channel | `main`, the real app |
| **Android APK**, `share` channel | `main`, the real app (installs update on next launch) |
| **Web / coach dashboard** | `main`, the real app (run it locally, see below — it is not hosted) |
| **Confirmation page**, Vercel `fuel-factor` | Where the sign-up email lands. Static, one file |
| **Supabase** `nprvrlpkdrgckzceyryc` | 18 migrations; weeks 1–2, badges, the food database; one team, Team Jakarta buddies |

Supabase, the repository and both phone channels were brought into line on
11 November 2026. The `preview` and `share` channels both carry commit
`06f07f9`: the confirmation-email fix, the calendars, and the gap analysis.

**Pushing to GitHub does not change the phones.** A bundle moves only when
somebody runs `eas update` (below). The two are separate systems.

## 1. On an Android phone, with nothing installed

This is the one to hand people. EAS builds an **APK** that installs directly —
no Play Store, no account, no cable, no Expo Go.

```bash
cd mobile && npx eas build --platform android --profile share
```

It builds on Expo's servers and ends with a URL and a QR code. Open that link
on the phone, download, install. Android asks once to allow installing from
that browser; that is normal for an app outside the Play Store.

`share` and `live` are now the same app (`live` is kept for its own update
channel). Both talk to Supabase.

Builds for this project live at
<https://expo.dev/accounts/snehaa006/projects/fuel-factor/builds>.

### The APK already handed out

<https://expo.dev/artifacts/eas/m9WbHnG3XIIkiklCHKe6FK0yG51ogzg6l56Z2em6N7g.apk>

It was built on channel `share` and **does not need rebuilding**: the `share`
branch carries the real app, so every install picks it up on its next launch
(sometimes the one after). A rebuild is only needed when native code changes.

### It is 106 MB, and it does not have to be

That is a **universal** APK: it carries `arm64-v8a`, `armeabi-v7a`, `x86` and
`x86_64`. Every modern phone uses `arm64-v8a`; `x86` and `x86_64` are emulators
only and `armeabi-v7a` is for devices from roughly before 2015. Cutting it to
the architectures that are actually phones roughly halves it — add this to the
`share` profile in `eas.json` and rebuild:

```json
"android": { "buildType": "apk", "ndk": { "abiFilters": ["arm64-v8a", "armeabi-v7a"] } }
```

## 2. On an iPhone

**Apple does not allow an app to be installed from a link.** There is no iOS
equivalent of the APK above, and no free way to make one.

### Expo Go, free

1. Install **Expo Go** from the App Store.
2. Open this on the phone:

```
exp://u.expo.dev/32b11a9f-9dfa-4ca6-9bae-2950fae749bd?channel-name=preview&runtime-version=exposdk:58.0.0
```

Send it by message and tap it, or point the **Camera** app at a QR of it. The
same link works on Android in Expo Go. Expo Go shows its own icon, name and
splash, never Fuel Factor's; that is what the APK is for.

### TestFlight, $99 a year, a real app

A paid Apple Developer account, and then:

```bash
cd mobile && npx eas build --platform ios --profile production
npx eas submit --platform ios
```

## Publishing a change to the phones

After merging to `main`, publish to **both** channels so the Expo Go link and
the APK stay the same app:

```bash
cd mobile && npx eas-cli@latest update --branch preview --environment preview --platform all --message "what changed"
```

```bash
cd mobile && npx eas-cli@latest update --branch share --environment preview --platform all --message "what changed"
```

This needs an Expo access token with publish rights, set as `EXPO_TOKEN` in
the environment — never pasted into a chat. The Supabase URL and publishable
key ride in every bundle from `mobile/src/lib/supabase-config.ts`, so nothing
else has to be exported first.

`runtimeVersion` is on the `sdkVersion` policy, which is what makes an update
openable in Expo Go rather than only in a custom build. Changing that policy
breaks the Expo Go route.

To check what the link is actually serving, without a phone:

```bash
curl -s "https://u.expo.dev/32b11a9f-9dfa-4ca6-9bae-2950fae749bd" -H "expo-runtime-version: exposdk:58.0.0" -H "expo-channel-name: preview" -H "expo-platform: ios" -H "accept: multipart/mixed" | grep -oE '"createdAt":"[^"]*"'
```

## 3. On a machine, for development

```bash
cd mobile && npx expo start --ios
```

```bash
cd mobile && npm run web:live
```

Both use the live database, and carry the time machine like every build. Watch for a `Bundled` line in **your own**
terminal before believing what is on screen — a dev server left running by an
earlier session will serve the simulator and log nothing.

The tests do not touch the database: they run against
`mobile/src/lib/__fixtures__/today.ts`, which **nothing in the app imports**,
with stand-in names.

### The web build

```bash
cd mobile && npx expo export --platform web
```

That writes `dist/`. It uses absolute paths, so it has to be served from the
root of a host.

## The dev menu, and which builds have one

Shaking the phone opens React Native's dev menu. Where that happens is a
property of the **build**, not of this code:

| Surface | Dev menu on shake? |
|---|---|
| **APK**, `share` / `live` / `production` | **No.** These are release builds and the menu is not compiled in. `developmentClient: false` is now explicit in `eas.json` so a profile cannot drift into shipping one. |
| **Expo Go** | **Yes, and it cannot be turned off.** The menu belongs to Expo Go, not to Fuel Factor. No app-side setting reaches it. |
| `expo start` | Yes, by design. |

So: **demo from the APK, not from Expo Go**, and the shake gesture does
nothing. The Expo Go link stays the iPhone route, where the menu is Expo Go's
own and the only way round it is a TestFlight build.

## Testing a month in one sitting: the time machine

**In every build.** There is one app: the Expo Go link, the EAS link and the
APK all carry it, with nothing to switch on.

A pill at the bottom of every screen sets the date the app treats as today:
‹ and › step one day, tapping the date opens a month calendar with *Back to the
real today*. It turns orange-red while a date is simulated and is remembered
across reloads. Logging, Today, the streak, the programme gate, the
challenges, the leaderboard, the recall rounds and the Week 0 / Week 4
assessments all follow it; the time of day stays real.

**It writes real rows.** A simulated day is a real `daily_logs` row in the live
database. Test with a test athlete on a test team.

## The confirmation email, and the one setting that is not in this repository

The sign-up email's link used to land on `http://localhost:3000` — a page on
one laptop and on no phone — so an athlete who tapped **confirm** got a browser
error and an account that stayed unconfirmed.

The app now asks for a real page by name. `EMAIL_REDIRECT_URL` in
`mobile/src/lib/supabase-config.ts` is passed as `emailRedirectTo` on both
sign-ups (athlete and coach), and points at:

<https://fuel-factor-tamannas-projects-ab505aa3.vercel.app>

That page confirms the account and sends the athlete back to the app. It is
deliberately **not** the web build: somebody opening it on a phone wants one
sentence and a way back, not the whole app booted in a mobile browser.

### Supabase has to allow it, and nothing in this repository can do that

Supabase ignores an `emailRedirectTo` it has not been told to allow and falls
back to the project's **Site URL** — which is the `localhost:3000` default and
the whole bug. Two dashboard fields have to be set, once, by hand:

> Supabase → Authentication → **URL Configuration**
>
> | Field | Value |
> |---|---|
> | **Site URL** | `https://fuel-factor-tamannas-projects-ab505aa3.vercel.app` |
> | **Redirect URLs** | `https://fuel-factor-tamannas-projects-ab505aa3.vercel.app/**` |

Until both are set the link still goes to `localhost:3000`, however many times
the app is rebuilt. **Test it by signing up with a real address and opening the
email on a phone**, not by reading this file.

### Redeploying that page

It is a single static `index.html` in its own Vercel project (`fuel-factor`,
under `tamannas-projects-ab505aa3`). It carries no build step and nothing in
`mobile/` imports it.

## The two screens the pitch needs (12 December)

**Nutritional gap analysis — `/gaps`**, in the athlete's menu as *Fuel gaps*.
A fortnight of logged days as bar charts against the programme's own bands:
carbohydrate at 5–7 / 6–8 / 3–4 g/kg by day type (Week 1 deck) and protein at
1.6–2.2 g/kg (Week 2 deck). Each chart prints whose number the band is, and
days the band cannot be applied to are drawn hollow and explained rather than
dropped or counted as zero. No other nutrient is charted, because the
programme has set no other band — fluid has never been collected and energy is
computed with no stated target.

**A sample weekly module — `/learn/1` and `/learn/2`.** Already built and
already seeded: week 1 is 10 lesson cards, week 2 is 12, both rendered from
`lesson_cards` / `lesson_points` rows rather than written in the app. Weeks 3
and 4 are locked because nobody has written them, and the screen says so
instead of inventing a theme.

### Filling the gap charts before the pitch

They read real logs, so they draw whatever the database holds — which for a
fresh test athlete is nothing. There is no sample-data mode and there will not
be one. Use the **time machine** instead: sign in as a test athlete on a test
team, step back a fortnight, log a few days, step forward a day at a time. Ten
minutes gets a chart with a shape in it, and every bar on it is a real row.

## Identity, once and never again

`android.package` and `ios.bundleIdentifier` are both
`dev.snehaa006.fuelfactor`. Android installs and updates against that string,
so changing it later makes a different app rather than an update.
