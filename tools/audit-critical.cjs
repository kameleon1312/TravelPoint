#!/usr/bin/env node
// Fails CI only on NEW critical vulnerabilities — not on known ecosystem
// issues that have no fix available from the consumer side.
// Update IGNORED_GHSAS when a patched package is released.
'use strict';
const { execSync } = require('child_process');

// GHSAs to ignore — all are in Expo CLI (build-time, not runtime server).
// Remove an entry once the upstream package publishes a patched release.
const IGNORED_GHSAS = new Set([
  'GHSA-23hp-3jrh-7fpw', // tar <=7.5.18 in @expo/cli — tar@7.5.19 not yet on npm
]);

function extractGhsa(url) {
  const m = (url || '').match(/(GHSA-[\w]+-[\w]+-[\w]+)/);
  return m ? m[1] : null;
}

let raw = '';
try {
  raw = execSync('pnpm audit --json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  // pnpm audit exits non-zero when vulnerabilities found; stdout is still valid JSON
  raw = e.stdout ?? '';
}

let audit;
try {
  audit = JSON.parse(raw);
} catch {
  // JSON unparseable — fall back to plain audit (will fail if any critical exists)
  console.error('pnpm audit --json was unparseable; falling back to plain audit');
  try {
    execSync('pnpm audit --audit-level critical', { stdio: 'inherit' });
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

const advisories = Object.entries(audit.advisories || {});
const blockers = advisories.filter(([, adv]) => {
  if (adv.severity !== 'critical') return false;
  const ghsa = extractGhsa(adv.url);
  return !IGNORED_GHSAS.has(ghsa);
});

if (blockers.length > 0) {
  console.error(`\nFOUND ${blockers.length} unacknowledged critical vulnerability(ies):\n`);
  for (const [, adv] of blockers) {
    console.error(`  ${adv.module_name}: ${adv.title}`);
    console.error(`  ${adv.url}\n`);
  }
  process.exit(1);
}

const criticalTotal = audit.metadata?.vulnerabilities?.critical ?? 0;
const suppressed = criticalTotal - blockers.length;
if (suppressed > 0) {
  console.log(`${suppressed} critical advisory(ies) suppressed (Expo CLI build tools — see tools/audit-critical.cjs).`);
}
console.log('Security audit passed — no unacknowledged critical vulnerabilities.');
process.exit(0);
