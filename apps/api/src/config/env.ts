import 'dotenv/config';
import { z } from 'zod';

const RawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().trim().optional(),
  JWT_ACCESS_SECRET: z.string().trim().optional(),
  JWT_REFRESH_SECRET: z.string().trim().optional(),
  ALLOWED_ORIGINS: z.string().trim().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  APP_VERSION: z.string().trim().default('dev'),
  ENCRYPTION_KEY: z.string().trim().optional(),
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
  DPO_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  R2_ACCOUNT_ID: z.string().trim().optional(),
  R2_ACCESS_KEY_ID: z.string().trim().optional(),
  R2_SECRET_ACCESS_KEY: z.string().trim().optional(),
  R2_BUCKET: z.string().trim().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  JOB_SECRET: z.string().trim().optional(),
});

function productionSecret(name: string, value: string | undefined, isProduction: boolean): string {
  if (!value) {
    if (isProduction) throw new Error(`${name} is required in production`);
    return `development-only-${name.toLowerCase()}-secret`;
  }
  if (isProduction && (value.length < 32 || /change_me/i.test(value))) {
    throw new Error(`${name} must contain at least 32 non-placeholder characters`);
  }
  return value;
}

function requiredInProduction(
  name: string,
  value: string | undefined,
  isProduction: boolean,
): string | undefined {
  if (isProduction && (!value || /change_me/i.test(value))) {
    throw new Error(`${name} is required in production`);
  }
  return value;
}

function encryptionKey(value: string | undefined, isProduction: boolean): string | undefined {
  const key = requiredInProduction('ENCRYPTION_KEY', value, isProduction);
  if (!key) return undefined;

  const decoded = Buffer.from(key, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64').replace(/=+$/, '') !== key.replace(/=+$/, '')) {
    throw new Error('ENCRYPTION_KEY must be valid base64 encoding exactly 32 bytes');
  }
  return key;
}

function databaseUrl(value: string | undefined, isProduction: boolean): string | undefined {
  if (!value) {
    if (isProduction) throw new Error('DATABASE_URL is required in production');
    return undefined;
  }
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      throw new Error('unsupported protocol');
    }
  } catch (error) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL', { cause: error });
  }
  return value;
}

function allowedOrigins(value: string | undefined, isProduction: boolean): string[] {
  const origins = (value ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) throw new Error('ALLOWED_ORIGINS must not be empty');
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(`ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
    }
    if (isProduction && url.protocol !== 'https:') {
      throw new Error(`Production origin must use HTTPS: ${origin}`);
    }
  }
  return origins;
}

export function loadEnv(source: NodeJS.ProcessEnv) {
  const parsed = RawEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  const raw = parsed.data;
  const isProduction = raw.NODE_ENV === 'production';
  const accessSecret = productionSecret('JWT_ACCESS_SECRET', raw.JWT_ACCESS_SECRET, isProduction);
  const refreshSecret = productionSecret('JWT_REFRESH_SECRET', raw.JWT_REFRESH_SECRET, isProduction);
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  return {
    nodeEnv: raw.NODE_ENV,
    isProduction,
    databaseUrl: databaseUrl(raw.DATABASE_URL, isProduction),
    jwtAccessSecret: accessSecret,
    jwtRefreshSecret: refreshSecret,
    allowedOrigins: allowedOrigins(raw.ALLOWED_ORIGINS, isProduction),
    port: raw.PORT,
    logLevel: raw.LOG_LEVEL,
    sentryDsn: raw.SENTRY_DSN || undefined,
    appVersion: raw.APP_VERSION,
    encryptionKey: encryptionKey(raw.ENCRYPTION_KEY, isProduction),
    resendApiKey: requiredInProduction('RESEND_API_KEY', raw.RESEND_API_KEY, isProduction),
    emailFrom: requiredInProduction('EMAIL_FROM', raw.EMAIL_FROM, isProduction)
      ?? 'TravelPoint <onboarding@resend.dev>',
    dpoEmail: requiredInProduction('DPO_EMAIL', raw.DPO_EMAIL, isProduction),
    appUrl: requiredInProduction('NEXT_PUBLIC_APP_URL', raw.NEXT_PUBLIC_APP_URL, isProduction)
      ?? 'https://travelpoint.app',
    r2: {
      accountId: requiredInProduction('R2_ACCOUNT_ID', raw.R2_ACCOUNT_ID, isProduction),
      accessKeyId: requiredInProduction('R2_ACCESS_KEY_ID', raw.R2_ACCESS_KEY_ID, isProduction),
      secretAccessKey: requiredInProduction('R2_SECRET_ACCESS_KEY', raw.R2_SECRET_ACCESS_KEY, isProduction),
      bucket: requiredInProduction('R2_BUCKET', raw.R2_BUCKET, isProduction),
      publicUrl: requiredInProduction('R2_PUBLIC_URL', raw.R2_PUBLIC_URL, isProduction),
    },
    jobSecret: productionSecret('JOB_SECRET', raw.JOB_SECRET, isProduction),
  } as const;
}

export const env = loadEnv(process.env);
