# Sprint 1/2 completion runbook

This file tracks the external data required to close Sprint 1 and Sprint 2
operationally. Do not paste real secrets into tracked files. Store them in
Railway, EAS, GitHub Secrets and local `.env` only.

## Data to provide

### Google Maps / EAS

- `EXPO_PUBLIC_API_URL`
  - Current production API URL: `https://travelpointapi-production.up.railway.app`
  - Required in EAS `preview` and `production`.
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
  - Must start with `AIza`.
  - Required in EAS `preview` and `production`.
  - Production restriction target:
    - Android package: `io.travelpoint.app`
    - SHA-1: use the current EAS Android signing certificate SHA-1
    - API restriction: `Maps SDK for Android`

### Railway API runtime

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `ALLOWED_ORIGINS`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `JOB_SECRET`

Optional but recommended before real user testing:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `DPO_EMAIL`
- `SENTRY_DSN`

### GitHub Secrets

- `TRAVELPOINT_API_URL`
  - Use the same HTTPS API base URL as mobile.
- `TRAVELPOINT_JOB_SECRET`
  - Must equal Railway `JOB_SECRET`.
- `NEXT_PUBLIC_MAPBOX_TOKEN`
  - Required for production web map builds.
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

## Where to configure

### EAS preview

```powershell
cd apps/mobile
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://travelpointapi-production.up.railway.app
eas env:create --environment preview --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <google maps api key>
```

Choose `Sensitive` for the Google Maps key.

### EAS production

```powershell
cd apps/mobile
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://travelpointapi-production.up.railway.app
eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <google maps api key>
```

Choose `Sensitive` for the Google Maps key.

### Railway

Configure the Railway service variables from the Railway dashboard. Do not set
`PORT` manually; Railway injects it.

Required minimum for API boot:

```text
NODE_ENV=production
DATABASE_URL=<supabase pooled runtime url>
DIRECT_URL=<supabase direct url>
JWT_ACCESS_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars and different from access secret>
ENCRYPTION_KEY=<base64 encoded 32 bytes>
ALLOWED_ORIGINS=https://travelpointapi-production.up.railway.app
```

Required for Sprint 2 photo storage and retention:

```text
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key id>
R2_SECRET_ACCESS_KEY=<r2 secret access key>
R2_BUCKET=travelpoint-media
R2_PUBLIC_URL=<https public r2/custom-domain url>
JOB_SECRET=<same 32+ char value as GitHub TRAVELPOINT_JOB_SECRET>
```

### Local gate `.env`

Root `.env` is ignored by git. Add the operational gate values locally:

```text
EXPO_PUBLIC_API_URL=https://travelpointapi-production.up.railway.app
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<google maps api key>
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key id>
R2_SECRET_ACCESS_KEY=<r2 secret access key>
R2_BUCKET=travelpoint-media
R2_PUBLIC_URL=<https public r2/custom-domain url>
JOB_SECRET=<32+ chars>
```

## Verification

Run:

```powershell
pnpm.cmd --filter @travelpoint/api test
pnpm.cmd --filter @travelpoint/mobile lint
pnpm.cmd --filter @travelpoint/mobile type-check
pnpm.cmd --filter @travelpoint/mobile config:check
pnpm.cmd gate:pre-sprint3
```

Then smoke test the deployed API:

```powershell
$env:TRAVELPOINT_API_URL='https://travelpointapi-production.up.railway.app'
$env:TRAVELPOINT_JOB_SECRET='<same value as JOB_SECRET>'
pnpm.cmd smoke:preview
```

Final manual checks on a physical Android preview APK:

- registration
- login
- map tiles
- hidden spots access
- circle invite and join
- blocking
- photo upload and delete
- journey recording recovery
- push notification
- account export
- account delete
