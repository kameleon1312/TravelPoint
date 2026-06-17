import { describe, expect, it } from 'vitest';
import { PHOTO_MAX_BYTES, validatePhoto } from './storage';

describe('validatePhoto', () => {
  it('accepts supported images within the limit', () => {
    expect(() => validatePhoto('image/jpeg', 1024)).not.toThrow();
    expect(() => validatePhoto('image/webp', PHOTO_MAX_BYTES)).not.toThrow();
  });

  it('rejects unsupported media and oversized payloads', () => {
    expect(() => validatePhoto('image/svg+xml', 1024)).toThrow('UNSUPPORTED_MEDIA_TYPE');
    expect(() => validatePhoto('image/png', PHOTO_MAX_BYTES + 1)).toThrow('PHOTO_TOO_LARGE');
  });
});
