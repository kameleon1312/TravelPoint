# TravelPoint — Deployment Guide

## Infrastructure (MVP)

| Component | Choice | Cost |
|---|---|---|
| Mobile | EAS Build + App/Play Store | $99/yr + $25 one-time |
| Web | Vercel Pro | $20/mo |
| API | Railway / Render | $7–20/mo |
| DB (PostGIS) | Supabase / Neon | $0–25/mo |
| Redis | Upstash | $0–10/mo |
| Storage | Cloudflare R2 | ~$5/mo |
| Google Maps | Google Cloud | $0–200/mo (free tier) |
| Monitoring | Sentry | $0–29/mo |

**Total MVP:** ~$90/month + one-time $124.

## Pre-Deploy Checklist

### Security / Geo-Privacy
- [ ] All .env in secrets manager (NOT in code)
- [ ] JWT secrets ≥256-bit, different per env
- [ ] Separate ENCRYPTION_KEY per env
- [ ] HTTPS only, HSTS active
- [ ] CORS whitelist production domains only
- [ ] Rate limiting on /auth endpoints
- [ ] Hidden layer access SERVER-SIDE ONLY — verified with test
- [ ] Locked spots do NOT leak raw coordinates (test this!)
- [ ] Geo redaction active in logs
- [ ] Location/presence/journey consent: separate, default OFF
- [ ] GitHub `Retention job` workflow succeeds and status endpoint records the run
- [ ] Sentry + audit log for auth and hidden spot access

### Database
- [ ] PostGIS extension enabled: `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] H3 index working
- [ ] Daily backup (rolling 30 days)
- [ ] Point-in-time recovery
- [ ] Connection pooling (PgBouncer)

### App/Play Store
- [ ] Privacy policy + ToS URLs working
- [ ] Location permission rationale (App Store requires justification)
- [ ] All icon sizes, screenshots PL, description PL
- [ ] TestFlight beta (min 100 explorers from target group)

### Web (WORLD)
- [ ] Lighthouse Performance ≥90, SEO meta on each page
- [ ] sitemap.xml + robots.txt
- [ ] OG images per page
- [ ] 404/500 pages designed
- [ ] Cookie banner (RODO)
- [ ] R3F globe lazy-loaded (dynamic import, ssr: false)

### Monitoring
- [ ] Sentry alerting set up
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Log aggregation

### Production hardening
- [ ] `pnpm security:secrets` passes
- [ ] `pnpm gate:production` passes
- [ ] `pnpm smoke:production` passes against deployed API/Web
- [ ] `.github/workflows/production-smoke.yml` passes manually
- [ ] `.github/workflows/retention.yml` passes manually
- [ ] Supabase backup restore drill completed
- [ ] Rollback plan documented for API, web and mobile

## Deployment Commands

### Web (Vercel)
```bash
cd apps/web
vercel --prod
```

### API (Railway)
```bash
# Set env vars in Railway dashboard
railway up
```

### Database migrations
```bash
cd apps/api
pnpm prisma migrate deploy
```

### Production gates
```bash
pnpm security:secrets
pnpm gate:production
TRAVELPOINT_API_URL=https://api.travelpoint.app \
TRAVELPOINT_WEB_URL=https://travelpoint.app \
TRAVELPOINT_JOB_SECRET=<secret> \
pnpm smoke:production
```

### Mobile (EAS)
```bash
cd apps/mobile
eas build --platform all --profile production
eas submit --platform all
```

## Environment Variables per Service

### apps/api
```
DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY,
REDIS_URL, RESEND_API_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET, R2_PUBLIC_URL, JOB_SECRET, EMAIL_FROM, DPO_EMAIL,
NEXT_PUBLIC_APP_URL, LOG_LEVEL, ALLOWED_ORIGINS, PORT,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID,
STRIPE_EXPEDITION_PRICE_ID, BILLING_SUCCESS_URL, BILLING_CANCEL_URL
```

### apps/web
```
NEXT_PUBLIC_API_URL, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SENTRY_DSN,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### apps/mobile
```
EXPO_PUBLIC_API_URL, EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, EXPO_PUBLIC_SENTRY_DSN
```

## Scheduled retention

The API does not rely on an in-process timer. Configure GitHub repository
secrets:

```text
TRAVELPOINT_API_URL=https://api.travelpoint.app
TRAVELPOINT_JOB_SECRET=<same value as Railway JOB_SECRET>
```

Run `.github/workflows/retention.yml` manually once after deployment, then
confirm the daily scheduled run remains green.

## Production runbooks

- `docs/SPRINT_4_PRODUCTION_HARDENING.md`
- `docs/RUNBOOKS.md`
- `docs/BACKUP_RESTORE_DRILL.md`
