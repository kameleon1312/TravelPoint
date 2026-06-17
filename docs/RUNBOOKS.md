# TravelPoint runbooks

## API outage

1. Check Railway deployment status and latest logs.
2. Hit `/health`.
3. If logs show env validation failure, fix Railway variable and redeploy.
4. If DB connection fails, check Supabase status and connection pooler.
5. Roll back Railway to the last green deployment if the outage started after a deploy.
6. Create a Sentry issue note with timeline and resolution.

## Database migration failure

1. Stop the release.
2. Do not run another migration until the failed state is understood.
3. Run `pnpm --filter @travelpoint/api db:generate` locally to confirm Prisma schema validity.
4. Check Supabase migration history.
5. If migration partially applied, write a forward-only repair migration.
6. Run `pnpm smoke:production` after repair.

## Stripe webhook failure

1. Check Stripe dashboard webhook deliveries.
2. Confirm endpoint: `/api/billing/webhook`.
3. Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint signing secret.
4. Replay failed events from Stripe.
5. Verify user tier changed and a `TierEvent` was created.

## R2 upload failure

1. Confirm Railway variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
2. Confirm bucket exists and token has object read/write permissions.
3. Confirm `R2_PUBLIC_URL` uses HTTPS and resolves publicly.
4. Retry upload and delete.

## Google Maps failure

1. Confirm EAS env `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` exists for the build profile.
2. Confirm Google Cloud has `Maps SDK for Android` enabled.
3. Confirm Android restriction uses package `io.travelpoint.app`.
4. Confirm SHA-1 matches the EAS signing certificate for that build profile.
5. Rebuild APK if the key changed after the build.

## Secret leak

1. Remove leaked secret from code/history where possible.
2. Rotate the secret in the provider immediately.
3. Redeploy services with the new value.
4. Revoke affected sessions if JWT/session material leaked.
5. Record incident impact and timeline.
6. If personal data may be affected, follow RODO breach reporting within 72h.

## Rollback

1. Identify last green commit/build.
2. Roll back Railway deployment.
3. Roll back Vercel deployment.
4. If mobile release is affected, stop rollout in Play Console/App Store Connect.
5. Never roll back a database by deleting migrations in production. Use a forward
   repair migration.
