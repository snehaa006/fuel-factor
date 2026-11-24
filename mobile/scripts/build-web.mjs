#!/usr/bin/env node
/**
 * Put the web build of the app beside the Expo Go update, on the same host.
 *
 * Why: the demo needs a build with no developer menu. Expo Go is a developer
 * tool -- shaking the phone opens its menu, and no setting in this app can
 * switch that off, because the menu belongs to Expo Go and not to Fuel Factor.
 * A release build has no such menu. On Android that is the APK; on an iPhone
 * the only release build that needs no App Store account is the web build, so
 * it is served here and opens in any phone's browser from a plain https link.
 *
 * One host, two audiences, told apart by a header:
 *
 *   - Expo Go asks for `/` with an `expo-platform` header and vercel.json
 *     rewrites that to `/ios.json` or `/android.json`, the update manifest.
 *   - A browser asks without it, and every path that is not a file falls
 *     through to `/app.html`, the single-page web app.
 *
 * The web build's own `index.html` is renamed `app.html` on purpose. Vercel
 * serves a file that exists before it applies any rewrite, so an `index.html`
 * at the root would answer Expo Go's request for `/` with HTML and break the
 * Expo Go route for everybody.
 *
 * The two builds share no paths: the bundles are under `_expo/static/js/web/`
 * and `_expo/static/js/<ios|android>/`, the web assets under
 * `assets/assets/...` and `assets/node_modules/...`, the native ones under
 * `assets/<md5>`. A collision would mean one build silently serving the
 * other's file, so this script refuses to overwrite anything.
 *
 * Run after build-expo-go.mjs, which empties `public/` first:
 *
 *   npx expo export --platform web --output-dir dist-web
 *   node scripts/build-web.mjs
 */
import { cpSync, existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = join(root, 'dist-web');
const outDir = join(root, 'public');

/** The web build's entry page, under the name the rewrites point at. */
export const WEB_ENTRY = 'app.html';

if (!existsSync(join(webDir, 'index.html'))) {
  console.error('No dist-web/index.html. Run: npx expo export --platform web --output-dir dist-web');
  process.exit(1);
}

/** Every file under a directory, as paths relative to it. */
function filesUnder(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path).map((f) => join(name, f)));
    else found.push(name);
  }
  return found;
}

const files = filesUnder(webDir).filter((f) => f !== 'metadata.json');
const clashes = files
  .map((f) => (f === 'index.html' ? WEB_ENTRY : f))
  .filter((f) => existsSync(join(outDir, f)));

if (clashes.length > 0) {
  console.error(`The web build would overwrite files of the Expo Go update:\n  ${clashes.join('\n  ')}`);
  process.exit(1);
}

for (const file of files) {
  cpSync(join(webDir, file), join(outDir, file), { recursive: true });
}
renameSync(join(outDir, 'index.html'), join(outDir, WEB_ENTRY));

console.log(`web: ${files.length} files -> ${relative(root, outDir)}/ (entry ${WEB_ENTRY})`);
