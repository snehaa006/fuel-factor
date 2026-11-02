/**
 * Where to find the backend, when nobody has said.
 *
 * These are the floor, not the preference: `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` still win wherever they are set, so
 * pointing a dev build at a local Supabase is one `.env` away and nothing
 * here has to change.
 *
 * They exist because every other way of carrying the configuration can be
 * forgotten by whoever runs the publish, and once was:
 *
 * - `eas.json` sets the environment for `eas build` and for nothing else.
 * - `.env` is gitignored, so it sets it on one laptop.
 * - `eas update` sees neither unless both are exported into the shell first.
 *
 * One publish without them and the phone opens on "Missing
 * EXPO_PUBLIC_SUPABASE_URL ... Copy .env.example to .env" at the team-code
 * gate, which is exactly what the preview channel served. `app.json`'s
 * `extra` looked like the fix and is not quite: on a phone it travels in the
 * update manifest rather than in the JavaScript, so it depends on the same
 * publish doing something else right. A module constant is in the bundle on
 * every platform, by every route, and can be checked with `strings`.
 *
 * Both values are safe to commit, and were already committed in `eas.json`
 * before this. The URL is public by definition. The publishable key is
 * designed to be published -- it identifies the project and nothing else, and
 * buys no row of anybody's data without a session, because row level security
 * is what answers that question.
 */

export const DEFAULT_SUPABASE_URL = 'https://nprvrlpkdrgckzceyryc.supabase.co';

export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jNqeT7TTB3-V1SGCM4UKeQ_eNUcbW7t';
