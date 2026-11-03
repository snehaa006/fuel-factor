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
| **Web / coach dashboard** | `main`, the real app |
| **Supabase** `nprvrlpkdrgckzceyryc` | 18 migrations; weeks 1–2, badges, the food database; one team, Team Jakarta buddies |

Supabase, the repository and both phone channels were brought into line on
3 November 2026.

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

Both use the live database. Watch for a `Bundled` line in **your own**
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

## Testing a month in one sitting: the time machine

**Development only.** It is on in every dev server (`__DEV__`) and in no
published update or build. Real athletes use the shared link, and a date
someone can change would put their meals on the wrong day of a research table.

A pill at the bottom of every screen sets the date the app treats as today:
‹ and › step one day, tapping the date opens a month calendar with *Back to the
real today*. It turns orange-red while a date is simulated and is remembered
across reloads. Logging, Today, the streak, the programme gate, the
challenges, the leaderboard, the recall rounds and the Week 0 / Week 4
assessments all follow it; the time of day stays real.

**It writes real rows.** A simulated day is a real `daily_logs` row in the live
database. Test with a test athlete on a test team, never with a real one.

## Identity, once and never again

`android.package` and `ios.bundleIdentifier` are both
`dev.snehaa006.fuelfactor`. Android installs and updates against that string,
so changing it later makes a different app rather than an update.
