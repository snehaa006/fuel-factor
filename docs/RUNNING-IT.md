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

### The same build against the real database

```bash
cd mobile && npx eas build --platform android --profile live
```

No demo flags, so it talks to Supabase. **It cannot get past the consent gate
until anonymous sign-ins are switched on** (Supabase dashboard → Authentication
→ Sign In / Providers). The gate says exactly that on screen.

## 2. On an iPhone

Apple does not allow an app to be installed from a link. An iOS build needs a
paid Apple Developer account and goes out through TestFlight:

```bash
cd mobile && npx eas build --platform ios --profile share
```

Without that account, the iOS options are the simulator on a Mac (below) or
Expo Go.

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
