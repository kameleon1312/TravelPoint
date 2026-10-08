# TravelPoint — Project State 2026-10-08

> Deep audit based on direct code reading of every route, screen, package and config file.
> This document supersedes PROJECT_STATE_2026-10-07.md.

---

## Overall completion estimate

| Layer | Completion | Notes |
|---|---|---|
| CORE (mobile) | **88%** | All primary screens built; App Store pipeline not started |
| WORLD (web) | **82%** | All pages built; OG image, live stats, minor UX gaps |
| ENGINE (API) | **95%** | All routes implemented; Sentry + APM not wired |
| Infra / DevOps | **80%** | Render + Supabase + R2 ready; App Store CI missing |
| App Store readiness | **15%** | Architecture sound; submission pipeline not started |

---

## CORE — Mobile (Expo / React Native 0.81.5 / Expo 54)

### Auth flow ✅
- `(auth)/join.tsx` — Supabase signup + custom handle + invite code (react-hook-form + zod)
- `(auth)/login.tsx` — Supabase email/password login
- `_layout.tsx` — AuthGate wraps all screens; biometric lock overlay (expo-local-authentication);
  OTA update banner (expo-updates); font preloading (ClashDisplay, GeneralSans, SpaceMono)

### Onboarding flow ✅ (3 steps)
- `step-1-archetype.tsx` — WANDERER / URBEXER / NOMAD / HUNTER / PILGRIM
- `step-2-territories.tsx` — Multi-select continents
- `step-3-obsession.tsx` — Up to 5 obsession tags; calls API to update profile on completion

### Tab screens ✅
| Tab | File | Status |
|---|---|---|
| Atlas (map) | `(tabs)/index.tsx` | MapView + Supercluster clustering, live GPS, journey recording (idle 3min warn, 10min auto-stop), spot preview sheet, category filter chips, hidden-layer pins |
| Discover | `(tabs)/discover.tsx` | Circlemate feed + nearby spots, category chips, CoordLabel component |
| Circles | `(tabs)/circles.tsx` | My circles grid, FOUNDER/GUIDE/MEMBER role badges |
| Journeys | `(tabs)/journeys.tsx` | My journeys grid with mood color system |
| Identity | `(tabs)/identity.tsx` | Full profile — signals inbox, rank/tier badges, archetype, home base (encrypted), avatar upload, account settings, biometrics toggle |

### Detail screens ✅
- `spot/[id].tsx` — Photos, reactions, community verifications, comments, save/unsave, owner edit/delete, PaywallModal for locked content
- `circle/[id].tsx` — Join/leave (invite codes w/ atomic consumption), invite code gen, member management (promote/kick), circle settings, delete
- `circle/browse.tsx` — Browse public circles with join flow
- `explorer/[handle].tsx` — Public explorer profile
- `journey/[id].tsx` — Journey detail with GPS route replay

### Forum screens ✅
- `forum/index.tsx` — Listing with category tabs (FIELD_NOTES / GEAR / SAFETY / REQUESTS / STORIES)
- `forum/[slug].tsx` — Post detail with replies
- `forum/new.tsx` — Create post with category picker

### Modal screens ✅
- `modals/new-spot.tsx` — Uses `CreateSpotSchema` from `@travelpoint/validation`, PaywallModal for tier check, circle selector for CIRCLE_ONLY spots
- `modals/new-journey.tsx` — Uses `CreateJourneySchema` from `@travelpoint/validation`
- `modals/new-circle.tsx` — Uses `CreateCircleSchema` from `@travelpoint/validation` (fixed this session)
- `modals/transmissions.tsx` — DM inbox + circle message threads
- `modals/search.tsx` — Explorer/journey search with pg_trgm results

### Other screens ✅
- `saved.tsx` — Saved spots
- `plans.tsx` — Journey plans

### Push notification routing ✅ (all 11 types in `_layout.tsx`)
`transmission` · `circle_message` · `spot_unlocked` · `secret_drop` · `nearby_spot` · `nearby_explorer` · `spot_comment` · `circle_invite` · `journey_like` · `rank_up` · `forum_reply`

### Stack.Screen entries ✅
`explorer/[handle]`, `saved`, `plans` — all present with `headerShown: false`

### App config
- `app.config.js` v1.0.0, slug `travelpoint`, portrait only
- `eas.json` — 3 profiles: development (APK), preview (APK internal), production (AAB + autoIncrement)
- Sentry integrated (`@sentry/react-native ~7.2.0`) but `SENTRY_DISABLE_AUTO_UPLOAD: true` in all EAS profiles — **DSN not configured for production**

### Mobile — known gaps
- ❌ iOS build profile in `eas.json` — only Android configured (`buildType: apk/app-bundle`); iOS distribution not set up
- ❌ APNs certificate for production iOS push notifications not configured
- ❌ No TestFlight distribution in `eas.json submit`
- ❌ Sentry DSN missing in production build env
- ❌ Apple IAP not implemented — App Store requires in-app purchases for subscriptions sold within the app; Stripe checkout sessions open a browser (permitted for Android, but Apple blocks for iOS App Store distribution)

---

## WORLD — Web (Next.js 15 / React 19)

### Pages ✅
| Route | Status | Notes |
|---|---|---|
| `/` (landing) | ✅ | Hero, PhoneShowcase, Pillars, Tiers, FinalCTA; spot count live from API |
| `/journal` | ✅ | Post listing |
| `/journal/[slug]` | ✅ | Post detail with OG image |
| `/forum` | ✅ | Forum listing with category filter |
| `/forum/[slug]` | ✅ | Forum post detail |
| `/map` | ✅ | Discovery Map (Google Maps API, geo-privacy ±500m) |
| `/explorer/[handle]` | ✅ | Public explorer profile with OG image |
| `/explorers` | ✅ | Explorer directory with search |
| `/spot/[id]` | ✅ | Public spot detail |
| `/download` | ✅ | APK via `NEXT_PUBLIC_APK_URL` (GitHub Release asset); 4-step sideload guide; TestFlight + stores grayed ("Wkrótce") |
| `/billing` | ✅ | Stripe tier management, checkout, portal |
| `/billing/success` | ✅ | Post-payment confirmation |
| `/billing/cancel` | ✅ | Checkout cancelled |
| `/join` | ✅ | Registration form |
| `/login` | ✅ | Login form |
| `/verify-email` | ✅ | Email verification flow |
| `/reset-password` | ✅ | Password reset |
| `/profile` | ✅ | Auth-gated personal profile |
| `/regulamin` | ✅ | Terms of service |
| `/polityka-prywatnosci` | ✅ | Privacy policy |
| `/rodo` | ✅ | GDPR request form (6 request types) |
| `/admin` | ✅ | Admin dashboard |
| `/admin/journal` | ✅ | Journal CRUD |
| `/admin/analytics` | ✅ | Analytics summary |

### Infrastructure
- `format-detection` meta tag — iOS Safari auto-link prevention (telephone, date, address, email, url)
- Cookie banner — `CookieBanner` component in root layout
- OG images — journal posts ✅, forum posts ✅, explorer profiles ✅; **landing page OG uses logo.png (512×512) — not a proper 1200×630 social image ❌**
- `globals.css` — `a { text-decoration: none; color: inherit }` in `@layer base` (prevents browser-default underlines)
- `ViewportHeight` — 100dvh polyfill for mobile browsers
- `ConsoleFilter` — suppresses noisy dev console warnings in production

### Web — known gaps
- ❌ Landing page OG image (`/og-image.png` 1200×630) not created — social shares show logo.png
- ❌ "340 Aktywnych Odkrywców" and "12 Kręgów" hardcoded in landing stats — only `spotCount` is live-fetched
- ❌ Map requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — must be set in production env
- ❌ Billing not configured yet (`isBillingConfigured()` returns false without Stripe keys)

---

## ENGINE — API (Fastify + Prisma + PostgreSQL)

### Routes implemented ✅
| Route group | Endpoints | Notes |
|---|---|---|
| `auth.ts` | POST /api/auth/complete-signup | Supabase JWT, handle uniqueness, invite code, welcome email, idempotent |
| `explorers.ts` | GET/PUT/DELETE /api/explorers/me, avatar upload (S3 presigned), home-base (AES), public profiles | Full explorer management |
| `spots.ts` | Full CRUD, photos, reactions (5 types), community verifications, comments, save/unsave, nearby query | Haversine distance, daily seed fuzzing |
| `circles.ts` | Full CRUD, join/leave, invite codes (atomic consumption, GUIDE/FOUNDER roles), member listing | Complete circle management |
| `journeys.ts` | Full CRUD, like/unlike, GPS route (routeGeoJson, 90-day auto-expiry, retainRoute flag) | Journey + route storage |
| `transmissions.ts` | DM inbox, bidirectional thread, circle messages, block filtering | Transmissions = DMs |
| `signals.ts` | GET (paginated), PATCH seen | Signal/notification store |
| `feed.ts` | Circlemate spots + journeys + comments, block filter, coord fuzzing ±500m | 7-day rolling window |
| `forum.ts` | Post CRUD + replies, 5 categories, 30min edit window, moderator pin/delete/close, push on reply | Full community forum |
| `billing.ts` | Stripe checkout, portal, webhook handler (subscription lifecycle), annual pricing | PRO 29 zł/EXPEDITION 79 zł |
| `moderation.ts` | Report system (5 target types), suspend explorer, admin tier override, retention scheduler | Full mod pipeline |
| `rodo.ts` | GDPR requests — 6 types (Art. 15-21), Resend email to DPO | GDPR compliant |
| `waitlist.ts` | POST /api/waitlist, POST /api/invite-request (rate limited 5/min) | Landing page intake |
| `analytics.ts` | POST /api/analytics/events, GET /api/admin/analytics/summary (90-day window) | Internal analytics |
| `journal.ts` | Full CRUD (admin-gated create/update/delete), public listing + by slug | Blog / Dziennik |
| `search.ts` | pg_trgm similarity search — explorers + journeys, ILIKE fallback, soft-delete filter | Fixed: deletedAt IS NULL |

### Services ✅
- `hiddenLayer.ts` — Server-side-only access control for secret spots; fuzzed coords for unauthorized viewers
- `billing.ts` — Stripe API integration (no SDK — raw fetch), checkout sessions, customer portal, webhook signature verification
- `trustScore.ts` — Explorer rank progression + tier management
- `push.ts` — Expo Push Notifications (individual + batch)
- `email.ts` — Resend integration (welcome, invite, waitlist confirmation)
- `retention.ts` — GDPR retention enforcement (scheduled)
- `blockAccess.ts` — Block system helpers

### Security ✅
- Auth: Supabase JWT (`verifySupabaseJwt`) — 15min access tokens
- Geo-privacy: exact coords never sent to unauthorized clients; ±500m fuzzing in feed, spots, hidden layer
- AES-256 encryption for homeBase coordinates
- Rate limiting: auth endpoints 5/15min, analytics 30/min, waitlist 5/min
- Block system: blocked explorers filtered from feed, DMs, search
- Soft delete: `deletedAt` filtering in all explorer/spot queries

### API — known gaps
- ❌ Sentry error tracking not wired (import exists but DSN not configured in render.yaml)
- ❌ `/api/stats/spots` endpoint exists for landing page but `/api/stats/explorers` and `/api/stats/circles` may not be implemented (landing stats 340 / 12 are hardcoded)

---

## Packages

### `@travelpoint/theme` ✅
All Terra Mare tokens: `void` / `abyss` / `graphite` / `aurora` / `signal` / `ember` / `violet` / `sand` / `moss` / `starlight` / `star` / `starFaint` / `starGhost` / glass tokens. FontSize, Spacing, BorderRadius, Shadow exported. Single source of truth for both mobile and API.

### `@travelpoint/validation` ✅
Zod schemas for: CreateSpot, UpdateSpot, CreateCircle, CreateJourney, UpdateJourney, Waitlist, InviteRequest, and more. Used in both frontend (mobile/web) and backend (API) — single schema, zero drift.

### `@travelpoint/types` ✅
Explorer, Signal, FeedItem, SpotForViewer, Rank/RANK_THRESHOLDS/RANK_LABELS/RANK_START, Archetype, Tier, rankAtLeast() helper.

### `@travelpoint/geo` ✅
`fuzzCoordinates(lat, lng, radiusM, seed)` — deterministic daily-seeded fuzzing, prevents triangulation.

### `@travelpoint/utils` ✅
`formatRelative()` — relative date formatting (used throughout mobile).

### `@travelpoint/api-client` ✅
Shared API client used in mobile.

---

## Infrastructure

### Deployment ✅
- API: Render.com (`render.yaml` configured, `travelpoint-api` service)
- Web: Vercel (implied by NEXT_PUBLIC_APP_URL / ALLOWED_ORIGINS configuration)
- DB: Supabase PostgreSQL with PostGIS
- Auth: Supabase Auth (JWT)
- Media: Cloudflare R2 (S3-compatible, presigned upload URLs)
- Email: Resend
- Payments: Stripe (not yet configured with live keys)
- Push: Expo Push Notifications

### CI ✅
- GitHub Actions with `pnpm security:audit`
- `tools/audit-critical.cjs` — smart audit that ignores acknowledged build-tool CVEs
- 4 acknowledged CVEs (build-time/dev-only): GHSA-23hp-3jrh-7fpw, GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr, GHSA-pqg4-j6r4-53mv

### Removed ✅
- Railway deployment files (railway.json, railway.toml, nixpacks.toml) — deleted
- Dead mobile lib/secureStorage.ts — deleted
- Dead web dependencies (@travelpoint/api-client, @googlemaps/js-api-loader from web package.json)

---

## App Store / Google Play — readiness checklist

### ✅ Ready
- Core functionality complete (map, spots, circles, journeys, forum, transmissions)
- Auth (Supabase), security (Argon2id via Supabase, AES, JWT), geo-privacy
- Stripe billing architecture (PRO + EXPEDITION tiers)
- EAS build profiles (development, preview, production AAB)
- OTA updates (expo-updates ~29)
- Sentry integration (package installed, DSN missing)
- GDPR / RODO endpoints + web form

### ❌ Blockers for App Store release

**Critical (must fix before submission):**
1. **Apple IAP** — App Store rules require in-app purchases for subscriptions sold to iOS users. Stripe checkout opens a browser tab — Apple blocks this for digital goods. Must implement `expo-in-app-purchases` or RevenueCat for iOS subscription flow.
2. **iOS build profile** — `eas.json` only configures Android builds. Add iOS distribution config (`apple_team_id`, provisioning, entitlements).
3. **APNs certificate** — Production push notifications on iOS require APNs auth key or cert configured in Expo dashboard.
4. **App Store metadata** — App name, description (PL + EN), screenshots (6.7" + 6.1" + 12.9" iPad), keywords, age rating, support URL — none prepared.
5. **Sentry DSN** — Configure `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_DSN` in EAS build env for crash reporting.

**Important (before submission):**
6. **Privacy policy deep link** — App Store requires privacy policy URL accessible within the app (Settings screen or join flow); currently only accessible on web.
7. **TestFlight distribution** — `eas.json submit.production` is empty `{}`. Configure `appleId`, `ascAppId`, `bundleIdentifier`.
8. **Google Play metadata** — Store listing, screenshots (phone + tablet), feature graphic, content rating questionnaire.

**Nice-to-have before launch:**
9. Landing page OG image (1200×630) for social sharing
10. Live explorer/circle counts on landing (currently hardcoded 340/12)
11. Stripe live keys configured (billing functional but not live)
12. Map API key for production web (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

---

## Active bugs

None confirmed from code audit. Previous bugs fixed:
- ~~BUG-1b: Soft-deleted explorers visible in journey search~~ — FIXED (JOIN has `AND e."deletedAt" IS NULL`)
- ~~iOS auto-link GPS coordinates~~ — FIXED (format-detection meta + global link reset)
- ~~BUG-WEB-1: Admin JWT from sessionStorage~~ — FIXED
- ~~BUG-WEB-2: Profile redirect loop~~ — FIXED

---

## Roadmap to App Store launch

### Phase 1 — iOS revenue infrastructure (2-3 weeks)
- Implement RevenueCat (recommended) or `expo-in-app-purchases` for iOS subscription flow
- Keep Stripe for Android + web billing
- Ensure entitlement sync between Stripe (Android/web) and IAP (iOS)

### Phase 2 — Store submission setup (1 week)
- Configure EAS `submit.production` (Apple ID, ASC app ID, bundle ID)
- Add iOS build profile to eas.json
- Configure APNs push auth key in Expo dashboard
- Configure Sentry DSN for production builds

### Phase 3 — Store assets (1 week)
- App Store screenshots — 3 device sizes, 5-10 screens
- Google Play screenshots + feature graphic
- Store descriptions PL + EN
- Age rating questionnaire (Google: PEGI 3; Apple: 4+)
- Support URL + privacy policy URL (accessible from app Settings)

### Phase 4 — TestFlight beta (1-2 weeks)
- Internal TestFlight testing (team)
- External TestFlight (50-100 selected explorers from waitlist)
- Fix any Apple review blocker

### Phase 5 — App Store submission
- Submit to App Store review (~1-7 days review time)
- Submit to Google Play internal test → closed test → production

---

## Design system compliance

All mobile screens use `@travelpoint/theme` tokens — no hardcoded colors confirmed in any screen.
All new-spot, new-journey, new-circle modals use `@travelpoint/validation` schemas.
UI strings in Polish via `@/i18n/pl` throughout mobile.
Web uses Tailwind classes mapped to Terra Mare tokens in `tailwind.config.ts`.
Brand language: explorer/signal/journey/circle/expedition throughout (Tiers section corrected this session).
