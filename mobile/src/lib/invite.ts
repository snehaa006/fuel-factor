/**
 * The invite a coach sends their squad.
 *
 * Pure, so the wording and the URL are both testable without a device.
 *
 * **The link alone is not enough, and the message says so.** A custom scheme
 * only opens if the app is already installed, and there is no https link to
 * fall back on: the app's web build exists and is deployed nowhere, so there
 * is no domain to hang a universal link off. A squad gets this over WhatsApp,
 * where a `fuelfactor://` link on a phone without the app does nothing at all.
 *
 * So the code travels in words beside the link, and the message gives the
 * manual route. When the web build is deployed, `inviteUrl` gains an https
 * form and the shape of this message does not change.
 */

/** The scheme registered in app.json. Changing it there breaks every link already sent. */
export const SCHEME = 'fuelfactor';

/** A join code as the database generates it: 6 characters from an unambiguous alphabet. */
export const JOIN_CODE_LENGTH = 6;

/**
 * Tidy a code a human typed or pasted.
 *
 * Lower case, stray spaces and a pasted URL all arrive here, because a squad
 * copies the whole message rather than six characters out of the middle of it.
 */
export function normaliseCode(input: string): string {
  const trimmed = input.trim();
  // A pasted link: take the last path segment, ignoring any query or fragment.
  const fromUrl = /(?:^|\/)join\/([^/?#\s]+)/i.exec(trimmed);
  const candidate = fromUrl ? fromUrl[1] : trimmed;
  return candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** The deep link for a join code. */
export function inviteUrl(joinCode: string): string {
  return `${SCHEME}://join/${normaliseCode(joinCode)}`;
}

/**
 * What the coach actually sends.
 *
 * Deliberately says nothing about nutrition, weight or food: a message
 * forwarded round a squad group chat is the least controllable text the app
 * produces, and it carries no claim the programme has not made.
 */
export function inviteMessage(teamName: string, joinCode: string): string {
  const code = normaliseCode(joinCode);
  return [
    `Join ${teamName} on Fuel Factor.`,
    '',
    inviteUrl(code),
    '',
    `If that link does not open, install Fuel Factor and enter the team code ${code}.`,
  ].join('\n');
}
