# Brand assets

The logo system is specified in `../tokens.json` under `brand`. This folder
holds the artwork it points at.

## What is here

`mascot-board.jpg` — the astronaut sheet: seven poses, a balloon bunch and six
nutrient roundels, with the taglines. The app's mascot assets are cut from it
into `mobile/assets/mascots/`.

`brand-board.jpg` — the logo board, as Theo supplied it. It carries four
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

## The palette comes from the boards

Every colour token is sampled from the two boards. Theo's call, taken on
31 October: the app uses these colours and no others.

| Token | Hex | Where it is on a board |
|---|---|---|
| `santan` | `#f6eed3` | The ground of both boards |
| `pisang` | `#f6aa32` | The lightning roundel; the C planet |
| `cabai` | `#fc5b27` | The shuttle's nose and exhaust |
| `gula` | `#8c7359` | The mascot suit's webbing |
| `kecap` | `#523123` | The mascot sheet's wordmark |
| `langit` | `#0a2639` | The icon lockup's sky |
| `daun` | `#a6b385` | The natural-nutrients planet, light tone |
| `air` | `#406c79` | The magnesium planet |

Three of those are new facts about the brand:

**`langit` did not exist.** The five-colour set had no name for the navy the
icon sits on. It is now the dark theme's surface, which makes the splash
continue straight into the app instead of cutting from navy to brown.

**`daun` and `air` were invented.** Both were marked *FUNCTIONAL, not from the
brand board*. The mascot sheet's nutrient planets supply a green and a teal, so
they are board colours now and the comment is gone.

**`ink-muted` is no longer `gula`.** The board's mid-brown is lighter than the
old `#89472e` and reaches only 3.8:1 on the board's cream, under the 4.5:1 the
design system promises for text. `gula` stays a graphic colour and `ink-muted`
is its own value. A test pins that so nobody re-aliases it.

Contrast is checked for all thirteen text pairings in both themes by
`mobile/src/theme/__tests__/contrast.test.ts`; the worst pair is 5.5:1.

## The mascot

Seven poses plus the balloon bunch, cut from `mascot-board.jpg` the same way
the icon was — flood fill inward from the corners so the cream becomes
transparent, then trim. They live in `mobile/assets/mascots/` and are drawn by
`mobile/src/components/mascot.tsx`.

**The mascot never says anything about food.** Every line it can utter is in
`mobile/src/lib/mascot-copy.ts` and is about logging, streaks, badges or
challenges — the app's own side, which needs nobody's sign-off. The
programme's sentences go through `NudgeCard`, which carries a rule code and a
source and can be reviewed. A cartoon astronaut is the most persuasive voice
on the screen and the least qualified one, and a test holds its whole
vocabulary to that.

**The nutrient roundels are props, not data.** The balloons are labelled B, C,
Mg and Ca, and the app tracks none of those — the Week 1 deck gives no
micronutrient figures at all. They appear once, on the welcome screen, as
brand art with no number near them. Do not build a nutrient chip out of them.

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
magick ../design-system/brand/brand-board.jpg -crop 335x358+1207+1018 +repage -alpha off -fuzz 22% -fill '#0a2639' -draw 'color 0,0 floodfill' -draw 'color 334,0 floodfill' -draw 'color 0,357 floodfill' -draw 'color 334,357 floodfill' -background '#0a2639' -gravity center -extent 358x358 -filter Lanczos -resize 1024x1024 assets/images/icon.png
```

To see it on a device — Expo Go shows **its own** icon, never yours:

```bash
npx expo prebuild --platform ios && npx expo run:ios
```
