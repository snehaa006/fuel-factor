# Brand assets

The logo system is specified in `../tokens.json` under `brand`. This folder
holds the artwork it points at.

## What is here

`brand-board.jpg` — the whole board, as Theo supplied it. It carries four
lockups: a circular badge with the wordmark inside the ring, a horizontal
lockup with the shuttle left, a stacked lockup, and an app-icon tile with no
wordmark.

**It is a flat raster, 1600 × 1466, and it is the only artwork that exists.**
Everything below is cut from it.

## What the app icon is cut from

The icon lockup sits at `+1207+1018` on the board, 335 × 358. It is a rounded
tile — nearly a circle at the corners — with the shuttle on a navy sky.

Three things were done to it, and each matters if it is ever recut:

1. **The cream around the tile was flood-filled with the sky navy**, inward
   from the four corners. iOS applies its own rounded mask, so shipping the
   pre-rounded tile would round it twice and leave cream wedges inside the
   mask. Flood fill was used rather than a colour replace because cream also
   appears *inside* the artwork — the shuttle body and the clouds — and those
   are not connected to the surround.
2. **It was padded to square with the same navy** and resized to 1024.
3. **Alpha is stripped** on the generated iOS icon. The App Store rejects an
   icon with an alpha channel; Expo does this during prebuild.

The Android adaptive foreground is the same artwork inset to 700 px on a
transparent 1024 canvas, because Android masks to a circle or squircle and
only the inner two thirds is guaranteed visible. `adaptiveIcon.backgroundColor`
is the same navy, so the inset square's edges never show.

The splash is the same artwork on the same navy, so launching continues
straight on from the icon on the home screen.

## The navy is not in the colour tokens

The icon tile's sky is **`#132936`**, and it is not one of the five brand
colours the design system knows about:

| Board | Token |
|---|---|
| `#B8420D` | `cabai` |
| `#F8A720` | `pisang` |
| `#642714` | `kecap` |
| `#FDE2CF` | `santan` |
| `#89472E` | `gula` |

`mobile/src/theme/__tests__/tokens.test.ts` fails if any of those five drifts.
The navy is a sixth colour, it appears nowhere in the app's own surfaces, and
it is currently written into `app.json` as a literal rather than a token.

**This is a question for Theo**, not something to resolve by adding a token:
either the navy is part of the brand and belongs in `tokens.json`, or the icon
should be recoloured onto `kecap`. An earlier version of this file assumed the
latter. The board says otherwise, so the board won.

## Still wanted from Theo

The four lockups as their own files, ideally SVG with PNG at 3x as a fallback:

| File | Lockup | Used for |
|---|---|---|
| `fuel-factor-primary.png` | Circular badge, wordmark inside the ring | Splash, Learn cover |
| `fuel-factor-secondary.png` | Horizontal, shuttle left | Headers, coach dashboard |
| `fuel-factor-stacked.png` | Shuttle above wordmark | Narrow columns, deck title |
| `fuel-factor-submark.png` | Roundel and shuttle, no wordmark | App icon, favicon, avatar |

The icon works without them. What it does not have is resolution: it is a
335 px tile upscaled to 1024, which is fine at the 60–180 px an icon is
actually drawn at and soft if anyone looks at it in the App Store listing. A
vector or a native 1024 export of that one tile replaces it with no other
change.

Nothing else in the app draws a logo yet.

## Type

The board's pairing — PiePie for display and the wordmark, Josefin Sans for
supporting text — is what `tokens.json` already compiles into the app's
typography, and both faces load behind the splash.

## Recutting the icon

From `mobile/`, with ImageMagick:

```bash
magick ../design-system/brand/brand-board.jpg -crop 335x358+1207+1018 +repage -alpha off -fuzz 22% -fill '#132936' -draw 'color 0,0 floodfill' -draw 'color 334,0 floodfill' -draw 'color 0,357 floodfill' -draw 'color 334,357 floodfill' -background '#132936' -gravity center -extent 358x358 -filter Lanczos -resize 1024x1024 assets/images/icon.png
```

To see it on a device — Expo Go shows **its own** icon, never yours:

```bash
npx expo prebuild --platform ios && npx expo run:ios
```
