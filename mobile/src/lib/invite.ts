import { en } from '@/i18n/en';
import type { Strings } from '@/i18n';

/**
 * The invite a coach sends their squad.
 *
 * Pure, so the wording and the URL are both testable without a device.
 *
 * **The link is an ordinary https link now.** It used to be `fuelfactor://`,
 * which WhatsApp does not even turn into a link and which opens nothing on a
 * phone without the app. The web build is deployed (see `WEB_APP_URL`), so the
 * link opens the real app in any phone's browser with nothing to install, and
 * lands on the squad's join flow with the code already in it.
 *
 * The code still travels in words beside the link, for an athlete who already
 * has the app installed and would rather type six characters into it.
 */

/** The scheme registered in app.json. Changing it there breaks every link already sent. */
export const SCHEME = 'fuelfactor';

/**
 * Where the app's web build is served: a release build, so it has no
 * developer menu, and the same host Expo Go loads its update from (see
 * `scripts/build-web.mjs`). Changing it breaks every invite already sent.
 */
export const WEB_APP_URL = 'https://fuel-factor-expo-go.vercel.app';

/** A join code as the database generates it: 6 characters from an unambiguous alphabet. */
export const JOIN_CODE_LENGTH = 6;

/**
 * Upper case, letters and digits and nothing else.
 *
 * Both codes in this app are generated from an unambiguous upper-case
 * alphabet, so a lower-case character is always a typing artefact rather than
 * a different code. `autoCapitalize="characters"` asks the *keyboard* to help
 * and is the whole answer on neither platform that matters: it does nothing on
 * web, where a coach opens the dashboard, and nothing for a paste anywhere. So
 * the value is normalised on the way in rather than the keyboard being asked
 * nicely -- a lookup that failed on `k7xrmp` was indistinguishable from a
 * wrong code, and the screen said "No team with that code."
 */
export function normaliseCodeText(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Tidy a join code a human typed or pasted.
 *
 * Lower case, stray spaces and a pasted URL all arrive here, because a squad
 * copies the whole message rather than six characters out of the middle of it.
 */
export function normaliseCode(input: string): string {
  const trimmed = input.trim();
  // A pasted link: take the last path segment, ignoring any query or fragment.
  const fromUrl = /(?:^|\/)join\/([^/?#\s]+)/i.exec(trimmed);
  return normaliseCodeText(fromUrl ? fromUrl[1] : trimmed);
}

/** The link for a join code: opens the join flow in any browser. */
export function inviteUrl(joinCode: string): string {
  return `${WEB_APP_URL}/join/${normaliseCode(joinCode)}`;
}

/**
 * What the coach actually sends.
 *
 * Deliberately says nothing about nutrition, weight or food: a message
 * forwarded round a squad group chat is the least controllable text the app
 * produces, and it carries no claim the programme has not made.
 */
export function inviteMessage(teamName: string, joinCode: string, t: Strings = en): string {
  const code = normaliseCode(joinCode);
  return t.teamCode.invite(teamName, inviteUrl(code), code);
}
