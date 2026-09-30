# Sprint 4 production hardening

Sprint 4 turns TravelPoint from a working MVP into a releaseable production
system. It intentionally prioritizes gates, evidence and rollback paths over new
features.

## Production readiness commands

Run locally before a production release:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd --filter @travelpoint/api db:generate
pnpm.cmd --filter @travelpoint/api test
pnpm.cmd --filter @travelpoint/api type-check
pnpm.cmd --filter @travelpoint/api lint
pnpm.cmd --filter @travelpoint/web type-check
pnpm.cmd --filter @travelpoint/web lint
pnpm.cmd --filter @travelpoint/web build
pnpm.cmd --filter @travelpoint/mobile type-check
pnpm.cmd --filter @travelpoint/mobile lint
pnpm.cmd --filter @travelpoint/mobile config:check
pnpm.cmd security:secrets
pnpm.cmd gate:production
```

Run against deployed services:

```powershell
$env:TRAVELPOINT_API_URL='https://travelpointapi-production.up.railway.app'
$env:TRAVELPOINT_WEB_URL='https://travelpoint.app'
$env:TRAVELPOINT_JOB_SECRET='<same value as Railway JOB_SECRET>'
pnpm.cmd smoke:production
```

## Production environment gate

`pnpm gate:production` requires real values in local `.env` for:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `JOB_SECRET`
- `REDIS_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_EXPEDITION_PRICE_ID`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_SENTRY_DSN`

## GitHub required secrets

- `TRAVELPOINT_API_URL`
- `TRAVELPOINT_WEB_URL`
- `TRAVELPOINT_JOB_SECRET`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

## Release evidence

Attach evidence to the release issue:

- CI run URL: type-check, lint, API tests, web build and secret scan green.
- `production-smoke.yml` run URL.
- `retention.yml` run URL and `/internal/jobs/retention/status` response.
- Railway deploy URL and `/health` response.
- Supabase migration status screenshot.
- Supabase backup/PITR settings screenshot.
- Sentry alert configuration screenshot.
- EAS production build URL.
- Physical Android smoke-test notes.
- Lighthouse report for `/`, `/map`, `/forum`, `/journal`.
- Accessibility notes for keyboard navigation and contrast.

## Manual mobile smoke test

- install fresh production APK/AAB build
- register
- login
- onboarding
- map tiles
- public spot list
- hidden spot locked/exact behavior
- circle invite and join
- DM and circle transmission
- block/unblock
- photo upload/delete
- journey recording recovery
- push notification tap
- account export
- account delete

## Production no-go conditions

Do not release if any are true:

- `pnpm security:secrets` fails
- `pnpm smoke:production` fails
- `retention.yml` fails
- Railway `/health` returns non-200
- Stripe webhook signature verification is not configured
- R2 upload returns `STORAGE_NOT_CONFIGURED`
- Google Maps key is unrestricted
- Supabase PITR/backups are not enabled or unverified
- no rollback plan exists for the deployed commit
