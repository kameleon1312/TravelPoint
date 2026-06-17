# Pre-Sprint 3 gate

This gate separates repository completion from external account configuration.
Sprint 3 must not start until every item below is verified on the preview
environment.

## Automated repository checks

```powershell
pnpm.cmd --filter @travelpoint/api test
pnpm.cmd --filter @travelpoint/api type-check
pnpm.cmd --filter @travelpoint/web type-check
pnpm.cmd --filter @travelpoint/mobile type-check
pnpm.cmd --filter @travelpoint/api lint
pnpm.cmd --filter @travelpoint/web lint
pnpm.cmd --filter @travelpoint/mobile lint
pnpm.cmd --filter @travelpoint/web build
pnpm.cmd --filter @travelpoint/mobile config:check
pnpm.cmd gate:pre-sprint3
pnpm.cmd smoke:preview
```

The last command intentionally fails while `.env` contains placeholders or
missing preview configuration.

Run the smoke test with:

```powershell
$env:TRAVELPOINT_API_URL='https://api-preview.example.com'
$env:TRAVELPOINT_JOB_SECRET='<preview job secret>'
pnpm.cmd smoke:preview
```

## External configuration

- [ ] Rotate the historical Google Maps key.
- [ ] Restrict the replacement key to Android package `io.travelpoint.app`,
      the EAS signing SHA-1 and `Maps SDK for Android`.
- [ ] Confirm the historical key is rejected by Google web-service APIs.
- [ ] Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and HTTPS
      `EXPO_PUBLIC_API_URL` in EAS preview and production environments.
- [ ] Create the private Cloudflare R2 bucket and scoped API credentials.
- [ ] Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
      `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and HTTPS `R2_PUBLIC_URL` in Railway.
- [ ] Configure the same 32+ character `JOB_SECRET` in Railway and GitHub
      secret `TRAVELPOINT_JOB_SECRET`.
- [ ] Set GitHub secret `TRAVELPOINT_API_URL` to the HTTPS API base URL.
- [ ] Run the `Retention job` workflow manually and verify
      `/internal/jobs/retention/status`.
- [ ] Build an EAS preview APK and test background journey recording on a
      physical Android device.
- [ ] Smoke-test registration, login, map, hidden spots, circles, blocking,
      photo upload/delete, journey recovery, push and account export/delete.

## Acceptance evidence

Record links or screenshots for:

1. Google key restrictions and disabled historical key.
2. Successful preview APK build.
3. Successful R2 upload, thumbnail and deletion.
4. Successful scheduled retention workflow.
5. Railway health check and Sentry event.
6. Closed-MVP smoke-test result.
