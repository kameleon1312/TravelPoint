# TravelPoint — Security Audit (2026-10-12)

Companion to [AUDIT_REPORT.md](AUDIT_REPORT.md) (issue IDs `TP-xxx`) and the standing policy in
[SECURITY.md](SECURITY.md). Testing was code review plus unit/route tests with mocked Prisma;
no production system was probed.

## 1. Permission model (reconstructed from code)

| Resource | Read | Write | Enforced in |
|---|---|---|---|
| Spot PUBLIC | any signed-in explorer (exact); anonymous via `/api/spots/public` (500 m fuzz) | owner | `hiddenLayer.ts`, `routes/spots.ts` |
| Spot TRUSTED | rank ≥ TRUSTED exact; others locked pin (1500 m, title/category only) | owner | `hiddenLayer.ts` |
| Spot CIRCLE_ONLY | members of `circleId` only; outsiders get 404 / nothing | owner, must be member of `circleId` | `hiddenLayer.ts`, `POST /api/spots` |
| Spot SECRET_DROP | everyone while `dropExpiresAt > now`; afterwards nobody (incl. owner) | owner, future expiry required | `hiddenLayer.ts` |
| Spot photos / comments / reactions / verifications / save | same as unlocked spot | uploader / author / owner | `requireExactSpotAccess` |
| Circle details | members see members; non-members see circle metadata only | FOUNDER (settings, delete, promote), FOUNDER/GUIDE (kick, invites) | `routes/circles.ts` |
| Circle messages | current members (recipient list computed per message) | members | `transmissions.ts`, `plugins/socket.ts` |
| DMs | sender/recipient; blocked in either direction → 403 | any explorer → any explorer | `transmissions.ts` |
| Journey | owner; non-private → any signed-in explorer **incl. full GPS trail** (TP-022) | owner | `routes/journeys.ts` |
| Home base | owner only, AES-encrypted at rest | owner | `routes/explorers.ts` |
| Presence | explorers ≤ 5 km with presence on, grid-snapped | self (requires both consents) | `plugins/socket.ts` |
| Paid tier | server-owned; changed by Stripe / RevenueCat webhooks or moderators | — | `services/billing.ts`, `services/revenuecat.ts` |

Paid tiers currently gate only circle creation (EXPEDITION) and >25 saves (FREE). See TP-020.

## 2. Findings by category

### Location privacy (highest risk: physical safety)
- **Fixed P0** — averaging attack on fuzzed coordinates (TP-008), presence broadcast/averaging (TP-009), EXIF GPS in public photos/avatars (TP-007), restricted spots announced via signals and creator location leaked via proximity push (TP-004).
- **Fixed P1/P2** — feed exposing TRUSTED spots to low ranks (TP-010), search story oracle (TP-011).
- **Open P1** — public journeys expose exact GPS trails (TP-022); pre-fix photos still contain EXIF (TP-024).
- **Verified OK** — CIRCLE_ONLY spots and their subresources return 404 to outsiders; locked pins never include `story`, `h3Index` or photos; home base encrypted and only returned to its owner; `geo` is not written to logs in the reviewed paths (only spot ids).

### Access control / IDOR
- Fixed: circle injection through arbitrary `circleId` (TP-005).
- Verified: ownership checks on spot PATCH/DELETE, photo delete, comment delete, journey PATCH/DELETE; role checks on circle promote/kick/settings/delete; invite consumption is atomic (`updateMany` with `useCount` guard in a transaction).
- Open: paid features bypassable via API because entitlements are client-side only (TP-020).

### Injection / XSS
- Fixed: stored XSS through JSON-LD on public pages (TP-012).
- Verified: raw SQL in search/spots uses `Prisma.sql` parameters (checked generated SQL in tests).
- Open: journal HTML from moderators rendered unsanitised (TP-029).

### Abuse & availability
- Fixed: per-IP rate limits were effectively global behind the proxy (TP-013); runtime DoS advisories in ws/socket.io/engine.io (TP-014).
- Open: DMs to any explorer (TP-033); spot comments rate-limited only for NEWCOMER.

### Billing integrity
- Fixed: webhook failures swallowed (TP-003); RevenueCat lifecycle errors (TP-002); webhook secret compared in constant time.
- Open: cross-provider downgrade (TP-030); `REVENUECAT` enum must be applied to prod first (TP-023).

### Dependencies & supply chain
- API runtime: 0 high/critical after upgrades (fastify 5.12.5, sharp 0.35.5, socket.io-parser/engine.io/ws/fast-uri patched).
- Tooling: 4 critical (acknowledged in `tools/audit-critical.cjs`, build/dev only) and 63 high remain.
- Declared pnpm overrides were never applied (TP-026).

### Secrets & configuration
- Secret scan passes. The Supabase anon key in `eas.json` is a public client key by design, not a secret. Whether Supabase RLS policies block direct table access with that key was **not audited** (requires the Supabase project) — app data is expected to flow only through the API.
- `env.ts` fails fast in production on missing/weak JWT, encryption and database settings.
- Geo-fuzz offsets are keyed from `ENCRYPTION_KEY`; rotating that key moves all fuzzed pins once (acceptable, but plan rotations).

## 3. Residual risk after this session

| Risk | Level | Why |
|---|---|---|
| Exact home location via public journey trail | High | TP-022 open, needs product decision |
| Paid content accessible without paying | High (revenue) | TP-020 open |
| EXIF in legacy uploads | Medium | TP-024 needs R2 backfill |
| Untested mobile/web flows regress silently | Medium | TP-028 |
| Migration drift between environments | Medium | TP-025 |
