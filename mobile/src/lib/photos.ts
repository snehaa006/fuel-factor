import { asError } from './errors';
import { supabase } from './supabase';

/**
 * The weekly challenge photo.
 *
 * This is the one thing the app stores that is a picture of a child, so it is
 * handled differently from everything else:
 *
 *   * The bucket is private. Nothing is served from a public URL. To draw an
 *     image the app asks for a signed URL that expires in minutes.
 *   * Only the athlete can read their own. A coach can see the completion
 *     tick and not the picture, because nobody asked for that and un-sharing
 *     a photo of a minor is not possible.
 *   * Only a path is ever stored on the row. A URL in the database would
 *     outlive the policy that is supposed to guard it.
 */

export const BUCKET = 'challenge-photos';

/** Long enough to load an image, short enough that a leaked link is worthless. */
export const SIGNED_URL_TTL_SECONDS = 300;

/** What the storage bucket accepts, mirroring its allowed_mime_types. */
const EXTENSION_FOR: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export function extensionFor(mimeType: string | null | undefined): string | null {
  if (!mimeType) return null;
  return EXTENSION_FOR[mimeType.toLowerCase()] ?? null;
}

/**
 * Where a photo lives.
 *
 * The first folder is the participant, because that is what the storage
 * policy checks. It is not a hint to the client: the policy reads the path
 * the server sees, so a device cannot write into someone else's folder by
 * asking nicely.
 */
export function photoPath(
  participantId: string,
  challengeId: string,
  on: string,
  extension: string
): string {
  return `${participantId}/${challengeId}/${on}.${extension}`;
}

export type PickedPhoto = {
  uri: string;
  mimeType: string | null;
};

/**
 * Upload a picked photo, replacing whatever was there for that day.
 *
 * Returns the object path to store on the completion row. A file type the
 * bucket does not accept is refused here rather than at the server, so the
 * athlete gets a sentence instead of a storage error.
 */
export async function uploadChallengePhoto(
  participantId: string,
  challengeId: string,
  on: string,
  photo: PickedPhoto
): Promise<string> {
  const extension = extensionFor(photo.mimeType);
  if (extension === null) {
    throw new Error('That file type cannot be uploaded. Use a JPEG, PNG, WebP or HEIC photo.');
  }

  const path = photoPath(participantId, challengeId, on, extension);

  // fetch on a file:// URI is how a React Native app reads a local file into
  // something uploadable; ArrayBuffer rather than Blob, because Blob uploads
  // land as zero bytes on React Native.
  const response = await fetch(photo.uri);
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: photo.mimeType ?? 'image/jpeg',
    upsert: true,
  });

  if (error) throw asError(error);
  return path;
}

/** A short-lived URL for drawing the image, or null if it cannot be signed. */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) throw asError(error);
  return data?.signedUrl ?? null;
}

/** Remove a photo. Taking it back has to be as easy as adding it. */
export async function removeChallengePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw asError(error);
}
