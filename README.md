# Samt — Qibla Finder

*Samt* (سمت) is Arabic for "direction / bearing" — and the root of the English word **azimuth**.

## Run it
```bash
npm install
npx expo start        # scan the QR with Expo Go on your iPhone
```
The compass needs a real device (simulators have no magnetometer).

## How it works
- `src/qibla.ts` — great-circle bearing + distance to the Kaaba (21.4225°N, 39.8262°E).
- `App.tsx` — gets GPS once, streams compass heading via `expo-location`
  (`trueHeading`, falls back to magnetic), rotates the dial so its 0° tracks true north.
  The screen is a **mihrab**: the arch's apex is where the phone points.
- `src/CompassDial.tsx` — rotating astrolabe-style SVG plate: ticks, numerals, girih rosette,
  alidade needle and the Kaaba riding the outer track at the Qibla bearing.
- `src/Bezel.tsx` — fixed overlay: lubber mark plus an arc that shrinks as you turn toward the Qibla.
- `src/Mihrab.tsx` — khatam-patterned wall and the self-drawing arch with its turquoise glow.
- `src/theme.ts` — palette, fonts (Marcellus, Amiri, DM Mono via `@expo-google-fonts`), geometry helpers.
- Within ±3° the niche glows turquoise and the phone gives a success haptic.

Sanity checks: Fairfax Station VA → 56.4°, London → 119.0°, Jakarta → 295.1°.

## Build for TestFlight
```bash
eas build -p ios && eas submit -p ios
```
Bundle ID is `com.bilal.samt` in `app.json` — change it if you like.
