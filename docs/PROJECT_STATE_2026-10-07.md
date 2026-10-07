# TravelPoint — Aktualny stan projektu

**Audyt:** 7 października 2026 | Poprzedni audyt: `docs/PROJECT_STATE_2026-09-30.md`
**Metodologia:** Każdy plik źródłowy zbadany przez 4 niezależne agenty (API, Mobile, Web, Packages/Infra).

---

## 0. Podsumowanie wykonawcze

| Obszar | Wrzesień 2026 | **Październik 2026** |
|---|---|---|
| Produkt ogółem | ~80% | **~87%** |
| Web (WORLD) | ~83% | **~89%** |
| Mobile (CORE) | ~82% | **~86%** |
| API (ENGINE) | ~76% | **~80%** |
| Infrastruktura | ~55% | **~65%** |

**Gotowość do zamkniętego MVP:** TAK — wszystkie krytyczne blokery z września naprawione.
**Gotowość do produkcji publicznej:** NIE — brakuje E2E testów, staging env, paginacji w feed/circles/journeys.

---

## 1. Co zostało NAPRAWIONE od 30 września 2026

### Bugi krytyczne — rozwiązane

| Bug | Co było | Co jest teraz |
|---|---|---|
| **BUG-2** `Colors.borderSand` | Nie istniał w theme → undefined na tab barze | ✅ Legacy alias dodany do `packages/theme/src/colors.ts` |
| **BUG-3** `Colors.backgroundGreen` | Nie istniał w theme → undefined tło | ✅ Legacy alias dodany do `packages/theme/src/colors.ts` |

### BUG-1 — reklasyfikowany

**Poprzednia diagnoza (wrzesień):** Raw SQL `WHERE j."deletedAt" IS NULL` w `search.ts` → crash 500.
**Aktualna diagnoza:** Klauzula ta NIE ISTNIEJE w aktualnym kodzie. `Journey` nadal nie ma `deletedAt` i DELETE jest hard delete — ale search nie crasha. Realny problem: miękko-usunięci explorers (Explorer.deletedAt) mogą nadal pojawiać się w wynikach journey search. Nowa etykieta: **BUG-1b** (medium priority, nie critical).

### Zrealizowane funkcje (nowe od września)

| Funkcja | Stan |
|---|---|
| **Cookie banner (RODO)** | ✅ Kompletny — `CookieBanner.tsx`, klucz `tp_cookie_consent`, "Akceptuj" + "Tylko niezbędne", linki do /polityka-prywatnosci i /rodo, montowany w root layout |
| **Admin route protection** | ✅ `middleware.ts` — GET `/api/explorers/me` weryfikacja roli MODERATOR/ADMIN, brak cookie → redirect `/admin/login?returnUrl=...` |
| **Forum screen (mobile)** | ✅ Trzy pliki: `apps/mobile/app/(forum)/index.tsx`, `[slug].tsx`, `new.tsx` — w pełni funkcjonalny |
| **Login page** | ✅ `/login` — SSR, metadata noindex, LoginFormClient, Supabase auth, returnUrl redirect |
| **Join page** | ✅ `/join` — handle + email + password + invite code, stany form/confirm_email/logged_in |
| **Download page** | ✅ `/download` — `NEXT_PUBLIC_APK_URL` (GitHub Releases), Android active, iOS/stores grayed-out "Wkrótce" |
| **APK hosting** | ✅ GitHub Releases v1.0.0-preview (121MB), `NEXT_PUBLIC_APK_URL` jako Config w Vercel |
| **Journal dynamic** | ✅ Hybrydowy — `journalApi.ts` próbuje `GET /api/journal/posts` (300s revalidate), fallback do 4 statycznych postów |
| **mapbox-gl usunięty** | ✅ Usunięty z `apps/web/package.json` |
| **Circle management API** | ✅ PATCH, DELETE, promote, kick — wszystkie endpointy istnieją |
| **TierLimits server-side** | ✅ Egzekwowane (FREE: savedWorlds≤25, itp.) |
| **lastSeenAt** | ✅ Aktualizowany przy każdym requireAuth (throttled) |
| **CI stabilność** | ✅ Wszystkie 4 workflow pliki pinned do `ubuntu-24.04` |
| **Hamburger → X animacja** | ✅ Naprawiona matematyka (h-[2px] + gap-[6px] + translate-y-2) |
| **iOS Safari zoom prevention** | ✅ Inputy na login/join zmienione z text-sm → text-base (≥16px) |
| **Mobile menu exit animation** | ✅ AnimatePresence + motion.div z exit props |

---

## 2. Aktywne problemy (do naprawy)

### [BUG-1b] MEDIUM — Soft-deleted explorers w journey search

- **Lokalizacja:** `apps/api/src/routes/search.ts`
- **Problem:** Wyniki `GET /api/search?type=journeys` mogą zawierać journey'e należące do usuniętych kont (Explorer.deletedAt ≠ null)
- **Fix:** Dodać JOIN lub WHERE filtrujący Explorer.deletedAt IS NULL w query journey search

### [BUG-WEB-1] LOW — Admin pages wymagają ręcznego JWT pomimo middleware

- **Lokalizacja:** `apps/web/app/admin/page.tsx`, `admin/journal/page.tsx`, `admin/analytics/page.tsx`
- **Problem:** Middleware poprawnie chroni trasy przez cookie, ale admin pages mają własny `useState('')` dla tokenu i wymagają ręcznego wklejenia JWT do input
- **Fix:** Czytać token z sessionStorage/cookie zamiast wymagać ręcznego wklejenia

### [BUG-WEB-2] LOW — Profile redirect → /forum zamiast /login

- **Lokalizacja:** `apps/web/app/profile/page.tsx` linia ~65
- **Problem:** Brak tokenu → `router.replace('/forum')` zamiast `router.replace('/login?returnUrl=/profile')`
- **Fix:** Zmienić redirect target

---

## 3. Stan funkcjonalny — WORLD (apps/web)

### Strony

| Strona | Status | Kompletność |
|---|---|---|
| Landing page | Dynamiczna (spotCount z API `/api/stats/spots`), 3D ScrollScape, Tiers | ✅ 90% |
| `/map` | Google Maps + OSM fallback (FreeTileMap), dark TERRA_MARE_STYLE, filtry, SpotPanel | ✅ 90% |
| `/journal` | Hybrydowy (API → fallback static), featured + grid, prev/next nawigacja | ✅ 85% |
| `/journal/[slug]` | SSR + generateMetadata + OG + JSON-LD Article, prev/next | ✅ 85% |
| `/forum` | ForumAuthProvider, kategorie, paginacja, SignInModal | ✅ 85% |
| `/forum/[slug]` | Odpowiedzi, delete, lock/pin (mod), report, JSON-LD | ✅ 85% |
| `/explorer/[handle]` | SSR + OG + JSON-LD Person, 300s revalidate | ✅ 80% |
| `/explorers` | Wyszukiwarka (wymaga auth token) | ✅ 75% |
| `/spot/[id]` | SSR + OG + JSON-LD Place, koordynaty ±500m, Hidden Layer teaser | ✅ 85% |
| `/profile` | Client-side auth guard, GET /api/explorers/me, read-only | ✅ 75% |
| `/login` | SSR, metadata noindex, Supabase auth, returnUrl | ✅ 95% |
| `/join` | SSR, handle/email/password/invite, confirm_email flow | ✅ 95% |
| `/download` | APK via GitHub Releases, 4-krokowy poradnik | ✅ 95% |
| `/billing` | Stripe Checkout + Portal, tier display | ✅ 85% |
| `/billing/success`, `/billing/cancel` | Strony potwierdzenia | ✅ 100% |
| `/admin` | Incident queue, journal CMS, analytics — **UX double-auth** | ⚠️ 75% |
| `/verify-email` | Supabase hash params, complete-signup, mobile/web flow | ✅ 90% |
| `/reset-password` | Supabase recovery, min 12 znaków | ✅ 90% |
| `/regulamin`, `/polityka-prywatnosci`, `/rodo` + RodoRequestForm | Pełna treść prawna + RODO form | ✅ 95% |
| `not-found`, `error`, `global-error` | Kompletne | ✅ 100% |

### Komponenty

| Komponent | Stan |
|---|---|
| `WorldNav` | Auth-aware, hamburger/X poprawny, AnimatePresence menu, framer-motion wejście | ✅ |
| `CookieBanner` | Kompletny, localStorage tp_cookie_consent, cookie mirror 1rok | ✅ |
| `ScrollScape3D` / `DeferredScrollScape3D` | Kompletny, prefers-reduced-motion + saveData check | ✅ |
| `GlobScene` | Three.js, @react-three/fiber, `@travelpoint/theme` Colors | ✅ |
| `DiscoveryMap` | Google Maps (raw script tag) + FreeTileMap OSM fallback, TERRA_MARE_STYLE | ✅ |
| `ForumAuth` + `ForumAuthProvider` | Context + hook + SignInModal | ✅ |
| `FinalCTA` | InviteRequestSchema z @travelpoint/validation, POST /api/invite-request | ✅ |
| `RodoRequestForm` | 5 typów wniosków RODO, POST /api/rodo-request | ✅ |

### Braki / tech debt web

1. `serverExternalPackages: ['mapbox-gl']` w `next.config.js` — martwy config, mapbox-gl nie ma w deps
2. `NEXT_PUBLIC_MAPBOX_TOKEN` w `.env.local` i `.env.production` — dead env var
3. `@travelpoint/api-client` i `@travelpoint/types` w web `package.json` — nieużywane deps
4. `@googlemaps/js-api-loader` w web `package.json` — nieużywany (mapa używa raw script tag)
5. `getPost()` w `src/lib/journal.ts` — dead code (nigdzie nieużywana)
6. Admin UX double-auth (patrz BUG-WEB-1)

---

## 4. Stan funkcjonalny — CORE (apps/mobile)

### Feature Matrix

| Funkcja | Ekran | API | Realtime | UI |
|---|---|---|---|---|
| Login / Registration | ✅ | ✅ Supabase | — | ✅ |
| Onboarding (3 kroki) | ✅ | ✅ | — | ✅ |
| Atlas — mapa, piny, klastry | ✅ | ✅ | — | ✅ |
| Category filter (7 typów) | ✅ | ✅ | — | ✅ |
| Secret Drop ephemeral piny | ✅ | ✅ | — | ✅ |
| Presence / Nearby Explorers | ✅ | ✅ | ✅ socket | ✅ |
| GPS Journey Recording | ✅ | ✅ | — | ✅ |
| SpotPreviewSheet | ✅ | — | — | ✅ |
| Discover Feed | ✅ | ✅ | — | ⚠️ brak paginacji, pull-to-refresh |
| Nearby Spots list | ✅ | ✅ | — | ⚠️ brak paginacji |
| Circles list | ✅ | ✅ | — | ⚠️ brak search, unread per row |
| Circle detail + join/leave | ✅ | ✅ | — | ⚠️ brak map, founder settings |
| Circle browse | ✅ | ✅ | — | ⚠️ brak paginacji |
| Circle chat (realtime) | ✅ | ✅ | ✅ socket | ⚠️ brak read receipts |
| DM inbox + thread (realtime) | ✅ | ✅ | ✅ socket | ⚠️ brak read receipts |
| Journey list | ✅ | ✅ | — | ⚠️ brak paginacji, filter |
| Journey detail + route map | ✅ | ✅ | — | ⚠️ brak komentarzy, share |
| Spot detail pełny | ✅ | ✅ | — | ✅ |
| Spot comments | ✅ | ✅ | — | ✅ |
| Spot reactions (optimistic) | ✅ | ✅ | — | ✅ |
| Spot verification | ✅ | ✅ | — | ✅ |
| Spot photos (S3 presigned) | ✅ | ✅ | — | ✅ |
| Saved Worlds | ✅ | ✅ | — | ✅ |
| Explorer public profile | ✅ | ✅ | — | ✅ |
| Block/Unblock | ✅ | ✅ | — | ✅ |
| Identity / profil własny | ✅ | ✅ | — | ✅ |
| Avatar upload (S3 presigned) | ✅ | ✅ | — | ✅ |
| Rank bar + RankUpModal | ✅ | ✅ | — | ✅ |
| Signals / Notifications (infinite) | ✅ | ✅ | ✅ socket | ✅ |
| GDPR export + usunięcie konta | ✅ | ✅ | — | ✅ |
| Billing / Plans (Stripe web) | ✅ | ✅ | — | ✅ |
| Search (full-screen modal) | ✅ | ✅ | — | ✅ |
| Biometric lock | ✅ | — | — | ✅ |
| Offline Queue + Replay | lib | ✅ | — | ✅ |
| OTA Updates | ✅ | ✅ | — | ✅ |
| Push + Deep Links | ✅ | ✅ | — | ⚠️ NEARBY_EXPLORER bez handlera |
| Query Cache Persistence | lib | — | — | ✅ |
| **Forum screen** | ✅ (nowe) | — | — | ✅ index + [slug] + new |

### Braki mobile

1. **Push routing NEARBY_EXPLORER** — brak handlera w `_layout.tsx` (pozostałe 5 typów: SPOT_COMMENT, CIRCLE_INVITE, JOURNEY_LIKE, RANK_UP, FORUM_REPLY — status nieznany, sprawdzić)
2. **Stack.Screen entries** — brak headerShown:false dla `explorer/[handle]`, `saved`, `plans`
3. **Circle settings/edit** — brak ekranu dla założycieli (PATCH /api/circles/:slug istnieje na backendzie)
4. **Paginacja:** discover feed, circles browse, journeys list
5. **`new-circle.tsx`** — lokalny Zod schema zamiast z `@travelpoint/validation` (naruszenie CLAUDE.md rule 9)
6. **`lib/secureStorage.ts`** — dead code (auth używa Supabase SecureStore adaptera bezpośrednio)

---

## 5. Stan funkcjonalny — ENGINE (apps/api)

### Route completeness

| Route group | % | Kluczowe braki |
|---|---|---|
| Auth | 35% | Supabase delegates — complete-signup + invite OK; api-client stubs do nieistniejących tras |
| Spots | 85% | Brak: comment delete, paginacji saved/comments |
| Explorers | 85% | TierLimits ✅, lastSeenAt ✅ |
| Journeys | 75% | Hard delete (niespójność ze Spots); brak paginacji |
| Circles | 85% | PATCH/DELETE/promote/kick ✅; brak: transfer ownership |
| Transmissions | 70% | Brak: delete, unread count, cursor pagination na inbox |
| Signals | 80% | Brak: single seen, delete; api-client oczekuje innych tras |
| Search | 75% | BUG-1b (soft-deleted explorers); brak circles/forum w search |
| Feed | 55% | Brak paginacji; tylko 40 items/7 dni |
| Payments | 75% | Brak: cancel endpoint, invoices, incomplete_expired |
| Moderation | 80% | Bloki zduplikowane w 2 routes; brak WARN action |
| Forum | 75% | Brak: reply edit, reactions na postach |
| Journal | 75% | Brak DELETE /admin/journal/posts/:slug |
| Analytics | 60% | Tylko event ingestion + summary |

### Prisma Schema — stan

- **28 modeli** (wrzesień: 27) — brak: Waitlist, ExplorerFollow, PushNotificationLog
- Brak `prisma/migrations/` — zarządzany przez `prisma db push` / `init.sql`
- `WEEK_ACTIVE` i `MODERATION_PENALTY` TrustEventType — nigdy nie wywoływane (brak crona)
- `RefreshToken` i `AuthToken` modele + `crypto.ts` (Argon2id) — istnieją, żadna trasa ich nie używa (auth przez Supabase)

### api-client rozbieżności (niezmienione od września)

`packages/api-client/src/endpoints/auth.ts` definiuje `join`, `login`, `refresh`, `logout` — **NIE ISTNIEJĄ** na serwerze.
`packages/api-client/src/endpoints/signals.ts` oczekuje `/api/signals/:id/read` i `/api/signals/read-all` — faktyczna trasa to `PATCH /api/signals/seen`.

---

## 6. Stan infrastruktury

| Komponent | Stan |
|---|---|
| API deployment | Render.com (render.yaml) ✅ |
| Railway pliki | railway.json, railway.toml, nixpacks.toml — martwe, można usunąć |
| Web deployment | Vercel ✅ |
| Baza danych | Supabase PostgreSQL (Prisma PrismaClient) ✅ |
| File storage | Cloudflare R2 — skonfigurowane; 503 gdy R2_* env nie ustawione |
| Push | Expo Push API ✅ |
| Email | Resend — welcome/verify/reset/invite ✅ |
| Redis | ioredis — w kodzie; Socket.io in-memory fallback gdy brak REDIS_URL |
| PostGIS | Supabase (per Sprint 3); używane w spots.ts ✅ |
| Sentry | API + Web + Mobile skonfigurowane ✅ |
| CI (GitHub Actions) | Pinned ubuntu-24.04 ✅; type-check + lint + API tests + web build + secret scan |
| APK distribution | GitHub Releases v1.0.0-preview (121MB, preview profile) ✅ |
| Testy API | 40+ testów (Vitest) ✅ |
| Testy Web/Mobile/E2E | ❌ BRAK |
| EAS Build | development/preview/production profiles ✅ |
| OTA Updates | expo-updates skonfigurowane ✅ |

### Operacyjne zadania oczekujące

1. **Google Maps key rotation** — `docs/GOOGLE_MAPS_KEY_ROTATION.md`
2. **R2 credentials** — STORAGE_NOT_CONFIGURED dopóki `R2_*` env vars nie ustawione na Render.com
3. **REDIS_URL** — Socket.io in-memory bez tego; wymagane dla multi-node presence
4. **Stripe live keys** — billing działa, wymaga prawdziwych `STRIPE_*` zmiennych

---

## 7. Roadmap — co zostało do zbudowania

### Priorytet 1 — Natychmiastowe naprawy (bugi)

- [ ] **BUG-1b:** Filtrować soft-deleted explorers w journey search (`apps/api/src/routes/search.ts`)
- [ ] **BUG-WEB-1:** Admin pages — czytać token z sessionStorage zamiast manual JWT paste
- [ ] **BUG-WEB-2:** Profile redirect → `/login?returnUrl=/profile` zamiast `/forum`

### Priorytet 2 — Tech debt web (cleanup)

- [ ] Usunąć `serverExternalPackages: ['mapbox-gl']` z `next.config.js`
- [ ] Usunąć `NEXT_PUBLIC_MAPBOX_TOKEN` z `.env.local` i `.env.production`
- [ ] Usunąć martwe deps z web `package.json`: `@travelpoint/api-client`, `@travelpoint/types`, `@googlemaps/js-api-loader`
- [ ] Usunąć `getPost()` z `src/lib/journal.ts` (dead code)

### Priorytet 3 — Uzupełnienia UI mobile

- [ ] Push routing dla `NEARBY_EXPLORER` (+ sprawdzić pozostałe 5 typów) w `_layout.tsx`
- [ ] `<Stack.Screen>` entries dla `explorer/[handle]`, `saved`, `plans` z `headerShown: false`
- [ ] Circle settings/edit screen dla założycieli
- [ ] Paginacja: discover feed, circles browse, journeys list
- [ ] `new-circle.tsx` — zastąpić lokalny Zod schematem z `@travelpoint/validation`
- [ ] Usunąć `lib/secureStorage.ts` (dead code)

### Priorytet 4 — Uzupełnienia API

- [ ] DELETE `/api/admin/journal/posts/:slug`
- [ ] Paginacja: DM inbox, journeys list, circles list
- [ ] Forum: reply edit, reactions na postach
- [ ] Ujednolicenie bloków (usunąć duplikat z explorers.ts lub moderation.ts)
- [ ] `WEEK_ACTIVE` trust event — dodać cron lub weekly batch
- [ ] `pushReceipts.ts` — zastąpić in-process Map trwałym storage (Redis/DB)
- [ ] Zsynchronizować `packages/api-client` endpoints z faktycznymi trasami serwera

### Priorytet 5 — Infrastruktura / produkcja

- [ ] Usunąć martwe pliki Railway (`railway.json`, `apps/api/railway.toml`, `apps/api/railway.json`)
- [ ] E2E testy web + mobile
- [ ] Lighthouse ≥90 audit
- [ ] Staging environment
- [ ] Backup/PITR drill (`docs/BACKUP_RESTORE_DRILL.md`)
- [ ] SLO, alerting, uptime monitoring
- [ ] App Store / Play Store release checklist

---

## 8. Stack — wersje aktualne

| Komponent | Wersja |
|---|---|
| Next.js (web) | ^15.5.25 |
| React Native | 0.81.5 |
| Expo SDK | ~54.0.35 |
| React | 19.1.0 |
| RN Reanimated | ~4.1.1 |
| TanStack Query | ^5.45.1 |
| Zustand | ^4.5.4 |
| Socket.io | ^4.7.5 (client), ^4.x (server) |
| Supabase JS | ^2.112.3 |
| React New Architecture | ENABLED (`newArchEnabled: true`) |
| framer-motion | latest (web animations) |

---

## 9. Dokumentacja — decyzje

| Plik | Status |
|---|---|
| `docs/PROJECT_STATE_2026-09-30.md` | ARCHIWUM — zastąpiony tym dokumentem |
| `docs/PROJECT_AUDIT_2026-06-10.md` | KEEP (HISTORYCZNY) |
| `docs/ARCHITECTURE.md` | Wymaga update: Next.js 14→15, usunąć Mapbox refs |
| `docs/SECURITY.md` | KEEP — aktualny |
| `docs/HIDDEN_LAYER.md` | KEEP — poprawnie zaimplementowany |
| `docs/DESIGN_SYSTEM.md` | KEEP — tokeny zgodne z kodem |
| `docs/DEPLOYMENT.md` | UPDATE — usunąć Mapbox refs, dodać Supabase web vars, APK/GitHub Releases |
| `docs/RUNBOOKS.md` | KEEP — aktualny |
| `docs/BACKUP_RESTORE_DRILL.md` | KEEP |
| `docs/GOOGLE_MAPS_KEY_ROTATION.md` | KEEP — zadanie otwarte |
