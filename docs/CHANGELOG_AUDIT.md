# TravelPoint — Audit Changelog

## 2026-10-12

All commits are local on `main` (not pushed). Each was verified with API type-check, lint and
tests; web changes additionally with `next build`; mobile changes with type-check, lint and
`config:check`.

| Commit | Issues | Change |
|---|---|---|
| `351bd6f` | — | RevenueCat integration for iOS/Android in-app purchases (made earlier this session; defects below) |
| `5e88985` | TP-001, TP-002, TP-003, TP-016 | Lockfile synced (`react-native-purchases` ^10.12.2); RevenueCat lifecycle fixed (revoke only on EXPIRATION, ignore TRANSFER/anonymous, highest tier); Stripe + RevenueCat webhooks return 500 on failure; cancelled-purchase detection fixed; trial copy driven by store offers; "manage subscription" routed by provider; unused client entitlement helpers removed; idempotent SQL for `REVENUECAT` enum; 9 tests |
| `6c7b8cb` | TP-004, TP-005, TP-006 | Spot signals only to entitled explorers; proximity push only for PUBLIC; circle membership required for `circleId`; CIRCLE_ONLY/SECRET_DROP validation on create and PATCH; 3 route tests |
| `9d4c575` | TP-007 | Uploaded originals re-encoded to strip EXIF/GPS (photos and avatars); 3 tests |
| `863e535` | TP-008, TP-009, TP-010 | `services/geoPrivacy.ts`: stable secret-keyed spot fuzz, presence grid snapping; presence limited to 5 km; feed TRUSTED gated by rank; 7 tests |
| `22821a9` | TP-015 | `UpdateCircleSchema` in `@travelpoint/validation`, used by `PATCH /api/circles/:slug` |
| `ee64afb` | TP-011 | Search: no story matching on locked spots, expired drops hidden; 3 SQL-level tests |
| `cd6cbf1` | TP-012 | `serializeJsonLd` for JSON-LD on explorer, spot, forum, journal pages |
| `cab6f68` | TP-013 | `TRUST_PROXY_HOPS` (default 1 in production) |
| `7404c2a` | TP-013, TP-014 | fastify 5.12.5, sharp 0.35.5, patched socket.io-parser/engine.io/ws/fast-uri; trustProxy as hop function (fastify 5.12 ignores numbers); `render.yaml` declares JOB_SECRET, SENTRY_DSN, Stripe, TRUST_PROXY_HOPS |
| (docs) | — | `AUDIT_REPORT.md`, `SECURITY_AUDIT.md`, `REGRESSION_TEST_PLAN.md`, `MODERNIZATION_ROADMAP.md`, this file, `PROJECT_STATE_2026-10-12.md`; `SECURITY.md` and `HIDDEN_LAYER.md` updated for the new fuzzing rules |

### Behaviour changes to be aware of
- Public map pins no longer shift daily; each spot has one stable fuzzed position (moves once if `ENCRYPTION_KEY` is rotated).
- Live presence positions are snapped to a ~1 km grid and only reach explorers within 5 km.
- Spot creation now returns 400/403 for CIRCLE_ONLY without a circle, foreign `circleId`, or SECRET_DROP without a future expiry (the mobile form already enforced this).
- Webhook processing errors now return 500 (providers retry) instead of 204.

### Operational follow-ups (not done — require access)
1. Run `supabase/2026-10-12-revenuecat-billing-provider.sql` on production before enabling the RevenueCat webhook.
2. Set `REVENUECAT_WEBHOOK_SECRET` (and optionally `TRUST_PROXY_HOPS`) on Render.
3. Backfill EXIF stripping for photos/avatars uploaded before `9d4c575`.
4. Push after review; per project practice, check web changes on localhost first.
