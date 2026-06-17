const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};

const required = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
  'JOB_SECRET',
];

const missing = required.filter((name) => !isRealValue(env[name]));
if (missing.length > 0) {
  console.error(`Pre-Sprint 3 operational gate failed. Missing real values: ${missing.join(', ')}`);
  process.exit(1);
}

if (!/^https:\/\//.test(env.EXPO_PUBLIC_API_URL)) {
  console.error('EXPO_PUBLIC_API_URL must use HTTPS');
  process.exit(1);
}
if (!/^AIza[0-9A-Za-z_-]{35}$/.test(env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)) {
  console.error('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY has an invalid format');
  process.exit(1);
}
if (!/^https:\/\//.test(env.R2_PUBLIC_URL)) {
  console.error('R2_PUBLIC_URL must use HTTPS');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET)) {
  console.error('R2_BUCKET must be a valid bucket name');
  process.exit(1);
}
if (env.JOB_SECRET.length < 32) {
  console.error('JOB_SECRET must contain at least 32 characters');
  process.exit(1);
}

console.log('Pre-Sprint 3 operational environment gate passed');

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
  return Boolean(
    value &&
    !/CHANGE_ME|placeholder|example/i.test(value),
  );
}
