# TravelPoint — Audit Report (2026-10-12)

Scope: full repository (apps/api, apps/mobile, apps/web, packages/*, CI, Render config).
Method: direct code reading of every API route and service, targeted reading of mobile/web
screens, baseline checks (install, type-check, lint, tests, builds, dependency audit, secret
scan), GitHub Actions history, and regression tests written for each fixed defect (each new
test was confirmed to FAIL against the previous code before the fix was kept).

Not performed (and therefore not claimed): running the mobile app on a device or simulator,
visual QA of web pages in a browser, end-to-end tests, load tests, any check against the
production database, Render, Supabase or R2.

Related: [SECURITY_AUDIT.md](SECURITY_AUDIT.md) · [REGRESSION_TEST_PLAN.md](REGRESSION_TEST_PLAN.md) ·
[MODERNIZATION_ROADMAP.md](MODERNIZATION_ROADMAP.md) · [CHANGELOG_AUDIT.md](CHANGELOG_AUDIT.md)

---

## 1. Verdict

**CONTINUE DEVELOPMENT.**

The codebase is broad and mostly well structured: server-side access control exists and is
applied consistently on spot subresources, Zod validation is used at most boundaries, secrets
are validated at boot, retention runs daily. The audit nevertheless found **five P0 privacy
defects** (all fixed in this session) that defeated the product's core promise — that exact
locations stay hidden. Store release is blocked by product decisions on paid entitlements,
pricing consistency, missing store configuration, and the absence of any mobile/web tests.

## 2. Baseline results

| Check | Before audit | After audit |
|---|---|---|
| `pnpm install --frozen-lockfile` | **FAIL** (lockfile out of sync after RevenueCat commit) | PASS |
| Type-check (7 projects) | FAIL (mobile) | PASS |
| Lint (api, web, mobile) | FAIL (mobile) | PASS |
| API tests | 32 passed / 12 files | **58 passed / 16 files** |
| Mobile tests | none exist | none exist |
| Web tests | none exist | none exist |
| API build (`tsc`) | PASS | PASS |
| Web production build | not run | PASS (33/33 pages) |
| Mobile release config check | PASS | PASS |
| Critical advisories (CI gate) | 4, acknowledged (build tooling) | 4, acknowledged |
| High advisories in API **runtime** deps | 6 packages (fastify, sharp, socket.io-parser, engine.io, ws, fast-uri) | **0** |
| High advisories total (mostly Expo/eslint/vitest tooling) | 82 | 63 |
| Secret scan | PASS | PASS |
| Retention workflow (GitHub Actions) | succeeded, but against the old Railway host (TRAVELPOINT_API_URL); failed from 2026-10-16 once Railway was removed | fixed 2026-10-19: secret points to Render, manual run OK |

## 3. Completion estimate

A file count says little; this estimate weighs what is implemented, what is evidenced, and
what blocks a paid store release.

| Dimension | Assessment | Basis |
|---|---|---|
| Feature implementation (planned scope) | High — roughly 85–90 % | All planned API route groups, ~30 mobile screens, ~33 web pages exist |
| Verified behaviour | Low — roughly 25 % | Automated evidence only for API access control, geo privacy, billing event mapping, invites, encryption, storage; nothing for mobile/web flows |
| Security & privacy | Medium after fixes | 5 P0 + 5 P1 fixed; entitlement model (TP-020) and journey GPS (TP-022) open |
| Production / store readiness | Low — roughly 20 % | No iOS build profile, no store products/RevenueCat config, no APNs, no store assets, no versioned migrations |

## 4. Architecture map (as found)

```
mobile (Expo 54 / RN 0.81) ─┐                      ┌─ Supabase Auth (JWT, sign-up/login)
web (Next.js 15, Vercel) ───┼─ HTTPS / Socket.IO ──┤
                            │                      └─ API (Fastify 5, Render free plan)
                            │                            ├─ Prisma 5 → Supabase PostgreSQL (+ optional PostGIS)
                            │                            ├─ Cloudflare R2 (photos, avatars; presigned PUT)
                            │                            ├─ Resend (email) · Expo Push · Stripe (web) · RevenueCat (mobile)
                            │                            └─ Redis (optional: rate-limit store, socket adapter)
GitHub Actions: CI (types, lint, API tests, web build, secret scan), Security (critical audit),
                daily Retention job → POST /internal/jobs/retention (x-job-secret)
```

Access control lives in `apps/api/src/services/hiddenLayer.ts` (spots) and per-route checks
(circle membership, ownership, blocks). Coordinate obfuscation now lives in
`apps/api/src/services/geoPrivacy.ts`.

## 5. Feature verification status

| Area | Status | Evidence |
|---|---|---|
| Spot access levels (PUBLIC/TRUSTED/CIRCLE_ONLY/SECRET_DROP) | VERIFIED (unit) | `hiddenLayer.test.ts` |
| Spot subresources gated (photos, comments, reactions, verify, save) | PARTIALLY VERIFIED | code review of every handler + `spots.test.ts` (photos) |
| Spot creation rules & signal scoping | VERIFIED (route) | `spots.create.test.ts` |
| Coordinate obfuscation & presence | VERIFIED (unit) | `geoPrivacy.test.ts`, `hiddenLayer.test.ts` |
| Photo/avatar EXIF stripping | VERIFIED (unit) | `storage.test.ts` |
| Search privacy | VERIFIED (SQL-level) | `search.test.ts` |
| Circle invites / join | PARTIALLY VERIFIED | `circles.test.ts`, `inviteCodes.test.ts` |
| Circle kick revokes realtime access | PARTIALLY VERIFIED | code review: messages go to per-explorer rooms computed at send time |
| Home base encryption | VERIFIED (route) | `explorers.test.ts` |
| RevenueCat event mapping | VERIFIED (unit) | `revenuecat.test.ts` |
| RevenueCat purchase flow on device | BLOCKED | needs RevenueCat project, store products, device build |
| Stripe checkout / webhook | IMPLEMENTED, UNVERIFIED | no Stripe keys configured; no tests |
| Sign-up / login / password reset | IMPLEMENTED, UNVERIFIED | Supabase-backed; no tests |
| Feed, transmissions, signals, forum, journal | IMPLEMENTED, UNVERIFIED | code review only |
| RODO export / account deletion | PARTIALLY VERIFIED | retention job runs daily against Render since 2026-10-19 (manual run: status ok) |
| Mobile screens & navigation | IMPLEMENTED, UNVERIFIED | type-check + lint only |
| Web pages | IMPLEMENTED, UNVERIFIED | production build only, no visual QA |

## 6. Issue register

Priorities: P0 critical · P1 high · P2 medium · P3 low. Status: FIXED / OPEN / DECISION (needs
product owner) / BLOCKED (needs access or configuration outside the repo).

### Fixed in this session

| ID | P | Area | Problem (evidence) | Fix | Verification |
|---|---|---|---|---|---|
| TP-001 | P0 | Build | `react-native-purchases` added to mobile `package.json` without lockfile update → `--frozen-lockfile` fails in CI and on Render (`ERR_PNPM_OUTDATED_LOCKFILE`) | Lockfile synced, version ^10.12.2 | frozen install passes |
| TP-004 | P0 | Privacy | `POST /api/spots` sent `NEARBY_SPOT` (title, category) to all members of all the creator's circles and to every online explorer within 5 km, for CIRCLE_ONLY and TRUSTED spots too; the 5 km push also revealed the creator's live area | Signals only to explorers entitled to the unlocked spot; proximity push only for PUBLIC | `spots.create.test.ts` (fails on old code) |
| TP-007 | P0 | Privacy | `finalizePhoto` served the client-uploaded original unchanged from the public bucket — phone EXIF incl. GPS exposed, also for public avatars | Original re-encoded with sharp (metadata dropped) and overwritten | `storage.test.ts` |
| TP-008 | P0 | Privacy | Fuzz offset re-randomised per request for locked spots (1500 m) and per day for public pins, centred on the true point → averaging recovers exact coordinates; three different seeds per spot across endpoints | Stable secret-keyed offset per spot and radius (`geoPrivacy.ts`) everywhere | `geoPrivacy.test.ts`, `hiddenLayer.test.ts` |
| TP-009 | P0 | Privacy | Presence broadcast to every presence-enabled explorer worldwide (room is global) with a fresh random offset per update → stationary explorers locatable; NEARBY signals created for every pair regardless of distance | Grid snap with secret per-explorer origin; send only within 5 km | `geoPrivacy.test.ts` (unit); socket path code-reviewed |
| TP-002 | P1 | Billing | RevenueCat `CANCELLATION`/`BILLING_ISSUE` revoked paid access immediately; `TRANSFER` could grant the wrong explorer; first, not highest, entitlement used | Revoke only on `EXPIRATION`; ignore transfer/anonymous; highest tier wins | `revenuecat.test.ts` |
| TP-003 | P1 | Billing | Stripe and RevenueCat webhooks returned 204 even when processing failed → provider never retries, paid tier silently lost | Return 500 on failure | code review |
| TP-005 | P1 | Privacy | Spot could be created with any `circleId` → content injected into circles the creator is not in | Membership required | `spots.create.test.ts` |
| TP-011 | P1 | Privacy | Search matched `story` of locked TRUSTED/SECRET_DROP spots → boolean oracle on restricted text; expired drops searchable | Story match only on unlockable levels; expired drops excluded | `search.test.ts` (fails on old code) |
| TP-012 | P1 | Web XSS | JSON-LD built with `JSON.stringify` on explorer/spot/forum text inside `<script>` → `</script>` breakout (stored XSS on public pages) | `serializeJsonLd` escaping < > & U+2028/9 | manual payload check; web build |
| TP-013 | P1 | Ops/Sec | No `trustProxy` → behind Render every request had the proxy IP; per-IP limits (5 signups/15 min) acted globally | Trust `TRUST_PROXY_HOPS` (default 1) hops via function (fastify 5.12 ignores numeric form) | runtime check: spoofed XFF ignored |
| TP-014 | P1 | Deps | High advisories in API runtime: fastify (auth/validation bypass), sharp (libvips/libheif CVEs on untrusted uploads), socket.io-parser, engine.io, ws, fast-uri | Upgraded within major versions | audit: 0 runtime high/critical; 58 tests pass |
| TP-006 | P2 | Data | CIRCLE_ONLY without circle and SECRET_DROP without future expiry accepted → spot invisible even to its owner | Validated on create and on PATCH transitions | `spots.create.test.ts` |
| TP-010 | P2 | Privacy | Feed returned TRUSTED spots to all circlemates (500 m fuzz — more precise than the 1500 m locked pin) | TRUSTED only for TRUSTED+ rank | code review |
| TP-016 | P2 | Store | Hardcoded "7 dni gratis · bez karty" / "Zacznij za darmo" — untrue with store billing unless an intro offer exists | Trial copy driven by store intro offer | type-check |
| TP-015 | P3 | API | `PATCH /api/circles/:slug` passed raw body to Prisma (oversized values → 500) | Shared `UpdateCircleSchema` | type-check, tests |

### Open

| ID | P | Area | Problem (evidence) | Recommendation | Status |
|---|---|---|---|---|---|
| TP-020 | P1 | Monetisation / access | Paid entitlements were client-side only (TRUSTED by rank, secret drops for everyone, FREE journey limit unenforced) | **Decision: plan-based.** TRUSTED = PRO+, secret drops = EXPEDITION, FREE 3 journeys; enforced in hiddenLayer, feed, search, spot creation, journeys (`6287e7b`, `fdfe4ef`) | FIXED |
| TP-021 | P1 | Monetisation | Prices differed: landing 29 / 79 zł vs app 49 / 149 zł | **Decision: 29 / 79 zł.** App fallback prices aligned (annual fallback 23 / 63 = −20 %); real prices must be set identically in App Store Connect, Play Console and Stripe (`27b5371`) | FIXED |
| TP-022 | P1 | Privacy | Public journeys exposed the exact GPS trail (incl. home) to any explorer, incl. blocked | **Decision: privacy zones.** Non-authors get the trail minus first/last ~500 m; hidden across blocks (`fdfe4ef`) | FIXED |
| TP-023 | P1 | DB | `REVENUECAT` enum value must exist in prod before the RevenueCat webhook is enabled | Apply `supabase/2026-10-12-revenuecat-billing-provider.sql` | BLOCKED (prod access) |
| TP-024 | P1 | Privacy | Photos/avatars uploaded before TP-007 still carry EXIF in R2 | One-off backfill job re-encoding existing objects | BLOCKED (R2 access) |
| TP-037 | P1 | Store | No iOS build profile, APNs key, RevenueCat project/products, store listings, privacy labels | See roadmap Sprint 5 | BLOCKED (accounts) |
| TP-025 | P2 | DB / CI | Prisma migrations folder deleted; schema applied by `db push`; CI "Migration drift check" points at the missing folder and is `continue-on-error` (always fails silently) | Re-baseline migrations (`migrate diff` from prod) and make the check blocking | OPEN |
| TP-026 | P2 | Deps | `pnpm.overrides` / `auditConfig` in root `package.json` are ignored by pnpm 11 (lockfile has no `overrides:`) — the 12 declared security pins never applied. Some are incompatible (`rollup ^3` vs vite 6) | Move reviewed, compatible overrides to `pnpm-workspace.yaml` one by one | OPEN |
| TP-027 | P2 | Deps | 63 high advisories remain in build/dev tooling (Expo CLI, eslint, vitest) | Track Expo SDK updates; not runtime-exposed | OPEN |
| TP-028 | P2 | QA | Zero tests in mobile and web; no E2E | Add vitest to web (pure libs first), Jest/RNTL or Maestro flows for mobile | OPEN |
| TP-029 | P2 | Web | Journal `bodyMdx` rendered as raw HTML: Markdown is not rendered and moderator input is not sanitised | Markdown renderer + sanitizer (new dependency — needs approval) | OPEN |
| TP-030 | P2 | Billing | Stripe cancellation downgrades to FREE even with an active RevenueCat subscription (RevenueCat side handled); an explorer can hold both and pay twice | Shared "effective tier" from all active subscriptions | OPEN |
| TP-031 | P2 | Scale | `presenceStore` is in-process memory; with more than one API instance presence and proximity checks break | Move to Redis (adapter already present) before scaling out | OPEN |
| TP-036 | P3 | Mobile | After purchase, `billing/status` refreshes but `explorer.tier` in the auth store (used by other screens) stays stale until profile reload | Refresh explorer profile after webhook settles | OPEN |
| TP-032 | P3 | Privacy | `GET /api/circles` lists invite-only circles (name, description, member count) to every explorer | Confirm discoverability is intended | DECISION |
| TP-033 | P3 | Abuse | DMs can be sent to any explorer, 30/min; no circle/relationship requirement | Consider "message requests" or circle-only DMs | DECISION |
| TP-034 | P3 | Hygiene | CI web build uses old Railway API URL; Railway keep-alive code in `server.ts`; `SECURITY.md` describes Argon2id/refresh rotation while auth is Supabase | Clean up | OPEN |
| TP-035 | P3 | API | Spot comment body validated ad hoc (not shared Zod); comments list doesn't hide blocked explorers | Shared schema + block filter | OPEN |
| TP-038 | P3 | Privacy | Presigned upload URL stays valid 5 min, so a client can re-upload its own original after finalisation (self-only exposure) | Finalise into a new key / shorter TTL | OPEN |
| TP-039 | P1 | Store / copy | Plan feature lists disagree between web billing, landing, app plans and paywall, and some promises have no implementation ("Explorer rank booster ×1.5", "Priorytetowy ranking wyszukiwania", "Circle founder bez limitu" vs "do 5" — the 5-circle cap is not enforced either). Inaccurate in-app purchase descriptions risk App Store rejection (guideline 2.3) | One feature list in a shared package; remove or implement unbacked promises | DECISION |
| TP-040 | P1 | RODO / Ops | Retention job (90-day GPS route expiry, 30-day account purge) never ran against Render: GitHub secret TRAVELPOINT_API_URL still pointed at the removed Railway app ("Application not found"); the audit wrongly read earlier green runs as production evidence | Secret updated to Render, CI web build URL fixed; manual run verified | FIXED |
