import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { messageOf } from '@/lib/errors';
import type { PickedPhoto } from '@/lib/photos';
import { useTheme } from '@/theme';

export type ChallengePhotoProps = {
  /** A short-lived signed URL, or null when there is no photo. */
  url: string | null;
  uploading: boolean;
  error: string | null;
  onPick: (photo: PickedPhoto) => void;
  onClear: () => void;
  /** Told when picking itself fails, so the screen can say so. */
  onPickError?: (message: string) => void;
  testID?: string;
};

/**
 * Resized on the device before it is uploaded.
 *
 * A 12 MP phone photo over Jakarta mobile data is a slow upload, and the
 * bucket refuses anything over 5 MB — which an athlete would meet as a
 * failure after waiting. The challenge needs a recognisable breakfast, so the
 * long edge is capped and the result re-encoded as JPEG.
 */
const MAX_EDGE = 1280;
const QUALITY = 0.7;

/** Cap the long edge and re-encode, returning a file ready to upload. */
async function downscale(uri: string, width: number, height: number): Promise<PickedPhoto> {
  const longEdge = Math.max(width, height);
  const context = ImageManipulator.manipulate(uri);

  if (longEdge > MAX_EDGE) {
    // Only the long edge is given, so the aspect ratio is kept.
    context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, mimeType: 'image/jpeg' };
}

/**
 * The weekly challenge photo.
 *
 * Optional, always. The challenge can be marked done without one, and the
 * photo can be taken back afterwards — the whole point of the Week 1
 * challenge is to add a carbohydrate, not to prove it to anyone.
 */
export function ChallengePhoto({
  url,
  uploading,
  error,
  onPick,
  onClear,
  onPickError,
  testID,
}: ChallengePhotoProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const pick = useCallback(
    async (from: 'camera' | 'library') => {
      // The permission is requested at the moment it is used, so the prompt
      // arrives with the reason visible on screen behind it.
      const permission =
        from === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        // Refusing is a choice, not a failure, but silence here looks like a
        // dead button -- which is how this was first found on the simulator.
        onPickError?.(
          from === 'camera'
            ? 'Fuel Factor cannot open the camera without permission.'
            : 'Fuel Factor cannot open your photos without permission.'
        );
        return;
      }

      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 1 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;

      // Picked at full quality and downscaled here, so the single
      // re-encode happens after the resize rather than before it.
      onPick(await downscale(asset.uri, asset.width, asset.height));
    },
    [onPick, onPickError]
  );

  /**
   * Picking is async and its rejection has nowhere to go from onPress, so it
   * is caught here. An unhandled one leaves a button that does nothing and
   * says nothing.
   */
  const pickSafely = useCallback(
    (from: 'camera' | 'library') => {
      pick(from).catch((e: unknown) => onPickError?.(messageOf(e)));
    },
    [pick, onPickError]
  );

  const action = (label: string, name: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: uploading }}
      testID={testID ? `${testID}-${name}` : undefined}
      style={[
        styles.action,
        {
          backgroundColor: uploading ? colors.locked : colors['surface-sunken'],
          borderRadius: radius['radius-pill'],
          paddingVertical: spacing['space-2'],
          paddingHorizontal: spacing['space-4'],
        },
      ]}
    >
      <Text
        style={[typography.label, { color: uploading ? colors['ink-faint'] : colors['ink-muted'] }]}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-raised'],
          borderRadius: radius['radius-lg'],
          padding: spacing['space-4'],
          gap: spacing['space-3'],
        },
      ]}
    >
      <Text style={[typography.label, { color: colors['ink-muted'] }]}>PHOTO — OPTIONAL</Text>

      {url !== null && (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          source={{ uri: url }}
          style={[styles.image, { borderRadius: radius['radius-md'] }]}
          contentFit="cover"
          accessibilityLabel="Your photo for this challenge"
        />
      )}

      {uploading && (
        <View style={[styles.row, { gap: spacing['space-2'] }]}>
          <ActivityIndicator color={colors.pisang} />
          <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>Uploading…</Text>
        </View>
      )}

      {error !== null && (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          style={[typography['body-s'], { color: colors['cabai-deep'] }]}
        >
          {error}
        </Text>
      )}

      <View style={[styles.row, { gap: spacing['space-2'] }]}>
        {action(url === null ? 'Take a photo' : 'Retake', 'camera', () => pickSafely('camera'))}
        {action(url === null ? 'Choose one' : 'Replace', 'library', () => pickSafely('library'))}
        {url !== null && action('Remove', 'remove', onClear)}
      </View>

      {url === null && (
        <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>
          Only you can see this. It is never shown to your team.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  image: { width: '100%', aspectRatio: 4 / 3 },
  action: { alignItems: 'center', justifyContent: 'center' },
});
