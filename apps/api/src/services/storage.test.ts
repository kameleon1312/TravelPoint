import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PHOTO_MAX_BYTES, stripImageMetadata, validatePhoto } from './storage';

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

describe('stripImageMetadata', () => {
  async function photoWithGps(format: 'jpeg' | 'webp' | 'png'): Promise<Buffer> {
    return sharp({ create: { width: 8, height: 8, channels: 3, background: '#0C1014' } })
      .withExif({
        IFD0: { Make: 'TestPhone' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 3/1 41/1', GPSLongitudeRef: 'E', GPSLongitude: '19/1 56/1 18/1' },
      })
      .toFormat(format)
      .toBuffer();
  }

  it.each([
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'],
    ['png', 'image/png'],
  ] as const)('removes EXIF incl. GPS from %s uploads', async (format, mime) => {
    const original = await photoWithGps(format);
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const clean = await stripImageMetadata(original, mime);
    const meta = await sharp(clean).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe(format);
    expect(meta.width).toBe(8);
  });
});
