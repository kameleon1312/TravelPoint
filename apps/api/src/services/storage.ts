import crypto from 'crypto';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { env } from '../config/env';

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function configured() {
  const { accountId, accessKeyId, secretAccessKey, bucket, publicUrl } = env.r2;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error('STORAGE_NOT_CONFIGURED');
  }
  return {
    s3: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ''),
  };
}

export function validatePhoto(mimeType: string, sizeBytes: number): void {
  if (!PHOTO_MIME_TYPES.includes(mimeType as typeof PHOTO_MIME_TYPES[number])) {
    throw new Error('UNSUPPORTED_MEDIA_TYPE');
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > PHOTO_MAX_BYTES) {
    throw new Error('PHOTO_TOO_LARGE');
  }
}

export async function createPhotoUpload(explorerId: string, mimeType: string, sizeBytes: number) {
  validatePhoto(mimeType, sizeBytes);
  const { s3, bucket } = configured();
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const objectKey = `photos/${explorerId}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    }),
    { expiresIn: 300 },
  );
  return { objectKey, uploadUrl, expiresIn: 300 };
}

export async function finalizePhoto(
  objectKey: string,
  expectedMimeType: string,
  expectedSizeBytes: number,
) {
  validatePhoto(expectedMimeType, expectedSizeBytes);
  const { s3, bucket, publicUrl } = configured();
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
  const actualSize = Number(head.ContentLength ?? 0);
  const actualMime = head.ContentType ?? '';
  validatePhoto(actualMime, actualSize);
  if (actualMime !== expectedMimeType || actualSize !== expectedSizeBytes) {
    throw new Error('UPLOAD_METADATA_MISMATCH');
  }

  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
  if (!object.Body) throw new Error('UPLOAD_MISSING');
  const source = Buffer.from(await object.Body.transformToByteArray());
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error('INVALID_IMAGE');

  const thumbnailKey = objectKey.replace(/\.[^.]+$/, '.thumb.webp');
  const thumbnail = await sharp(source)
    .rotate()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: thumbnailKey,
    Body: thumbnail,
    ContentType: 'image/webp',
  }));

  return {
    url: `${publicUrl}/${objectKey}`,
    thumbnailUrl: `${publicUrl}/${thumbnailKey}`,
    thumbnailKey,
    mimeType: actualMime,
    sizeBytes: actualSize,
  };
}

export async function deleteStoredPhotos(keys: Array<string | null | undefined>): Promise<void> {
  const objectKeys = keys.filter((key): key is string => Boolean(key));
  if (objectKeys.length === 0) return;
  const { s3, bucket } = configured();
  await s3.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: objectKeys.map((Key) => ({ Key })), Quiet: true },
  }));
}
