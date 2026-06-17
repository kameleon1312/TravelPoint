const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};

const required = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
  'JOB_SECRET',
  'REDIS_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_EXPEDITION_PRICE_ID',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_SENTRY_DSN',
];

const missing = required.filter((name) => !isRealValue(env[name]));
if (missing.length > 0) {
  fail(`Production gate failed. Missing real values: ${missing.join(', ')}`);
}

assertHttps('EXPO_PUBLIC_API_URL');
assertHttps('NEXT_PUBLIC_APP_URL');
assertHttps('R2_PUBLIC_URL');
assertMinLength('JOB_SECRET', 32);
assertPrefix('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'AIza');
assertPrefix('STRIPE_SECRET_KEY', 'sk_');
assertPrefix('STRIPE_WEBHOOK_SECRET', 'whsec_');
assertPrefix('STRIPE_PRO_PRICE_ID', 'price_');
assertPrefix('STRIPE_EXPEDITION_PRICE_ID', 'price_');

if (env.JWT_ACCESS_SECRET && env.JWT_REFRESH_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  fail('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
}

console.log('Production readiness environment gate passed');

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1).trim()];
      }),
  );
}

function isRealValue(value) {
  return Boolean(value && !/CHANGE_ME|placeholder|example|TWOJA_DOMENA/i.test(value));
}

function assertHttps(name) {
  if (!/^https:\/\//.test(env[name] ?? '')) fail(`${name} must use HTTPS`);
}

function assertMinLength(name, min) {
  if ((env[name] ?? '').length < min) fail(`${name} must contain at least ${min} characters`);
}

function assertPrefix(name, prefix) {
  if (!(env[name] ?? '').startsWith(prefix)) fail(`${name} must start with ${prefix}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
