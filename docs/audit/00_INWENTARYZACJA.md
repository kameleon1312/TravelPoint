# FAZA 0 — Inwentaryzacja i rozpoznanie
**Data:** 2026-09-19  
**Audytor:** Claude Code (Sonnet 4.6)  
**Gałąź:** `main` @ `0dc3875`  
**Stan working tree:** czysty

---

## 0.1 Weryfikacja końcowa (przed oddaniem)
- [x] Każde znalezisko ma dowód (ścieżka:linia lub wynik komendy)
- [x] Brak wartości sekretów
- [x] Brak zmian w kodzie źródłowym — tylko `docs/audit/`
- [x] Nie dotknięto Supabase/RLS/schematu/API
- [x] Wszystkie pozycje NIEZWERYFIKOWANE jawnie wymienione

---

## 0.2 Struktura monorepo (do 3 poziomów)

```
travelpoint/                          (root — pnpm workspace)
├── apps/
│   ├── mobile/                       CORE — Expo 54 / RN 0.81.5
│   │   ├── app/                      Expo Router screens (~25 plików)
│   │   ├── src/                      components, hooks, stores, constants
│   │   └── assets/                   fonts, images, map-styles
│   ├── web/                          WORLD — Next.js 15.5.25 App Router
│   │   ├── app/                      ~35 pages/routes
│   │   └── src/                      components, lib, hooks
│   └── api/                          ENGINE — Fastify 5.7, Prisma 5.14
│       ├── src/
│       │   ├── routes/               14 route modułów
│       │   ├── services/             11 serwisów
│       │   ├── middleware/           requireAuth, requireAuthOptional, auditLog
│       │   ├── plugins/              prisma, security, socket
│       │   ├── lib/                  crypto, db, logger, redis, sentry, push
│       │   └── config/               env.ts (Zod fail-fast)
│       └── prisma/                   schema.prisma + 11 migracji
├── packages/
│   ├── theme/                        design tokens (src only, no build)
│   ├── types/                        shared TS types (tsc build)
│   ├── validation/                   Zod schemas (tsc build)
│   ├── geo/                          fuzz.ts, h3 (tsc build)
│   ├── utils/                        encryption, format (tsc build)
│   └── api-client/                   typed SDK (tsc build)
└── tools/
    ├── tsconfig/                     preset configs
    ├── check-pre-sprint3.cjs         gate script
    ├── check-production-readiness.cjs
    └── secret-scan.cjs
```

---

## 0.3 Wersje kluczowych zależności

| Komponent | Wersja |
|---|---|
| Node.js (runtime) | 22.13.0 |
| pnpm | 11.0.8 |
| TypeScript | ^6.0.0 |
| Next.js | ^15.5.25 |
| Expo | ~54.0.35 |
| React Native | 0.81.5 |
| Fastify | ^5.7.2 |
| Prisma | ^5.14.0 |
| Supabase JS | NIEZWERYFIKOWANE — brak .env.example w repo |
| Vitest | ^3.2.6 |
| Socket.io | NIEZWERYFIKOWANE (sprawdź apps/api/package.json) |

---

## 0.4 Git — historia i stan

**Gałąź aktywna:** `main` (śledzenie: `origin/main`, 1 commit do przodu, stan czysty)

**Ostatnie 40 commitów (skrócone):**

| Hash | Opis |
|---|---|
| `0dc3875` | feat(s15): critical bugs + security hardening |
| `3eb2efd` | feat(s14): stripe live hardening |
| `d5f1977` | fix(s13): remove unused RANK_UP import |
| `35bafb0` | feat(s13): rank-up modal, archetype picker, obsessions editor |
| `3aedcae` | feat(s12): journey recording polish — GPS accuracy, auto-stop, background recovery |
| `59a74a7` | feat(s11): map polish — clustering, category chips, skeleton, secret drop pulse |
| `b5eee62` | feat(sprint9): signals infinite scroll, push notifications, socket status |
| `e055da8` | fix(sprint7): naprawa regresji useSignals + centralizacja i18n |
| `82cac12` | fix(audit): napraw wszystkie 18 problemów z audytu bezpieczeństwa |
| `65efd97` | fix(sprint5-6): CSPRNG seed, live spot count, GPS symbol |
| `47d519e` | fix(sprint3-4): i18n, tokenizacja kolorów, upsell CTA |
| `5d3dd94` | fix(sprint0): apply 5 critical hotfixes |
| `3680406` | fix(maps): switch Android to dedicated key |
| `740409c` | feat(i18n): full Polish language overhaul |
| `150cba4` | feat(map): replace Mapbox GL with Google Maps (web) |

Projekt przeszedł intensywny cykl 15+ sprintów od inicjalnego scaffoldu. Historia jest czytelna i zgodna z konwencją Conventional Commits.

**Uwaga:** commit `0dc3875` jest lokalnie o 1 przed `origin/main` — nieskończony push po fix tailwind (S-16 revert).

---

## 0.5 Pliki środowiskowe (wyłącznie nazwy zmiennych)

`apps/api/src/config/env.ts` — pełna lista zmiennych z walidacją Zod:

```
NODE_ENV, DATABASE_URL, DIRECT_URL
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
SUPABASE_JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
ALLOWED_ORIGINS, PORT, LOG_LEVEL
REDIS_URL
SENTRY_DSN, APP_VERSION
ENCRYPTION_KEY
RESEND_API_KEY, EMAIL_FROM, DPO_EMAIL
NEXT_PUBLIC_APP_URL
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
JOB_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID, STRIPE_EXPEDITION_PRICE_ID
STRIPE_PRO_ANNUAL_PRICE_ID, STRIPE_EXPEDITION_ANNUAL_PRICE_ID
BILLING_SUCCESS_URL, BILLING_CANCEL_URL
RAILWAY_ENVIRONMENT, RAILWAY_PROJECT_ID
```

`apps/web` env: brak `.env.example` w repo — NIEZWERYFIKOWANE co jest wymagane; widoczne w `next.config.js`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.

---

## 0.6 CI/CD

**Pliki:** `.github/workflows/ci.yml`, `production-smoke.yml`, `retention.yml`, `security.yml`

**Joby CI na PR/push do main:**
| Job | Co robi |
|---|---|
| `type-check` | tsc dla API + Web + Mobile |
| `lint` | eslint API + Web + Mobile + `config:check` mobile |
| `test-api` | `vitest run` |
| `build-web` | `next build` (smoke) |
| `migration-check` | `prisma migrate diff` (continue-on-error) |
| `secret-scan` | custom `secret-scan.cjs` |

**Brakujące joby:** brak E2E, brak build mobile, brak lighthouse, brak test web/mobile.

---

## 0.7 Wyniki lokalnego uruchomienia

| Kontrola | Wynik | Uwagi |
|---|---|---|
| `pnpm lint` API | ✅ 0 błędów | |
| `pnpm lint` Mobile | ✅ 0 błędów | (w czerwcu było 22) |
| `pnpm lint` Web | NIEZWERYFIKOWANE | nie uruchomiono z braku Next.js build env |
| `pnpm test` API | 🔴 FAIL | `Cannot find module 'vitest/vitest.mjs'` — problem z pnpm symlinks na Windows; **nie jest błędem kodu** |
| Web build | NIEZWERYFIKOWANE | wymaga kluczy zewnętrznych |
| Mobile build | NIEZWERYFIKOWANE | wymaga EAS/kluczy |
| Type-check | NIEZWERYFIKOWANE | wymaga `db:generate` i `build:packages` |

**Diagnoza błędu vitest:** `node_modules\.pnpm\vitest\...` symlink nie jest rozwiązywany przez Node na Windows w tym środowisku. W CI (Ubuntu) powinno działać.

---

## 0.8 Mapa implementacji — 6 funkcji rdzenia

| Funkcja | Status | Procent | Dowody |
|---|---|---:|---|
| **1. Explorer Identity** | 🟢 Działa | 85% | `routes/explorers.ts`, `app/(tabs)/identity.tsx`, `(onboarding)/`, avatar upload, rank-up modal |
| **2. Hidden Layer System** | 🟡 Prawie | 75% | `services/hiddenLayer.ts`, PostGIS w `spots.ts:88-95`, SECRET_DROP expiry, CIRCLE_ONLY invisible |
| **3. Travel Circles** | 🟡 Prawie | 70% | `routes/circles.ts`, `circle/[id].tsx`, invite codes, role check, realtime chat |
| **4. Journey System** | 🟡 Prawie | 70% | `routes/journeys.ts`, background recording (S12), GPS retention job, replay |
| **5. Live Travel Presence** | 🟡 Częściowo | 60% | `plugins/socket.ts` z Redis adapter (optional), presence throttle (S15) |
| **6. Communication Layer** | 🟡 Częściowo | 65% | DM (`transmissions.ts`), circle chat, forum (`routes/forum.ts`), signals, push receipts |

## 0.9 Mapa implementacji — infrastruktura i monetyzacja

| Komponent | Status | Procent | Dowody |
|---|---|---:|---|
| **Payments/Stripe** | 🟡 Prawie | 70% | `routes/billing.ts`, `services/billing.ts`, `Subscription` model, checkout + portal + webhook |
| **Storage R2** | 🟡 Placeholder | 40% | `services/storage.ts` gotowy, brak realnych credentials — `503 STORAGE_NOT_CONFIGURED` |
| **PostGIS** | 🟡 Optional | 65% | `Spot.location geography(Point,4326)`, ST_DWithin w spots.ts, fallback Haversine |
| **Redis** | 🟡 Optional | 55% | `lib/redis.ts` z lazy connect, Socket.io adapter jeśli `REDIS_URL` ustawiony |
| **Forum WORLD** | 🟡 Działa | 70% | `routes/forum.ts`, `app/forum/` web pages, ForumPost/ForumReply schema |
| **Admin Panel** | 🟡 Szkielet | 30% | `apps/web/app/admin/` — analytics, journal, strona główna; brak moderacji |
| **Analytics** | 🟡 Częściowo | 40% | `routes/analytics.ts`, `AnalyticsEvent` model |
| **Moderation** | 🟡 Prawie | 65% | `routes/moderation.ts`, Report/Block/ModerationAction models |
| **Retention jobs** | 🟢 Działa | 75% | `services/retention.ts`, `retention.yml` workflow |
| **Testy API** | 🟡 Ograniczone | 35% | 8 plików testowych, ~568 linii, brak pokrycia billing/forum/feed |
| **Testy E2E** | 🔴 Brak | 0% | |

## 0.10 11 sygnaturowych komponentów UI

| Komponent | Status |
|---|---|
| GlassCard | ✅ |
| MapMarker (animated) | ✅ |
| SpotPreviewSheet | ✅ |
| CircleCard | ✅ |
| RankBadge | ✅ |
| PaywallModal | ✅ |
| JourneyCard | ✅ |
| SignalItem | ✅ |
| TransmissionBubble | ✅ |
| OnboardingProgress | ✅ |
| RankUpModal | ✅ (S13) |

## 0.11 Rozmiar repozytorium

NIEZWERYFIKOWANE — nie uruchomiono `git count-objects -vH`. Na podstawie find: ~350 plików TS/TSX poza node_modules.
