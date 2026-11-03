#!/usr/bin/env node
/**
 * Turn `expo export --no-bytecode` output into a self-hosted update that any
 * Expo Go can open, with no Expo account and no EAS Update.
 *
 * Why: since May 2026 Expo Go only loads EAS Update projects for members of
 * the owning account. It still loads a self-hosted update that speaks the
 * Expo Updates protocol and ships a plain-JavaScript bundle (Hermes bytecode
 * is only accepted from EAS). So this script writes, per platform:
 *
 *   public/<platform>.json   the manifest Expo Go fetches
 *   public/_expo/...         the plain-JS bundle
 *   public/assets/...        every asset the bundle references
 *
 * and vercel.json serves the manifest at `/` according to the
 * `expo-platform` header Expo Go sends. Open it with exps://<host>.
 *
 * Run after:
 *   npx expo export --platform ios --platform android --no-bytecode --output-dir dist-native
 *
 * The host comes from EXPO_GO_HOST, else Vercel's production domain. Every
 * URL in the manifest is absolute https, because Expo Go resolves nothing.
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const exportDir = join(root, 'dist-native');
const outDir = join(root, 'public');

const host = (process.env.EXPO_GO_HOST || process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');
if (!host) {
  console.error('Set EXPO_GO_HOST (e.g. fuel-factor.vercel.app); the manifest needs absolute URLs.');
  process.exit(1);
}
const base = `https://${host}`;

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  json: 'application/json',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('base64url');
const md5 = (buf) => createHash('md5').update(buf).digest('hex');

/** The public app config, minus what would send Expo Go back to EAS. */
function expoClient() {
  const raw = execFileSync('npx', ['expo', 'config', '--type', 'public', '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, EXPO_NO_DOTENV: '1' },
  });
  const config = JSON.parse(raw);
  delete config.updates;
  delete config.owner;
  delete config.runtimeVersion;
  if (config.extra) delete config.extra.eas;
  const sdkVersion = config.sdkVersion
    ?? `${JSON.parse(readFileSync(join(root, 'node_modules/expo/package.json'), 'utf8')).version.split('.')[0]}.0.0`;
  return { ...config, sdkVersion };
}

const metadata = JSON.parse(readFileSync(join(exportDir, 'metadata.json'), 'utf8'));
const client = expoClient();
const sdkMajor = client.sdkVersion.split('.')[0];
const runtimeVersion = `exposdk:${sdkMajor}.0.0`;
const scopeKey = `@anonymous/${client.slug}-expo-go`;
const createdAt = new Date().toISOString();

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const [platform, files] of Object.entries(metadata.fileMetadata)) {
  if (platform !== 'ios' && platform !== 'android') continue;

  const copy = (relative) => {
    const target = join(outDir, relative);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(exportDir, relative), target);
    return readFileSync(target);
  };

  const bundle = copy(files.bundle);
  const launchAsset = {
    hash: sha256(bundle),
    key: md5(bundle),
    contentType: 'application/javascript',
    url: `${base}/${files.bundle}`,
  };

  // Metro names each asset after its md5, so the file name is the key.
  const seen = new Set();
  const assets = [];
  for (const { path, ext } of files.assets) {
    if (seen.has(path)) continue;
    seen.add(path);
    const data = copy(path);
    assets.push({
      hash: sha256(data),
      key: basename(path),
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
      fileExtension: `.${ext}`,
      url: `${base}/${path}`,
    });
  }

  const manifest = {
    id: randomUUID(),
    createdAt,
    runtimeVersion,
    launchAsset,
    assets,
    metadata: {},
    extra: { expoClient: client, scopeKey },
  };
  writeFileSync(join(outDir, `${platform}.json`), JSON.stringify(manifest));
  console.log(`${platform}: ${assets.length} assets, bundle ${files.bundle} -> ${base}/${platform}.json`);
}
