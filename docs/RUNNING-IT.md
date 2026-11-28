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
| **Web app**, <https://fuel-factor-expo-go.vercel.app> | `main`, the real app, opened in any phone's or laptop's browser. **The demo build**: a release build, no dev menu, nothing to install. Deployed by Vercel on every push to `main` |
| **Expo Go route**, same host | `main`, for Expo Go only (`exps://fuel-factor-expo-go.vercel.app`). A developer tool: shake opens Expo Go's menu |
| **Confirmation page**, Vercel `fuel-factor` | Where the sign-up email lands. Static, one file |
| **Supabase** `nprvrlpkdrgckzceyryc` | 21 migrations, every one in the repo (the last three, the Sunday check-in and the reflection, applied 28 November); all four weeks, badges, the food database; the pitch's demo squad, Jakarta Youth Football (see `supabase/README.md`) |

Both phone channels were last published on **28 November 2026 from `a49d31a`
on `main`**: everything up to 25 November plus the language and theme
switches, Learn week by week (one-card lessons, the fact of the day, this
week's advice first), the Sunday check-in (steps 23 to 25 in
`SESSION-HANDOFF.md`), and then **the end-of-programme reflection, the
coach's CSV export, and Bahasa for the advice cards and for every lesson,
theme and challenge**.
Checked: all four channel/platform pairs serve these update ids.

| Channel | Update group | Previous group, to roll back to |
|---|---|---|
| `preview` | `6b1a0572-dba6-4510-89b9-aedb17980b20` | `3ca35c7c-6294-4edb-9d19-28b365e67c77` (same code), then `2867c8a5-2cbc-47c0-91e8-af83865a6d5d` |
| `share` | `19b61df5-d534-413c-bdfa-372edd15ad48` | `59beb17e-ac9c-4a65-92cf-15d0d76ec6b3` (same code), then `ae2a0e26-03e1-4312-86ae-b167ea5e428d` |

The web app and the self-hosted Expo Go route follow `main` on Vercel, so
they carry the same code.

**The check-in's and the reflection's database changes are on the live
project** (28 November, through the Supabase connector): the three
migrations `20261127000001`-`0003` and seeds `0016` (the four week questions)
and `0017` (the demo squad's 12 weekly rows). `0018_advice_bahasa.sql` went
in on 27 November. Checked afterwards: the API serves all three tables with
every column the app and the export read, row level security is on for each
(7 policies), and Supabase's security advisor raises nothing about them.
So the Sunday check-in, the reflection on Today, and the weekly log and
reflections files in the coach's export all work now.

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

### The web app, free — use this one for demos

Open <https://fuel-factor-expo-go.vercel.app> in Safari. It is the real app,
on the live database, as a release build: no dev menu on shake. *Share → Add
to Home Screen* gives it an icon and a full screen.

### Expo Go, free (a developer tool)

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
the environment — never pasted into a chat. In a Claude Code cloud session on
the **`fuel-factor`** environment the token is saved as a network secret for
`api.expo.dev`: the proxy adds it to every request, so run the commands with
`EXPO_TOKEN=proxy-injected` (the CLI wants the variable set; the value is
replaced). That environment's network is limited to the hosts this project
uses, which does not include Expo's asset CDN, so a bundle cannot be
downloaded back from there to check it — compare its hash with the local
`dist/` export instead. The Supabase URL and publishable
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
root of a host. You do not need to do this by hand: Vercel builds and serves it
on every push to `main` (see *How the web app is served* below).

## The dev menu, and which builds have one

Shaking the phone opens a developer menu **only inside Expo Go** (and a dev
server). That menu belongs to Expo Go, not to Fuel Factor, and nothing in this
app's code can switch it off — which is why "hide it in the demo build" is
answered by *not demoing from Expo Go*, rather than by a setting.

| Surface | Dev menu on shake? |
|---|---|
| **Web app**, <https://fuel-factor-expo-go.vercel.app> | **No.** A production web build in the phone's browser. Works on iPhone and Android with nothing installed. |
| **APK**, `share` / `live` / `production` | **No.** Release builds; the menu is not compiled in. `developmentClient: false` is explicit in `eas.json` and `expo-dev-client` is not a dependency, so a profile cannot drift into shipping one. |
| **Expo Go** (either link) | **Yes, and the app cannot turn it off.** It is Expo Go's own menu. |
| `expo start` | Yes, by design. |

**Demo from the web app link** — on an iPhone it is the only release build
there is without a $99 Apple account, and on Android it saves an install. Open
it in Safari or Chrome and, for a full-screen icon, *Share → Add to Home
Screen*. The APK is the other release build, for Android.

### How the web app is served

Same Vercel project and host as the Expo Go route (`fuel-factor-expo-go`,
Git-connected, root `mobile/`). `vercel.json` builds both and
`scripts/build-web.mjs` lays the web build beside the Expo Go update:

- A request for `/` **with** an `expo-platform` header (Expo Go) is rewritten
  to `ios.json` / `android.json`, exactly as before.
- Any other path that is not a file is rewritten to `app.html`, the web app.

The web build's `index.html` is deliberately renamed `app.html`: Vercel serves
a real file before it applies a rewrite, so an `index.html` would answer
Expo Go's `/` with HTML and break the Expo Go route. The script refuses to
overwrite any file of the Expo Go update. Check both audiences after a deploy:

```bash
curl -s https://fuel-factor-expo-go.vercel.app/ -H "expo-platform: ios" | head -c 120
```

```bash
curl -s https://fuel-factor-expo-go.vercel.app/join/ABC234 | grep -o "<title>[^<]*</title>"
```

The first must print JSON starting `{"id":`; the second `<title>Fuel Factor</title>`.

### The invite link is the web app

A coach's invite is `https://fuel-factor-expo-go.vercel.app/join/<CODE>`, an
ordinary link WhatsApp makes tappable. It opens the join flow in the browser
with the code already filled in. (It used to be `fuelfactor://join/<CODE>`,
which WhatsApp does not linkify and which opens nothing on a phone without
the APK.) The message still carries the code in words for anyone in the app.

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

## The project pauses itself, and that takes the whole app down

**It happened once already.** Supabase pauses a free project after about a week
with no traffic. Between 11 and 18 November 2026 nobody opened the app, so it
paused — and a paused project's hostname stops resolving altogether:

```
$ nslookup nprvrlpkdrgckzceyryc.supabase.co
** server can't find nprvrlpkdrgckzceyryc.supabase.co: NXDOMAIN
```

Every build points at that host, so the APK, the Expo Go link and the web
build all failed at sign-in for days. Nothing was wrong with any bundle, and
republishing would have fixed nothing.

Restoring it from the dashboard brought back **everything** — all 18
migrations, the 1,369 foods, the 22 lesson cards, the badges and advice rules,
and the teams and logs people had entered. No data was lost. The publishable
key survived unchanged, so no rebuild and no `eas update` was needed either:
the app started working again the moment the project came back.

**Before the 12 December pitch, open the app once every few days**, or the
project will pause again and the demo will fail on the day with a dead host
and nothing in the repository to blame. Checking takes one command:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://nprvrlpkdrgckzceyryc.supabase.co/rest/v1/ -H "apikey: sb_publishable_jNqeT7TTB3-V1SGCM4UKeQ_eNUcbW7t"
```

`401` is healthy — it means the host answered and wanted a session. `000`
means it is paused again.

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
the app is rebuilt.

**Both were set on 18 November 2026, and the redirect works.** It is checkable
without signing anybody up — ask the verify endpoint for our page with a junk
token and see where it sends you:

```bash
curl -s -o /dev/null -D - "https://nprvrlpkdrgckzceyryc.supabase.co/auth/v1/verify?token=junk&type=signup&redirect_to=https://fuel-factor-tamannas-projects-ab505aa3.vercel.app" | grep -i ^location:
```

The `location:` header now names the Vercel page, for `signup`, `recovery`,
`magiclink` and `invite` alike, and with no `redirect_to` at all — so the Site
URL fallback is right too. If it ever says `localhost:3000` again, the fields
have been cleared and **no athlete can confirm an account** until they are set
back.

Both fields belong to the project rather than to any bundle, so they survive a
rebuild and an `eas update` — but they would not survive the project being
recreated from scratch under a new ref.

### Redeploying that page

It is a single static `index.html` in its own Vercel project (`fuel-factor`,
under `tamannas-projects-ab505aa3`). It carries no build step and nothing in
`mobile/` imports it.

## The two screens the pitch needs (12 December)

**Nutritional gap analysis — two views of the same charts.**

- **Athlete: `/gaps`**, in the athlete's menu as *Fuel gaps*.
- **Coach: `/coach/athlete/<id>`**, from **See fuel gaps** on each athlete's
  card on the coach dashboard. Added 24 November: the consent screen tells
  athletes the app "shows you and your coach where your fuel gaps are", and
  until then only the athlete could see the charts.

Both draw a fortnight of logged days as bar charts against the programme's
own bands: carbohydrate at 5–7 / 6–8 / 3–4 g/kg by day type (Week 1 deck) and
protein at 1.6–2.2 g/kg (Week 2 deck). They are one component
(`components/gap-report.tsx`), so the coach and the athlete can never see the
same fortnight differently. Each chart prints whose number the band is; days
the band cannot be applied to are drawn hollow and explained rather than
dropped or counted as zero. No other nutrient is charted, because the
programme has set no other band.

**A sample weekly module — `/learn/1` to `/learn/4`.** All four weeks are
seeded (10, 12, 12 and 11 cards) and rendered from `lesson_cards` /
`lesson_points` rows. **Learn follows the athlete's programme week** (since
27 November): the current week leads, earlier weeks stay open, later weeks
are locked until their day. For the demo squad, set the time machine to the
week you want to show -- on 24 November, the last day, all four are open, and
any day after the programme ends opens all four too. A coach sees every
written week. Each lesson is shown one card at a time; Today carries a folded
*Did you know?* fact from the week's deck, and offers the **Sunday check-in**
(the WEEKLY LOG's five questions) from each week's sixth day until it is in.
Once `0017` is loaded, the demo athletes' four weeks show as checked in.

### Showing them on the day

The charts read real logs, and the pitch shows the demo squad,
**Jakarta Youth Football** (day one 28 October 2026): one coach and three
athletes, **Theo**, **Jeongho** and **Jacob**, all accounts the developer
holds. Their logins and the squad's codes are not written here, because this
repository is public; the codes are on the coach's *Team and codes* screen.
What in the squad is the tracker's and what is constructed is in
`supabase/README.md`.

**Set the time machine to 24 November first.** The squad's logs end on
24 November 2026, the last day of the programme, on purpose: nothing exists
for a day that has not happened. The charts read the 14 days up to *today*,
so on 12 December they would be empty. Tap the date on the pill at the
bottom of the screen and pick 24 November; the pill turns orange-red, every
screen follows, and the date survives a reload.

1. **Athlete view:** open the web app, sign in as Theo, Jeongho or Jacob,
   set the pill to 24 November, open *Fuel gaps* from the menu.
2. **Coach view:** sign in as the coach, set the pill to 24 November, then
   **See fuel gaps** on any athlete's card on the dashboard.

Theo's is the chart with the story: his carbohydrate climbs every week and
reaches his band on rest days, but stays below it on training days, so the
coach sees the under-fuelling flag. Jeongho and Jacob reach their band by
week 4.

Rehearse this once before 12 December. **Log nothing while the pill is
set**: a simulated day writes a real row into the squad's logs. Afterwards,
*Back to the real today* in the calendar puts it back.

Fresh athletes have nothing to chart. There is no sample-data mode; to fill
a test athlete's charts, use the time machine: step back a fortnight, log a
few days, step forward a day at a time. Every bar is a real row, so do it on
a test team.

## Identity, once and never again

`android.package` and `ios.bundleIdentifier` are both
`dev.snehaa006.fuelfactor`. Android installs and updates against that string,
so changing it later makes a different app rather than an update.
