const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !isBinaryLike(file));

const patterns = [
  ['Google Maps API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Stripe secret key', /sk_(live|test)_[0-9A-Za-z]{16,}/],
  ['Stripe webhook secret', /whsec_[0-9A-Za-z]{16,}/],
  ['Resend API key', /re_[0-9A-Za-z]{16,}/],
  ['JWT-like token', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['Private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
];

const allowlistedFiles = new Set([
  '.env.example',
  'docs/SPRINT_1_2_COMPLETION_RUNBOOK.md',
  // EXPO_PUBLIC_ vars are intentionally embedded in the app bundle (public by design).
  // Supabase anon key grants only anonymous DB access. Google Maps key is bundle-ID restricted.
  'apps/mobile/eas.json',
]);

let failed = false;

for (const file of files) {
  if (allowlistedFiles.has(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) {
      console.error(`Potential secret in ${file}: ${label}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('Secret scan passed');

function isBinaryLike(file) {
  return /\.(png|jpg|jpeg|gif|webp|ico|ttf|otf|woff|woff2|pdf|zip|gz|dll|node)$/i.test(file);
}
