# TravelPoint — Project State (2026-10-12)

> Supersedes `PROJECT_STATE_2026-10-08.md`, which overstated verification ("no active bugs",
> "security ✅") and invented per-layer percentages. Statuses below are evidence-based:
> VERIFIED = covered by a passing automated test; everything else says what is missing.
> Details: [AUDIT_REPORT.md](AUDIT_REPORT.md) · [SECURITY_AUDIT.md](SECURITY_AUDIT.md) ·
> [MODERNIZATION_ROADMAP.md](MODERNIZATION_ROADMAP.md).

**Recommendation: CONTINUE DEVELOPMENT** — not yet ready for acceptance testing or store release.

## 1. Stack (verified in repo)

| Part | Tech | Hosting |
|---|---|---|
| CORE `apps/mobile` | Expo 54, React Native 0.81.5, Expo Router 6, TanStack Query 5, Zustand, Reanimated 4, react-native-maps (Google), Supabase JS, RevenueCat (`react-native-purchases` 10) | EAS; Android APK via GitHub Releases (`/download`) |
| WORLD `apps/web` | Next.js 15, React 19, Tailwind, Google Maps, Sentry | Vercel |
| ENGINE `apps/api` | Fastify 5.12, Prisma 5 (PostgreSQL / optional PostGIS), Socket.IO 4, sharp 0.35, Stripe (raw API), Resend, Expo Push | Render (free plan) |
| Data | Supabase PostgreSQL + Auth; Cloudflare R2 media; optional Redis | — |
| Packages | `theme`, `types`, `validation` (shared Zod), `geo`, `utils`, `api-client` | — |
| CI | GitHub Actions: type-check, lint, API tests, web build, secret scan, critical-audit gate, daily retention job (passing in prod) | — |

Schema is applied with `prisma db push` / SQL files in `supabase/`; there is no migrations
folder (TP-025). Pending SQL: `supabase/2026-10-12-revenuecat-billing-provider.sql`.

## 2. Feature inventory

| Feature | Code | Evidence |
|---|---|---|
| Hidden Layer (4 access levels, locked pins, audit log) | complete | VERIFIED |
| Geo privacy (stable fuzz, presence grid ≤5 km, EXIF stripping) | complete | VERIFIED |
| Spots: CRUD, photos (R2 presigned), reactions, verifications, comments, saves | complete | access control VERIFIED; flows unverified |
| Search (spots/explorers/journeys, pg_trgm with ILIKE fallback) | complete | privacy VERIFIED |
| Circles: create (EXPEDITION), invites (atomic), join/leave, roles, kick | complete | invites VERIFIED; rest code-reviewed |
| Transmissions (DMs, circle chat via REST + socket), signals, push routing (11 types) | complete | code-reviewed |
| Journeys with GPS route, 90-day route retention | complete | unverified; full trail exposed to others (TP-022) |
| Feed, forum, journal, analytics, moderation & reports, RODO export/deletion | complete | code-reviewed |
| Billing web (Stripe) | complete | unverified, keys not configured |
| Billing mobile (RevenueCat) | code complete | event mapping VERIFIED; store/RevenueCat config missing |
| Mobile app (~30 screens: auth, 3-step onboarding, 5 tabs, details, modals, forum) | complete | type-check/lint only, no tests |
| Web WORLD (~33 pages incl. landing, map, spot, explorer, forum, journal, download, billing, legal, admin) | complete | production build only |

## 3. Open problems that matter most

1. **TP-020** Paid entitlements are client-side only; marketing and server rules disagree (decision needed).
2. **TP-021** Prices differ between landing (29/79 zł) and app (49/149 zł).
3. **TP-022** Public journeys expose exact GPS trails incl. home start/end.
4. **TP-023/024** Apply RevenueCat enum SQL; backfill EXIF on legacy uploads.
5. **TP-028** No mobile/web tests; **TP-025** no versioned migrations; **TP-026** pnpm overrides ignored.
6. **TP-037** Store pipeline: iOS EAS profile, APNs, RevenueCat products, listings, privacy labels.

## 4. Rules learned in this audit (keep them)

- Never re-randomise fuzz per request/session/day — use `services/geoPrivacy.ts` (`fuzzSpotCoordinates`, `snapPresence`).
- Anything that carries spot title/story/coords (signals, push, feed, search, socket) must apply the same entitlement as `hiddenLayer`.
- User text inside `<script>` (JSON-LD) must go through `serializeJsonLd`.
- Uploaded media must pass through `finalizePhoto` (strips metadata) before any URL is stored.
- Webhooks must return non-2xx on processing failure so providers retry.
- pnpm 11 ignores the `pnpm` field in `package.json`; workspace settings belong in `pnpm-workspace.yaml`.
- Fastify ≥5.12 ignores numeric `trustProxy`; use the hop function in `server.ts`.
- A regression test is only accepted if it fails on the pre-fix code.
