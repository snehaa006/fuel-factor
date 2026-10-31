# Brand assets

The logo system is specified in `../tokens.json` under `brand`. This folder
holds the artwork it points at.

## Files this folder needs

| File | Lockup | Used for |
|---|---|---|
| `fuel-factor-primary.png` | Circular badge, wordmark inside the ring | Splash, Learn cover |
| `fuel-factor-secondary.png` | Horizontal, shuttle left | Headers, coach dashboard |
| `fuel-factor-stacked.png` | Shuttle above wordmark | Narrow columns, deck title |
| `fuel-factor-submark.png` | Roundel and shuttle, no wordmark | App icon, favicon, avatar |
| `fuel-factor-board.png` | The whole brand board | Reference |

**They are not here yet.** The board arrived as an image in conversation, not as
a file, so the artwork could not be written to the repository. Drop the four
lockups in here — ideally SVG, with PNG at 3x as a fallback — and they wire up
without any other change.

Until they land, the app ships Expo's placeholder icon and no screen draws a
logo. Nothing is broken by their absence; nothing uses them yet either.

## What is already locked without them

The board's five brand colours are the colour tokens, hex for hex:

| Board | Token |
|---|---|
| `#B8420D` | `cabai` |
| `#F8A720` | `pisang` |
| `#642714` | `kecap` |
| `#FDE2CF` | `santan` |
| `#89472E` | `gula` |

`mobile/src/theme/__tests__/tokens.test.ts` fails if any of them drifts.

The board's type pairing — PiePie for display and the wordmark, Josefin Sans for
supporting text — is what `tokens.json` already compiles into the app's
typography, and both faces load behind the splash.

## When the files arrive

1. Put them in this folder under the names above.
2. Point `mobile/app.json` at `fuel-factor-submark.png` for `icon` and for
   `android.adaptiveIcon.foregroundImage`, with `backgroundColor` set to the
   `kecap` hex, `#642714`.
3. The splash uses the primary lockup on `santan`, `#FDE2CF`.

The icon is the one that matters first: it is what sits on Theo's home screen in
the demo, and an Expo placeholder there undercuts the pitch more than anything
on the screens behind it.
