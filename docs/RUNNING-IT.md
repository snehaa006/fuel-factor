# Running Fuel Factor

Three ways, in the order most people will want them.

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

- **Demo data**, because anonymous sign-ins are still switched off on the
  Supabase project. Without it the app stops at the consent gate and says so.
- **Anonymised names**, because the three athletes in the demo are real
  14 to 16 year olds and the figures beside them are from the programme's own
  tracker. A build passed around gets stand-ins. Every number stays.

Builds for this project live at
<https://expo.dev/accounts/snehaa006/projects/fuel-factor/builds>.

### The first one

Built 31 October 2026, version 1.0.0, versionCode 1:

<https://expo.dev/artifacts/eas/xDixmLhIV8OSe5EwnW_OFtIKFwS6AHI9ugMhZNn6R6I.apk>

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

No demo flags, so it talks to Supabase. **It cannot get past the consent gate
until anonymous sign-ins are switched on** (Supabase dashboard → Authentication
→ Sign In / Providers). The gate says exactly that on screen.

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
| neither | The real app against Supabase, blocked at the gate until sign-ins are on. |

## Identity, once and never again

`android.package` and `ios.bundleIdentifier` are both
`dev.snehaa006.fuelfactor`. Android installs and updates against that string,
so changing it later makes a different app rather than an update. It was set
when the first build was made and should not move.
