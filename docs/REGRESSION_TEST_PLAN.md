# TravelPoint — Regression Test Plan (2026-10-12)

## 1. Current automated coverage

Runner: vitest in `apps/api` only (`pnpm --filter @travelpoint/api test`, also in CI).
58 tests / 16 files, all passing. Mobile and web have **no tests** (TP-028).

| Suite | Protects |
|---|---|
| `services/hiddenLayer.test.ts` | Access levels, CIRCLE_ONLY invisibility, expired drops, stable locked pins |
| `services/geoPrivacy.test.ts` | Stable fuzz per spot/radius, no cross-radius recovery, presence grid, 5 km range |
| `routes/spots.create.test.ts` | Circle membership on create, CIRCLE_ONLY/SECRET_DROP validation, signals only to entitled explorers |
| `routes/spots.test.ts` | Outsider cannot read CIRCLE_ONLY photos |
| `routes/search.test.ts` | No story matching on locked spots, expired drops excluded (SQL-level) |
| `services/storage.test.ts` | Upload validation, EXIF/GPS stripped for JPEG/WebP/PNG |
| `services/revenuecat.test.ts` | Grant/keep/revoke rules, sandbox, anonymous ids, transfer |
| `routes/circles.test.ts`, `services/inviteCodes.test.ts`, `services/circleAccess.test.ts` | Invite scoping and consumption, membership checks |
| `routes/explorers.test.ts` | Home base encrypted at rest |
| `services/blockAccess.test.ts`, `plugins/socket.test.ts` | Blocks, socket circle-room join |
| `config/env.test.ts`, `lib/db.test.ts` | Fail-fast production config, proxy hops, DB URL |
| `services/trustScore.test.ts` | Rank thresholds |

Rule kept in this audit: a regression test is accepted only if it fails against the code
before the fix.

## 2. Critical flows to cover next (priority order)

| # | Flow | Level | Key assertions |
|---|---|---|---|
| 1 | Paid entitlement enforcement (after TP-020 decision) | API route | FREE cannot read/create gated content via API; tier change takes effect immediately |
| 2 | Journey visibility | API route | private journey 404/403 for others; blocked explorer denied; route trimmed for non-owners (after TP-022) |
| 3 | Stripe webhook | API route | signature required; replay window; failure → 500; tier set/downgraded; no downgrade over active RevenueCat sub (TP-030) |
| 4 | Circle lifecycle | API route | kick/leave removes access to CIRCLE_ONLY spots, messages history and future signals; founder cannot leave non-empty circle |
| 5 | Feed | API route | blocked explorers excluded; TRUSTED gated by rank; pagination cursor |
| 6 | Transmissions | API route | blocked both ways; circle non-member 403; read receipts only for recipient |
| 7 | RODO | API route | export contains only own data; deletion anonymises and schedules purge; retention purges after `purgeAt` |
| 8 | Sign-up / login | Mobile E2E (Maestro) | handle validation, invite code, consent checkboxes, session persisted in SecureStore |
| 9 | Create spot (all access levels) | Mobile E2E | circle picker required for CIRCLE_ONLY; drop expiry required |
| 10 | Purchase & restore | Device (TestFlight / Play internal) | sandbox purchase → tier within seconds; cancel shows no error; restore |
| 11 | Public web pages | Web (Playwright) | JSON-LD contains no raw `<`; spot/explorer pages show fuzzed coords only |

## 3. Manual checks before each release

- Android and iOS: sign-up, onboarding, map with location denied/allowed, create spot, open locked spot, join circle by code, send circle message, background/foreground (biometric lock), offline then reconnect.
- Web at 393 px and desktop: landing, map, spot, explorer, forum, download page APK link.
- Verify no exact coordinates in network responses for locked spots (inspect `/api/spots`, `/api/spots/:id`, `/api/feed`, `/api/search`).

## 4. Known verification limits

No device/simulator runs, no browser-based visual QA, no E2E, no load tests and no checks
against production services were performed in this audit.
