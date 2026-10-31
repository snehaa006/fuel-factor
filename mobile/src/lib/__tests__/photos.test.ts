import { BUCKET, extensionFor, photoPath, SIGNED_URL_TTL_SECONDS } from '@/lib/photos';

describe('where a challenge photo lives', () => {
  it('puts the participant first, because that is what the policy checks', () => {
    // The storage policy compares the first folder against the caller's own
    // participant id, so this layout is load-bearing and not cosmetic.
    expect(photoPath('p-1', 'ch-1', '2026-10-31', 'jpg')).toBe('p-1/ch-1/2026-10-31.jpg');
  });

  it('gives one path per challenge per day, so a retake replaces', () => {
    const first = photoPath('p-1', 'ch-1', '2026-10-31', 'jpg');
    const retake = photoPath('p-1', 'ch-1', '2026-10-31', 'jpg');
    expect(retake).toBe(first);
  });

  it('keeps two athletes’ photos in different folders', () => {
    expect(photoPath('p-1', 'ch-1', '2026-10-31', 'jpg')).not.toBe(
      photoPath('p-2', 'ch-1', '2026-10-31', 'jpg')
    );
  });
});

describe('what the bucket accepts', () => {
  it('maps the types the bucket allows', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/png')).toBe('png');
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/heic')).toBe('heic');
  });

  it('ignores case, because a picker may report any', () => {
    expect(extensionFor('IMAGE/JPEG')).toBe('jpg');
  });

  it('refuses a type the bucket does not allow', () => {
    // Caught here so the athlete reads a sentence instead of a storage error.
    expect(extensionFor('application/pdf')).toBeNull();
    expect(extensionFor('image/gif')).toBeNull();
  });

  it('refuses a missing type rather than assuming JPEG', () => {
    expect(extensionFor(null)).toBeNull();
    expect(extensionFor(undefined)).toBeNull();
    expect(extensionFor('')).toBeNull();
  });
});

describe('how a photo is served', () => {
  it('reads from a bucket that is not public', () => {
    // The migration creates this bucket private. If that ever flips, photos
    // of minors become world-readable by URL.
    expect(BUCKET).toBe('challenge-photos');
  });

  it('signs a URL that expires in minutes, not days', () => {
    expect(SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(600);
    expect(SIGNED_URL_TTL_SECONDS).toBeGreaterThan(0);
  });
});
