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

/**
 * Where the confirmation email's link lands.
 *
 * It landed on `http://localhost:3000`, which is a page that exists on one
 * laptop and on no phone. An athlete who tapped "confirm" in their email got
 * a browser error, and the account stayed unconfirmed -- so the one screen
 * standing between a squad and the app failed for everybody who was not
 * sitting at a dev machine.
 *
 * The cause is a default rather than a bug: Supabase sends the link to
 * `{SUPABASE_URL}/auth/v1/verify?...&redirect_to=...`, and when no
 * `redirect_to` is asked for -- or one is asked for that the project has not
 * allow-listed -- it falls back to the project's **Site URL**, which is
 * `localhost:3000` until somebody changes it in the dashboard.
 *
 * So two things have to agree, and only one of them lives in this repository:
 *
 * 1. The app asks for this URL by name (`emailRedirectTo` in `account.ts`).
 * 2. The Supabase project has to allow it. Both the **Site URL** and the
 *    **Redirect URLs** allow-list are dashboard settings under Authentication
 *    → URL Configuration, and no key in this bundle can change them. Until
 *    this URL is in that list, Supabase ignores it and falls back to the Site
 *    URL -- which is the bug. See docs/RUNNING-IT.md.
 *
 * The page it points at confirms the account and sends the athlete back to
 * the app. It is deliberately not the web build: an athlete opening this on a
 * phone wants one sentence and a way back, not the whole app booted in a
 * mobile browser.
 */
export const EMAIL_REDIRECT_URL = 'https://fuel-factor-tamannas-projects-ab505aa3.vercel.app';
