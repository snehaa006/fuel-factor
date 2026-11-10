import { Clipboard, Platform } from 'react-native';

/**
 * Copy text to the clipboard, without a native module.
 *
 * A coach reads the join code out across a pitch and pastes it into WhatsApp,
 * and until now the paste half meant selecting six characters out of a
 * `stat-hero` heading by long-press. "Send the invite" opens the share sheet,
 * which is the right route when it works, but a coach who wants the code *in*
 * a message they are already writing has nowhere to take it from.
 *
 * **Why not `expo-clipboard`.** It is the obvious answer and it is the wrong
 * one here. The `share` APK that has already been handed out picks up new
 * JavaScript over the air; its native side is frozen at whatever was compiled
 * into it. Adding a native module and publishing an update would hand every
 * installed phone a bundle whose first tap on this button throws, and the only
 * fix would be reinstalling the APK -- which is the one thing the OTA channel
 * exists to avoid. `expo-clipboard` is a rebuild away whenever the native side
 * is being rebuilt for another reason.
 *
 * So: the web's own API on web, and React Native's core `Clipboard` on a
 * phone. Core `Clipboard` is deprecated and prints a warning, which is the
 * price of not needing a rebuild; it is backed by a module that has been in
 * every React Native binary since long before this project's APK was built,
 * so it works on the phones that already have the app.
 *
 * Returns whether it worked, so the caller can say nothing happened rather
 * than claiming a copy that did not. The code is `selectable` text either way,
 * which is the fallback that needs no API at all.
 */
export async function copyText(text: string): Promise<boolean> {
  if (text === '') return false;

  if (Platform.OS === 'web') {
    // Only over https or on localhost, and only from a user gesture. A
    // rejection here is a real "it did not copy", not an error to throw.
    try {
      const api = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } })
        .navigator?.clipboard;
      if (!api) return false;
      await api.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  try {
    Clipboard.setString(text);
    return true;
  } catch {
    return false;
  }
}
