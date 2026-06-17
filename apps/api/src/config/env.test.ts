import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/travelpoint',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ALLOWED_ORIGINS: 'https://travelpoint.app',
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  RESEND_API_KEY: 're_production_key',
  EMAIL_FROM: 'TravelPoint <noreply@travelpoint.app>',
  DPO_EMAIL: 'privacy@travelpoint.app',
  NEXT_PUBLIC_APP_URL: 'https://travelpoint.app',
  R2_ACCOUNT_ID: 'account-id',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  R2_BUCKET: 'travelpoint-media',
  R2_PUBLIC_URL: 'https://media.travelpoint.app',
  JOB_SECRET: 'j'.repeat(32),
} satisfies NodeJS.ProcessEnv;

describe('loadEnv', () => {
  it('accepts a complete production configuration', () => {
    expect(loadEnv(productionEnv)).toMatchObject({
      isProduction: true,
      allowedOrigins: ['https://travelpoint.app'],
    });
  });

  it.each([
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'DPO_EMAIL',
    'NEXT_PUBLIC_APP_URL',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_URL',
    'JOB_SECRET',
  ])('fails fast when production variable %s is missing', (name) => {
    const source = { ...productionEnv };
    delete source[name];
    expect(() => loadEnv(source)).toThrow();
  });

  it('rejects insecure origins and malformed encryption keys in production', () => {
    expect(() => loadEnv({ ...productionEnv, ALLOWED_ORIGINS: 'http://travelpoint.app' }))
      .toThrow('Production origin must use HTTPS');
    expect(() => loadEnv({ ...productionEnv, ENCRYPTION_KEY: 'invalid' }))
      .toThrow('ENCRYPTION_KEY must be valid base64');
  });
});
