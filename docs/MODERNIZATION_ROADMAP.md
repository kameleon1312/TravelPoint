# TravelPoint — Modernization Roadmap (2026-10-12)

Ordered by risk to explorers and to revenue. Issue IDs refer to [AUDIT_REPORT.md](AUDIT_REPORT.md).
Sprints 0–1 security work was completed in this session (see [CHANGELOG_AUDIT.md](CHANGELOG_AUDIT.md)).

## Decisions needed from the product owner first

| Decision | Options | Blocks |
|---|---|---|
| Paid entitlement model (TP-020) | (a) rank-only (current code), (b) tier-only, (c) rank AND tier per access level | Sprint 2, store release |
| Single price list (TP-021) | Landing 29/79 zł vs app 49/149 zł | Store products, landing copy |
| Journey route privacy (TP-022) | Trim start/end ~500 m for non-owners (recommended), fuzz whole trail, or owner-only routes | Sprint 2 |
| Circle discoverability (TP-032) | Keep invite-only circles listed vs hide | — |
| DM policy (TP-033) | Open DMs vs circle-only vs message requests | — |
| Journal rendering (TP-029) | Approve a Markdown renderer + sanitizer dependency | — |

## Sprint 2 — Enforce the business rules server-side (P1)
- Implement the chosen entitlement model in `services/hiddenLayer.ts` and route guards (journeys limit, drops, trusted spots); add route tests for each paid rule.
- Journey privacy zones + block checks in `routes/journeys.ts`.
- Shared "effective tier" across Stripe and RevenueCat (TP-030).
- Acceptance: every paid feature returns 403 for FREE via direct API calls; tests fail on old code.

## Sprint 3 — Data & integrations (P1–P2)
- Apply `supabase/2026-10-12-revenuecat-billing-provider.sql` to production (TP-023) before enabling the RevenueCat webhook.
- R2 backfill re-encoding pre-fix photos and avatars (TP-024); dry-run on a copy first.
- Re-baseline Prisma migrations from production (`prisma migrate diff`), restore the folder, make the CI drift check blocking (TP-025).
- Move reviewed pnpm overrides to `pnpm-workspace.yaml` one at a time (TP-026); drop incompatible ones (`rollup ^3`).
- Acceptance: fresh database built from migrations equals production schema; frozen install applies overrides.

## Sprint 4 — Test foundation (P2)
- Web: vitest for `src/lib/*` (start with `jsonLd.ts`), Playwright smoke for public pages.
- Mobile: Jest + React Native Testing Library for hooks (`usePurchases`, `useBilling`), Maestro flows for sign-up, create spot, join circle.
- Add API route tests from [REGRESSION_TEST_PLAN.md](REGRESSION_TEST_PLAN.md) flows 2–7.
- Acceptance: CI runs all three suites; critical flows covered.

## Sprint 5 — Store readiness (P1, mostly configuration)
- RevenueCat project: entitlements `pro`, `expedition`; products `travelpoint_{pro,expedition}_{monthly,annual}` in App Store Connect and Play Console; set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` in EAS; webhook to `/api/billing/webhook/revenuecat` with `REVENUECAT_WEBHOOK_SECRET`.
- iOS build profile and `submit` config in `eas.json`; APNs key; FCM `google-services.json`.
- Sentry DSN for mobile builds; privacy policy and terms reachable in-app; App Privacy labels / Play Data safety (location, photos, purchases).
- Store listings, screenshots, age rating.
- Acceptance: TestFlight + Play internal builds pass a sandbox purchase, restore and push.

## Sprint 6 — Operations & UX (P2–P3)
- Presence store in Redis before running more than one API instance (TP-031).
- Refresh explorer profile after purchase (TP-036); comments schema + block filter (TP-035).
- Remove Railway leftovers, fix CI web build URL, update `SECURITY.md` auth section to Supabase (TP-034).
- Visual QA pass at 393 px against the Terra Mare system; accessibility (focus, contrast, screen reader labels on map pins).

## Product differentiators worth considering later (P4)
Only after the above; each needs a measurable goal.
- Explorer-controlled precision: owner chooses fuzz radius per spot (privacy as a feature).
- Verified-visit unlock: unlock a TRUSTED spot after a confirmed nearby visit (fits "only people who've been there").
- Circle expeditions: shared journey with members' consented, grid-snapped live presence.
