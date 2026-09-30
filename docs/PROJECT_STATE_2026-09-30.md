# TravelPoint — Aktualny stan projektu

**Audyt:** 30 września 2026 | Poprzedni audyt: `docs/PROJECT_AUDIT_2026-06-10.md` (historyczny)
**Metodologia:** Każdy plik źródłowy zbadany przez 3 niezależne agenty (API, Mobile, Web+Docs).

---

## 0. Podsumowanie wykonawcze

| Obszar | Czerwiec 2026 | **Wrzesień 2026** |
|---|---|---|
| Produkt ogółem | 63% | **~80%** |
| Web (WORLD) | 68% | **~83%** |
| Mobile (CORE) | 70% | **~82%** |
| API (ENGINE) | 66% | **~76%** |
| Infrastruktura | 45% | **~55%** |

**Gotowość do zamkniętego MVP:** TAK — po naprawieniu 3 bugów poniżej.
**Gotowość do produkcji publicznej:** NIE — brakuje cookie banner (RODO), admin route protection, PostGIS in production.

---

## 1. Aktywne bugi wymagające natychmiastowej naprawy

### [BUG-1] CRITICAL — Journey.deletedAt nie istnieje w Prisma schema
- **Plik:** `apps/api/src/routes/search.ts` line ~162
- **Problem:** Raw SQL `WHERE j."deletedAt" IS NULL` — pole `deletedAt` NIE istnieje w modelu `Journey` w `prisma/schema.prisma`
- **Skutek:** Endpoint `GET /api/search?type=journeys` zwraca 500 w runtime
- **Fix:** Usunąć klauzulę `j."deletedAt" IS NULL` z raw SQL

### [BUG-2] HIGH — Colors.borderSand nie istnieje w packages/theme
- **Plik:** `apps/mobile/app/(tabs)/_layout.tsx` line ~216
- **Problem:** `Colors.borderSand` nie jest tokenem w `packages/theme/src/colors.ts` → `undefined` jako `borderTopColor` na tab barze
- **Fix:** Zastąpić `Colors.borderSand` → `Colors.steel`

### [BUG-3] HIGH — Colors.backgroundGreen nie istnieje w packages/theme
- **Plik:** `apps/mobile/app/(tabs)/discover.tsx` (StyleSheet)
- **Problem:** `Colors.backgroundGreen` nie istnieje → `undefined` jako kolor tła
- **Fix:** Zastąpić `Colors.backgroundGreen` → `Colors.abyss`

---

## 2. Stan funkcjonalny — WORLD (apps/web)

### Strony (Next.js 15 App Router)

| Strona | Status | Kompletność |
|---|---|---|
| Landing page | Dynamiczna (spotCount z API) | ✅ 90% |
| `/map` — Discovery Map | Google Maps + OSM fallback, filtry, SpotPanel | ✅ 90% |
| `/journal` | Lista artykułów — **STATIC hardcoded**, niezwiązany z DB/CMS | ⚠️ 55% |
| `/journal/[slug]` | Static SSG z hardcoded danych | ⚠️ 55% |
| `/forum` | Pełna implementacja z auth, paginacją, kategoriami | ✅ 85% |
| `/forum/[slug]` | Post + replies + ReplyForm, JSON-LD | ✅ 85% |
| `/explorer/[handle]` | SSR profil z JSON-LD, OG metadata | ✅ 80% |
| `/explorers` | Wyszukiwarka (wymaga auth token) | ✅ 75% |
| `/profile` | Własny profil read-only; edycja tylko w mobile | ✅ 75% |
| `/billing` | Stripe Checkout + Portal, tier display | ✅ 85% |
| `/admin` | Incident queue, suspend, analytics, journal CMS | ⚠️ 70% (brak server-side route protection) |
| `/verify-email` | Supabase-based | ✅ 90% |
| `/reset-password` | Supabase-based | ✅ 90% |
| `/regulamin`, `/polityka-prywatnosci`, `/rodo` | Pełna treść prawna + RODO request form | ✅ 95% |
| `/not-found` | Zaprojektowana 404 | ✅ 100% |
| `error.tsx` + `global-error.tsx` | Error boundaries | ✅ 90% |

### Krytyczne braki web

1. **Cookie banner** — BRAK jakiegokolwiek consent cookies → naruszenie RODO
2. **Journal static/dynamic disconnect** — CMS w `/admin/journal` zarządza postami w DB, ale `/journal` nadal czyta z hardcoded `src/lib/journal.ts`
3. **Admin route protection** — strony `/admin/*` otwarte dla każdego; ochrona tylko przez JWT paste w formularzu UI
4. **mapbox-gl dead dependency** — `package.json` ma `mapbox-gl ^3.4.0` mimo przejścia na Google Maps
5. **NEXT_PUBLIC_MAPBOX_TOKEN w CI** — sekret w `.github/workflows/ci.yml` wskazuje na nieistniejącą zmienną

---

## 3. Stan funkcjonalny — CORE (apps/mobile)

### Feature Matrix

| Funkcja | Ekran | API | Realtime | UI Complete |
|---|---|---|---|---|
| Login / Registration | ✅ | ✅ Supabase | — | ✅ |
| Onboarding (3 kroki) | ✅ | ✅ | — | ✅ |
| Atlas — mapa, piny, klastry | ✅ | ✅ | — | ✅ (styl: domyślny Google Maps per życzenie użytkownika) |
| Category filter (7 typów) | ✅ | ✅ | — | ✅ |
| Secret Drop ephemeral piny | ✅ | ✅ | — | ✅ |
| Presence / Nearby Explorers | ✅ | ✅ | ✅ socket | ✅ |
| GPS Journey Recording | ✅ | ✅ | — | ✅ (background + file persist) |
| SpotPreviewSheet | ✅ | — | — | ✅ |
| Discover Feed | ✅ | ✅ | — | ⚠️ brak paginacji, brak pull-to-refresh |
| Nearby Spots list | ✅ | ✅ | — | ⚠️ brak paginacji |
| Circles list | ✅ | ✅ | — | ⚠️ brak search, brak unread per row |
| Circle detail + join/leave | ✅ | ✅ | — | ⚠️ brak map, brak founder settings |
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
| Saved Worlds | ✅ `saved.tsx` | ✅ | — | ✅ |
| Explorer public profile | ✅ | ✅ | — | ✅ |
| Block/Unblock | ✅ | ✅ | — | ✅ |
| Identity / profil własny | ✅ | ✅ | — | ✅ |
| Avatar upload (S3 presigned) | ✅ | ✅ | — | ✅ |
| Rank bar + RankUpModal | ✅ | ✅ | — | ✅ |
| Signals / Notifications (infinite) | ✅ | ✅ | ✅ socket | ✅ |
| GDPR export + usunięcie konta | ✅ | ✅ | — | ✅ |
| Billing / Plans (Stripe web) | ✅ `plans.tsx` | ✅ | — | ✅ |
| Search (full-screen modal) | ✅ | ✅ | — | ✅ |
| Biometric lock | ✅ `_layout.tsx` | — | — | ✅ |
| Offline Queue + Replay | lib | ✅ | — | ✅ |
| OTA Updates | `_layout.tsx` | ✅ | — | ✅ |
| Push + Deep Links | `_layout.tsx` | ✅ | — | ✅ |
| Query Cache Persistence | lib | — | — | ✅ |
| **Forum screen** | ❌ BRAK | — | — | ❌ |

### Brakujące ekrany mobile

1. **Forum** — `FORUM_REPLY` jest w i18n i signalLabels, sygnał istnieje, ale brak jakiegokolwiek ekranu
2. **Push routing dla 6 typów** — `NEARBY_EXPLORER`, `SPOT_COMMENT`, `CIRCLE_INVITE`, `JOURNEY_LIKE`, `RANK_UP`, `FORUM_REPLY` nie mają handlerów w `_layout.tsx`

### Drobne braki

- `explorer/[handle]`, `saved`, `plans` nie mają `<Stack.Screen>` entries → renderują z domyślnym headerem
- `new-circle.tsx` używa lokalnego Zod schema zamiast z `@travelpoint/validation` (naruszenie CLAUDE.md rule 9)
- `lib/secureStorage.ts` — dead code (auth używa Supabase SecureStore adaptera bezpośrednio)
- Feed bez paginacji, circles browse bez paginacji, journeys bez paginacji

---

## 4. Stan funkcjonalny — ENGINE (apps/api)

### Route completeness

| Route group | % | Kluczowe braki |
|---|---|---|
| Auth | 35% | Tylko Supabase complete-signup i invite. Brak login/logout/refresh/verify/reset — delegowane do Supabase Auth, ale api-client ma stubs do nieistniejących tras |
| Spots | 85% | Brak: comment delete, paginacji saved/comments, circleId update w PATCH |
| Explorers | 80% | TierLimits NIE egzekwowane server-side; lastSeenAt nigdy nie aktualizowane |
| Journeys | 75% | Hard delete zamiast soft delete (niespójność ze Spots); brak paginacji |
| Circles | 65% | Brak: PATCH circle, member management, transfer ownership, DELETE circle |
| Transmissions | 70% | Brak: delete, unread count, cursor pagination na inbox |
| Signals | 80% | Brak: single seen, delete; api-client oczekuje tras które nie istnieją |
| Search | 70% | Journey search SQL crash (BUG-1 powyżej); brak circles/forum w search |
| Feed | 55% | Brak paginacji; tylko 40 items/7 dni; brak REACTION/CIRCLE_ACTIVITY typów |
| Payments | 75% | Brak: cancel endpoint, invoices, incomplete_expired handling |
| Moderation | 80% | Bloki zduplikowane w 2 routes; brak WARN action; brak content delete endpoint |
| Forum | 75% | Brak: reply edit, reactions na postach |
| Journal | 70% | Brak DELETE /admin/journal/posts/:slug |
| Analytics | 60% | Tylko event ingestion + summary; brak granularnych queries |

### Krytyczna rozbieżność: api-client vs serwer

`packages/api-client/src/endpoints/auth.ts` definiuje endpointy `join`, `login`, `refresh`, `logout` które **NIE ISTNIEJĄ** na serwerze. Każde wywołanie tych metod zwróci 404.

`packages/api-client/src/endpoints/signals.ts` oczekuje `/api/signals/:id/read` i `/api/signals/read-all` — faktyczna trasa to `PATCH /api/signals/seen`.

### Prisma Schema — stan

- 27 modeli pokrywających wszystkie domeny
- Brak: `Waitlist` (tylko AuditLog), `ExplorerFollow`, `PushNotificationLog`
- **Brak folderu `prisma/migrations/`** — schemat zarządzany przez `prisma db push` lub `init.sql`. Brak historii migracji produkcyjnych.
- Journey model nie ma `deletedAt` (DELETE jest hard delete w journeys.ts)
- `WEEK_ACTIVE` i `MODERATION_PENALTY` TrustEventType zdefiniowane, ale nigdy nie wywoływane (brak crona)
- `RefreshToken` i `AuthToken` modele + `crypto.ts` (Argon2id) istnieją ale żadna trasa ich nie używa (auth w Supabase)

### Socket.io — stan

- `circle:join` sprawdza membership ✅
- `circle:message` sprawdza membership ✅
- Redis adapter: TAK jeśli `REDIS_URL` ustawiony; in-memory fallback ✅
- Presence throttle: in-process Map (nie skaluje na multi-node) ⚠️

---

## 5. Stan infrastruktury

| Komponent | Stan |
|---|---|
| API deployment | Render.com (render.yaml — aktywne) |
| Railway pliki (railway.json, railway.toml, nixpacks.toml) | Martwy kod — można usunąć lub zostawić |
| Web deployment | Vercel (zakładane) |
| Baza danych | Supabase PostgreSQL (Prisma PrismaPg adapter) |
| File storage | Cloudflare R2 — skonfigurowane w env; endpoint zwraca 503 gdy env nie ustawione |
| Push | Expo Push API — w pełni zaimplementowane |
| Email | Resend — welcome/verify/reset/invite emails gotowe |
| Redis | ioredis — w kodzie; adapter Socket.io automatycznie aktywny gdy REDIS_URL |
| PostGIS | Zainstalowane na Supabase (per Sprint 3); używane w spots.ts |
| Sentry | API + Web + Mobile — wszystkie skonfigurowane |
| CI (GitHub Actions) | type-check (API/Web/Mobile) + lint (wszystkie) + API tests + web build + secret scan |
| Testy API | 40+ testów (Vitest) |
| Testy Web/Mobile/E2E | ❌ BRAK |
| EAS Build | Profile: development/preview/production w eas.json |
| OTA Updates | Skonfigurowane (expo-updates, project ID gotowe) |

### Operacyjne zadania oczekujące (wymagają akcji poza kodem)

1. **Google Maps key rotation** — historyczny klucz nadal aktywny; instrukcja w `docs/GOOGLE_MAPS_KEY_ROTATION.md`
2. **R2 credentials** — STORAGE_NOT_CONFIGURED dopóki `R2_*` env vars nie ustawione na Render.com
3. **REDIS_URL** — Socket.io spada do in-memory bez tego; wymagane dla multi-node presence
4. **Stripe live keys** — billing endpoint działa, ale wymaga prawdziwych `STRIPE_*` zmiennych
5. **GitHub CI secrets** — `NEXT_PUBLIC_MAPBOX_TOKEN` do zastąpienia `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## 6. Roadmap — co zostało do zbudowania

### Priorytet 1 — Natychmiastowe naprawy (bugi)

- [ ] **BUG-1:** Usunąć `j."deletedAt" IS NULL` z `apps/api/src/routes/search.ts` (search journeys crash)
- [ ] **BUG-2:** `Colors.borderSand` → `Colors.steel` w `apps/mobile/app/(tabs)/_layout.tsx`
- [ ] **BUG-3:** `Colors.backgroundGreen` → `Colors.abyss` w `apps/mobile/app/(tabs)/discover.tsx`

### Priorytet 2 — Uzupełnienia UI mobile

- [ ] Forum screen w mobile (ekran + hook `useForumPosts`/`useForum`)
- [ ] Push routing dla: `SPOT_COMMENT`, `CIRCLE_INVITE`, `JOURNEY_LIKE`, `RANK_UP`, `FORUM_REPLY` w `_layout.tsx`
- [ ] `<Stack.Screen>` entries dla `explorer/[handle]`, `saved`, `plans` z `headerShown: false`
- [ ] Circle settings/edit dla założycieli (PATCH /api/circles/:slug — wymaga też backend endpoint)
- [ ] Paginacja: feed (discover), circles browse, journeys list

### Priorytet 3 — Uzupełnienia API

- [ ] DELETE /api/admin/journal/posts/:slug (journal management kompletny)
- [ ] Circle management: PATCH /api/circles/:slug, DELETE /api/circles/:slug, promote/kick members
- [ ] Ujednolicenie bloków: usunąć duplikat z explorers.ts lub moderation.ts
- [ ] TierLimits enforcement server-side (FREE: savedWorlds≤25)
- [ ] `lastSeenAt` — aktualizacja przy każdym requireAuth
- [ ] Paginacja na: DM inbox, GET /api/journeys/me, GET /api/circles

### Priorytet 4 — Jakość kodu

- [ ] `new-circle.tsx` — zastąpić lokalny Zod schema schematem z `@travelpoint/validation`
- [ ] `packages/api-client` — zsynchronizować endpoints z faktycznymi trasami serwera
- [ ] Usunąć dead code: `lib/secureStorage.ts`, `mapbox-gl` z package.json web, `@types/mapbox-gl`
- [ ] `WEEK_ACTIVE` trust event — dodać cron lub weekly batch job
- [ ] `pushReceipts.ts` — zastąpić in-process Map trwałym storage (Redis lub DB)

### Priorytet 5 — Web uzupełnienia

- [ ] **Cookie banner** — wymagane prawnie (RODO compliance)
- [ ] Journal dynamic — podpiąć `/journal` pod `GET /api/journal/posts` zamiast statycznego pliku
- [ ] Admin server-side route protection — middleware JWT na `/admin/*` routach
- [ ] Usunąć `mapbox-gl` + `@types/mapbox-gl` + `NEXT_PUBLIC_MAPBOX_TOKEN` z CI

### Priorytet 6 — Produkcja (Sprint 4 gates)

- [ ] E2E testy web + mobile
- [ ] Lighthouse ≥90 audit
- [ ] Staging environment
- [ ] Backup/PITR drill (instrkcja w `docs/BACKUP_RESTORE_DRILL.md`)
- [ ] SLO, alerting, uptime monitoring
- [ ] App Store / Play Store release checklist

---

## 7. Dokumentacja — decyzje

| Plik | Decyzja | Powód |
|---|---|---|
| `docs/PROJECT_AUDIT_2026-06-10.md` | KEEP (z nagłówkiem HISTORYCZNY) | Archiwum; wiele ustaleń naprawionych od czerwca |
| `docs/ARCHITECTURE.md` | UPDATE — Next.js 14→15, usuń Mapbox refs | Wersja Next.js nieaktualna, Mapbox dead ref |
| `docs/SECURITY.md` | KEEP | Zasady i threat model nadal aktualne |
| `docs/HIDDEN_LAYER.md` | KEEP | System poprawnie zaimplementowany po Sprint 2 gate |
| `docs/DESIGN_SYSTEM.md` | KEEP | Tokeny zgodne z kodem |
| `docs/DEPLOYMENT.md` | UPDATE — usuń Mapbox, dodaj Supabase web vars | Nieaktualne env vars |
| `docs/SPRINT_4_PRODUCTION_HARDENING.md` | UPDATE — jeden secret name | `NEXT_PUBLIC_MAPBOX_TOKEN` → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| `docs/RUNBOOKS.md` | KEEP | Aktualne i precyzyjne |
| `docs/BACKUP_RESTORE_DRILL.md` | KEEP | Aktualne |
| `docs/GOOGLE_MAPS_KEY_ROTATION.md` | KEEP | Zadanie nadal operacyjnie otwarte |
| `railway.json`, `apps/api/railway.toml`, `apps/api/railway.json` | Martwe pliki — można usunąć | Render.com jest aktywnym deploymentem |

---

## 8. Stack — wersje aktualne

| Komponent | Wersja w kodzie |
|---|---|
| Next.js (web) | ^15.5.25 |
| React Native | 0.81.5 |
| Expo SDK | ~54.0.35 |
| React | 19.1.0 |
| RN Reanimated | ~4.1.1 |
| Fastify | — |
| Prisma | — |
| TanStack Query | ^5.45.1 |
| Zustand | ^4.5.4 |
| Socket.io | ^4.7.5 (client), ^4.x (server) |
| Supabase JS | ^2.112.3 |
| React New Architecture | ENABLED (`newArchEnabled: true`) |
