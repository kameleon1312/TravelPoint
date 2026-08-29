import 'dotenv/config';
import { z } from 'zod';

const RawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().trim().optional(),
  DIRECT_URL: z.string().trim().optional(),
  JWT_ACCESS_SECRET: z.string().trim().optional(),
  JWT_REFRESH_SECRET: z.string().trim().optional(),
  SUPABASE_JWT_SECRET: z.string().trim().optional(),
  SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  ALLOWED_ORIGINS: z.string().trim().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  REDIS_URL: z.string().url().optional().or(z.literal('')),
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
  STRIPE_SECRET_KEY: z.string().trim().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().optional(),
  STRIPE_PRO_PRICE_ID: z.string().trim().optional(),
  STRIPE_EXPEDITION_PRICE_ID: z.string().trim().optional(),
  BILLING_SUCCESS_URL: z.string().url().optional(),
  BILLING_CANCEL_URL: z.string().url().optional(),
  RAILWAY_ENVIRONMENT: z.string().trim().optional(),
  RAILWAY_PROJECT_ID: z.string().trim().optional(),
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

function optionalValue(value: string | undefined): string | undefined {
  if (!value || /change_me/i.test(value)) return undefined;
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

function databaseUrl(
  value: string | undefined,
  isProduction: boolean,
  isHostedRuntime: boolean,
): string | undefined {
  if (!value) {
    if (isProduction || isHostedRuntime) {
      throw new Error('DATABASE_URL is required in production and hosted runtimes');
    }
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
  const isHostedRuntime = Boolean(raw.RAILWAY_ENVIRONMENT || raw.RAILWAY_PROJECT_ID);
  const accessSecret = productionSecret('JWT_ACCESS_SECRET', raw.JWT_ACCESS_SECRET, isProduction);
  const refreshSecret = productionSecret('JWT_REFRESH_SECRET', raw.JWT_REFRESH_SECRET, isProduction);
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  return {
    nodeEnv: raw.NODE_ENV,
    isProduction,
    databaseUrl: databaseUrl(raw.DATABASE_URL, isProduction, isHostedRuntime),
    jwtAccessSecret: accessSecret,
    jwtRefreshSecret: refreshSecret,
    supabaseJwtSecret: raw.SUPABASE_JWT_SECRET ?? '',
    supabaseUrl: raw.SUPABASE_URL ?? '',
    supabaseServiceRoleKey: raw.SUPABASE_SERVICE_ROLE_KEY ?? '',
    allowedOrigins: allowedOrigins(raw.ALLOWED_ORIGINS, isProduction),
    port: raw.PORT,
    logLevel: raw.LOG_LEVEL,
    redisUrl: optionalValue(raw.REDIS_URL),
    sentryDsn: raw.SENTRY_DSN || undefined,
    appVersion: raw.APP_VERSION,
    encryptionKey: encryptionKey(raw.ENCRYPTION_KEY, isProduction),
    resendApiKey: optionalValue(raw.RESEND_API_KEY),
    emailFrom: optionalValue(raw.EMAIL_FROM) ?? 'TravelPoint <onboarding@resend.dev>',
    dpoEmail: raw.DPO_EMAIL,
    appUrl: optionalValue(raw.NEXT_PUBLIC_APP_URL) ?? 'https://travelpoint.app',
    r2: {
      accountId: optionalValue(raw.R2_ACCOUNT_ID),
      accessKeyId: optionalValue(raw.R2_ACCESS_KEY_ID),
      secretAccessKey: optionalValue(raw.R2_SECRET_ACCESS_KEY),
      bucket: optionalValue(raw.R2_BUCKET),
      publicUrl: optionalValue(raw.R2_PUBLIC_URL),
    },
    jobSecret: optionalValue(raw.JOB_SECRET),
    stripe: {
      secretKey: optionalValue(raw.STRIPE_SECRET_KEY),
      webhookSecret: optionalValue(raw.STRIPE_WEBHOOK_SECRET),
      proPriceId: optionalValue(raw.STRIPE_PRO_PRICE_ID),
      expeditionPriceId: optionalValue(raw.STRIPE_EXPEDITION_PRICE_ID),
      successUrl: optionalValue(raw.BILLING_SUCCESS_URL) ?? `${optionalValue(raw.NEXT_PUBLIC_APP_URL) ?? 'https://travelpoint.app'}/billing/success`,
      cancelUrl: optionalValue(raw.BILLING_CANCEL_URL) ?? `${optionalValue(raw.NEXT_PUBLIC_APP_URL) ?? 'https://travelpoint.app'}/billing/cancel`,
    },
  } as const;
}

export const env = loadEnv(process.env);
