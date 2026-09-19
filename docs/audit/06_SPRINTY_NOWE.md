# Nowe sprinty — plan działania (zweryfikowany code-read)
**Data:** 2026-09-19  
**Podstawa:** docs/audit/05_WERYFIKACJA_PELNA.md — wszystkie znaleziska zweryfikowane w kodzie  
**Zasada:** Każde zadanie odpowiada BRAKUJĄCEJ lub ZEPSUTEJ rzeczy. Zero "zrób to co już jest".

---

## S-17 — Krytyczne bugi i bezpieczeństwo
**Szacowany nakład:** 1 sesja (M)  
**Bramka wejścia:** stan po S-15 (`0dc3875`)  
**Bramka wyjścia:** SEC-01, BUG-01–06, BUG-10–13 zamknięte; CI zielone

### S17-01 — URL injection w transmissions.tsx (SEC-01)
**Plik:** `apps/mobile/app/modals/transmissions.tsx:~247`  
**Co:** `api.get('/api/explorers/${handle}')` bez `encodeURIComponent` — path injection  
**Fix:** Owinąć `handle` w `encodeURIComponent(handle.replace('@',''))` przed interpolacją  
**Kryteria:** `handle = 'test/../../admin'` → URL zakodowany, nie traversal  
**Nakład:** XS

### S17-02 — Photo upload bug: sizeBytes ?? 0 (BUG-01)
**Pliki:** `apps/api/src/routes/spots.ts:516`, `routes/explorers.ts:105`, `services/storage.ts:64`  
**Co:** `finalizePhoto(sizeBytes ?? 0)` → `validatePhoto(0)` odrzuca jako `PHOTO_TOO_LARGE`  
**Fix:** Przenieść `validatePhoto` przed wywołaniem `HeadObject` lub zmienić kontrakt — gdy `sizeBytes` undefined, pominąć pre-walidację rozmiaru i użyć wartości z `HeadObject`  
**Kryteria:** Upload bez `sizeBytes` w body → 200 (nie PHOTO_TOO_LARGE)  
**Nakład:** S

### S17-03 — Feed: blokady nie filtrują (BUG-02)
**Plik:** `apps/api/src/routes/feed.ts`  
**Co:** Spoty i journeys zablokowanych użytkowników pojawiają się w `GET /api/feed`  
**Fix:** Wywołać `getBlockedExplorerIds(explorerId)` na początku handlera; dodać `id: { notIn: blockedIds }` do obu zapytań `prisma.spot.findMany` i `prisma.journey.findMany`  
**Kryteria:** Po zablokowaniu exploratora X, jego spoty znikają z feedu aktualnego usera  
**Nakład:** S

### S17-04 — Spot: stan "saved" nie seedowany z API (BUG-05)
**Plik:** `apps/mobile/app/spot/[id].tsx:567`  
**Co:** `useState(false)` — zawsze "niezapisany" przy pierwszym ładowaniu  
**Fix:** Sprawdzić co zwraca `useSpot(id)` — jeśli zawiera `isSaved` lub `saved`, użyć go jako wartości inicjalnej; ewentualnie dodać `isSaved` do API response w `GET /api/spots/:id`  
**Kryteria:** Zapisany spot otwiera się z aktywnym ikoną zapisu  
**Nakład:** S

### S17-05 — Explorer: stan "blocked" nie seedowany (BUG-06)
**Plik:** `apps/mobile/app/explorer/[handle].tsx:~73`  
**Co:** `useState(false)` — błędna etykieta przycisku blokady  
**Fix:** `GET /api/explorers/:handle` powinien zwracać `isBlockedByMe: boolean`; inicjalizować stan z tej wartości  
**Kryteria:** Profil zablokowanego exploratora otwiera się z "Odblokuj" od razu  
**Nakład:** S (API + mobile)

### S17-06 — Tab layout: boolean dependency (BUG-10)
**Plik:** `apps/mobile/app/(tabs)/_layout.tsx:48`  
**Co:** `[unseenCount > 0]` zamiast `[unseenCount]`  
**Fix:** Zmienić dependency array na `[unseenCount]`  
**Kryteria:** Animacja pulsowania restaruje się gdy count zmienia się z 1 na 5  
**Nakład:** XS

### S17-07 — RodoRequestForm: text-danger → text-ember (BUG-11)
**Plik:** `apps/web/app/rodo/RodoRequestForm.tsx:132`  
**Fix:** Zamienić `text-danger` na `text-ember`  
**Nakład:** XS

### S17-08 — Login: angielski tekst → i18n (BUG-12)
**Plik:** `apps/mobile/app/(auth)/login.tsx:113`  
**Fix:** Zastąpić `"Request Access"` przez odpowiedni string z pliku i18n  
**Nakład:** XS

### S17-09 — Atlas: błąd mapy nie dla userów (BUG-13)
**Plik:** `apps/mobile/app/(tabs)/index.tsx:788`  
**Fix:** Zamienić techniczny string Google Cloud Console na user-friendly komunikat pl  
**Nakład:** XS

### S17-10 — Cookie tp_access_token → HttpOnly (SEC-02)
**Plik:** `apps/web/src/lib/webAuth.ts:~19`  
**Co:** Cookie ustawiany przez `document.cookie` — dostępny dla JS, podatny na XSS  
**Fix:** Przenieść ustawienie cookie do server-side (`Set-Cookie` nagłówek z `httpOnly: true` przez API route lub middleware). Wymaga przeprojektowania webAuth flow.  
**Kryteria:** Cookie `tp_access_token` nie jest dostępny przez `document.cookie`  
**Nakład:** M  
**UWAGA:** To jest największy task w S-17 — wymaga analizy czy middleware.ts i admin pages działają po zmianie

---

## S-18 — Journal system: połącz DB z publicznym frontendem
**Szacowany nakład:** 1 sesja (M)  
**Bramka wejścia:** S-17 ukończony  
**Bramka wyjścia:** Journal publiczny czyta z DB; admin CMS obsługuje cały cykl życia posta

### S18-01 — Publiczny journal: zamień statyczny plik na API (BUG-03 — KRYTYCZNY)
**Pliki:**  
- `apps/web/app/journal/page.tsx` — zastąpić `JOURNAL_POSTS` przez fetch z `GET /api/journal/posts`  
- `apps/web/app/journal/[slug]/page.tsx` — zastąpić `getPost(slug)` przez fetch z `GET /api/journal/posts/:slug`  
- Usunąć lub zachować jako fallback: `apps/web/src/lib/journal.ts`  
**Kryteria:** Post stworzony w admin CMS jest widoczny na `/journal` i `/journal/:slug` bez rebuild  
**Nakład:** M  
**Uwaga:** `dangerouslySetInnerHTML` w `[slug]/page.tsx:181` — dodać sanitizację (np. `dompurify` na serverze) jeśli content pochodzi z DB

### S18-02 — OG image: Next.js 15 async params (BUG-04)
**Plik:** `apps/web/app/journal/[slug]/opengraph-image.tsx:11`  
**Fix:** Zmienić `interface Props { params: { slug: string } }` na `interface Props { params: Promise<{ slug: string }> }` i dodać `const { slug } = await params`  
**Sprawdzić:** czy forum `app/forum/[slug]/opengraph-image.tsx` ma ten sam problem  
**Kryteria:** OG image dla `/journal/[slug]` generuje się bez runtime error  
**Nakład:** XS

### S18-03 — Admin CMS: dodać usuwanie postów
**Plik:** `apps/web/app/admin/journal/page.tsx`  
**Co:** Brak delete — tylko zmiana statusu na ARCHIVED  
**Fix:** Dodać `DELETE /api/admin/journal/posts/:slug` endpoint + przycisk delete z konfirmacją w UI  
**Kryteria:** Admin może usunąć post; post znika z listingu i publicznych stron  
**Nakład:** S (API + web)

### S18-04 — Journal: sanitizacja HTML
**Plik:** `apps/web/app/journal/[slug]/page.tsx:181`  
**Co:** `dangerouslySetInnerHTML={{ __html: post.content }}` — po podłączeniu DB, content pochodzi od adminów (nie hardkodowany HTML)  
**Fix:** Sanitizować HTML server-side przed renderem (dozwolone tagi: `p, h2, h3, ul, ol, li, a, strong, em, img, blockquote`)  
**Nakład:** S

---

## S-19 — Jakość kodu: walidacja i spójność API
**Szacowany nakład:** 1 sesja (L)  
**Bramka wejścia:** S-17 ukończony  
**Bramka wyjścia:** KOD-01–07 zamknięte; CI zielone

### S19-01 — Raw body/query casts → Zod schemas (KOD-01)
**9 miejsc:**  
- `routes/auth.ts:164` — `{ recipientEmail? }` body  
- `routes/spots.ts:705` — komentarz body  
- `routes/spots.ts:233` — public query params  
- `routes/circles.ts:96` — inviteCode body  
- `routes/circles.ts:237` — recipientId body  
- `routes/forum.ts:29` — query params  
- `routes/analytics.ts:35` — query params  
- `routes/transmissions.ts:193` — circle query params  
- `routes/moderation.ts:184` — suspend reason body  
**Fix:** Dla każdego — dodać named Zod schema w `packages/validation/` lub inline; zastąpić cast  
**Kryteria:** `grep -rn "req.body as {" apps/api/src/routes/` → 0 wyników  
**Nakład:** M

### S19-02 — journal.ts: inline auth → requireModerator (KOD-02)
**Plik:** `apps/api/src/routes/journal.ts:22-35`  
**Fix:** Zastąpić ręczne `verifySupabaseJwt()` + role check przez `preHandler: [requireModerator]`  
**Kryteria:** Typecheck przechodzi; endpoint działa tak samo  
**Nakład:** S

### S19-03 — explorers.ts: dynamic import → static (KOD-03)
**Plik:** `apps/api/src/routes/explorers.ts:441`  
**Fix:** Przenieść `import { fuzzCoordinates } from '@travelpoint/geo'` na górę pliku  
**Nakład:** XS

### S19-04 — syncSpotLocation: pusty catch → log (BUG-09)
**Plik:** `apps/api/src/routes/spots.ts:147`  
**Fix:** `catch (err) { logger.warn(err, 'syncSpotLocation: PostGIS update failed') }`  
**Nakład:** XS

### S19-05 — Usunąć duplikację blok routes (KOD-05)
**Pliki:** `routes/moderation.ts:74+87` + `routes/explorers.ts`  
**Decyzja:** Zachować `POST /api/explorers/:id/block` (kanoniczny URL); oznaczyć lub usunąć `POST /api/blocks/:explorerId` z moderation.ts  
**Kryteria:** Jeden URL dla blokowania; mobile nadal działa  
**Nakład:** S

### S19-06 — circles.ts: cascade check przy delete (BUG-07)
**Plik:** `apps/api/src/routes/circles.ts:~188`  
**Fix:** Przed `circle.delete` — sprawdzić czy istnieją spoty z `circleId` → albo przenieść do `accessLevel: PUBLIC` albo soft-delete wszystkie CIRCLE_ONLY spoty koła w transakcji  
**Kryteria:** DELETE założyciela koła nie zostawia osieroconych CIRCLE_ONLY spotów  
**Nakład:** S

### S19-07 — migration-check: usunąć continue-on-error (CI-01)
**Plik:** `.github/workflows/ci.yml:161`  
**Fix:** Usunąć `continue-on-error: true` z job `migration-check`  
**Kryteria:** Schema drift blokuje merge PR  
**Nakład:** XS

### S19-08 — CI: dodać needs: dependencies (CI-02)
**Plik:** `.github/workflows/ci.yml`  
**Fix:** `test-api` i `build-web` powinny mieć `needs: [type-check, lint]` — nie ma sensu testować gdy type-check failuje  
**Nakład:** XS

### S19-09 — Usunąć martwy kod (KOD-06)
**Pliki:** `services/email.ts:147+156` (dead functions), `next.config.js:25` (`mapbox-gl`), `ci.yml` (duplikacja secret-scan)  
**Nakład:** XS

---

## S-20 — Testy: pokrycie krytycznych ścieżek
**Szacowany nakład:** 1-2 sesje (XL)  
**Bramka wejścia:** S-17 + S-19 ukończone (bugi naprawione przed testami)  
**Bramka wyjścia:** Łącznie ≥70 przypadków testowych; billing, feed, auth, forum pokryte

### S20-01 — billing.test.ts: 7 scenariuszy Stripe (KOD-07 + finansowe)
**Plik:** `apps/api/src/services/billing.test.ts` (NOWY)  
**Scenariusze:**
1. `checkout.session.completed` → tier=PRO ustawiony
2. `customer.subscription.updated` downgrade → tier=FREE
3. `customer.subscription.deleted` → tier=FREE
4. Duplikat `checkout.session.completed` (idempotency) → brak duplikatu DB
5. Błędny Stripe signature → 400
6. `invoice.payment_failed` (nowy!) → audit log, tier nie zmieniony do subscription.updated
7. Brakujące `STRIPE_SECRET_KEY` → `isBillingConfigured()` zwraca false, endpoint 503  
**Nakład:** M

### S20-02 — feed.test.ts: agregacja i blokady
**Plik:** `apps/api/src/routes/feed.test.ts` (NOWY)  
**Scenariusze:**
1. Feed zwraca spoty i journeys ze wspólnych kół
2. Spoty zablokowanego exploratora NIE pojawiają się (test regresji dla BUG-02)
3. Feed nie zawiera własnych aktywności (tylko circlemates)
4. Komentarze do własnych spotów pojawiają się (inna reguła)
5. Feed = [] gdy brak kół  
**Nakład:** M

### S20-03 — auth.test.ts: complete-signup flow
**Plik:** `apps/api/src/routes/auth.test.ts` (NOWY)  
**Scenariusze:**
1. Poprawna rejestracja → explorer w DB + trust punkty dla invitadora
2. Duplikat (idempotency) → 200 bez duplikatu
3. Nieprawidłowy JWT Supabase → 401
4. Zajęty handle → 409 HANDLE_TAKEN
5. Invite code invite → kod skonsumowany, circle joined  
**Nakład:** M

### S20-04 — spots.test.ts: rozszerzyć o photo upload
**Plik:** `apps/api/src/routes/spots.test.ts` (rozszerzenie)  
**Scenariusze (nowe):**
1. `POST /api/spots/:id/photos/complete` bez `sizeBytes` → 200 (test regresji BUG-01)
2. `POST /api/spots/:id/photos/complete` z niepoprawnym MIME → 400
3. Rate limit komentarzy (3/minutę) → 429 po przekroczeniu  
**Nakład:** S

### S20-05 — forum.test.ts: podstawowe pokrycie
**Plik:** `apps/api/src/routes/forum.test.ts` (NOWY)  
**Scenariusze:**
1. Tworzenie posta → 201 z slug
2. Anonimowy delete cudzego posta → 403
3. Moderator lock → 200, `lockedAt` ustawione
4. Delete własnej repliki → 200  
**Nakład:** M

### S20-06 — env.test.ts: dodać SUPABASE_JWT_SECRET
**Plik:** `apps/api/src/config/env.test.ts:36-41`  
**Fix:** Dodać `'SUPABASE_JWT_SECRET'` do `it.each` tablicy wymaganych secretów  
**Nakład:** XS

### S20-07 — vitest.config.ts: coverage i timeout
**Plik:** `apps/api/vitest.config.ts` (NOWY)  
**Zawartość:** timeout 10000ms, reporter verbose, coverage provider v8, exclude prisma migrations  
**Nakład:** S

---

## S-21 — Mobile: brakujące funkcje i poprawki UX
**Szacowany nakład:** 1 sesja (M)  
**Bramka wejścia:** S-17 ukończony

### S21-01 — Forgot password w mobile (FEAT-01)
**Pliki:**  
- `apps/mobile/app/(auth)/login.tsx` — dodać link "Zapomnij hasło?"  
- `apps/mobile/app/(auth)/forgot-password.tsx` (NOWY) — formularz email → `supabase.auth.resetPasswordForEmail(email)` → ekran potwierdzenia  
**Kryteria:** User może zresetować hasło z poziomu mobilnej aplikacji bez przechodzenia na web  
**Nakład:** S

### S21-02 — Onboarding: persist middleware (FEAT-02)
**Plik:** `apps/mobile/src/stores/onboarding.ts`  
**Fix:** Dodać `persist` middleware Zustand z `AsyncStorage` i kluczem `onboarding-state`; wyczyścić po ukończonym onboardingu (po zapisie do API w step-3)  
**Kryteria:** Zabicie aplikacji po kroku 1 → powrót na krok 2 z zachowanymi wyborami  
**Nakład:** S

### S21-03 — useJourneys: typowanie body (KOD-08)
**Plik:** `apps/mobile/src/hooks/useJourneys.ts:26`  
**Fix:** Zmienić `mutationFn: (body: unknown)` na `mutationFn: (body: CreateJourneyInput)`  
**Nakład:** XS

### S21-04 — circle/[id].tsx: usunąć double-cast (KOD-09)
**Plik:** `apps/mobile/app/circle/[id].tsx:~151`  
**Fix:** Rozszerzyć `Circle` typ w `@travelpoint/types` o pola z `CircleDetail` lub wyeksportować `CircleDetail` jako część types package  
**Nakład:** S

### S21-05 — useSearchExplorers: refactor na proper hook (KOD-10)
**Plik:** `apps/mobile/src/hooks/useExplorers.ts:57`  
**Fix:** Przekonwertować na `useMutation` lub zwrócić `{search, isLoading, data, error}` — spójny wzorzec z resztą hooks  
**Nakład:** S

---

## S-22 — Dokumentacja: synchronizacja z kodem
**Szacowany nakład:** pół sesji (S)  
**Bramka wejścia:** Decyzja Szymona o palecie kolorów (P1) + web maps (P2)

### S22-01 — CLAUDE.md: synchronizacja tokenów kolorów (DOK-01 + DOK-02)
**Plik:** `CLAUDE.md`  
**Co zmienić:**
- Wartości `void`/`abyss` → `#070A0C`/`#0C1014` (aktualne w colors.ts)
- Dodać brakujące tokeny: `auroraDeep #3A8C6A`, `signalGlow #3DBDD4`
- Dodać tokeny glass: `glass rgba(237,232,223,0.05)`, `glassBorder rgba(237,232,223,0.10)`, `glassStrong rgba(237,232,223,0.09)`
- Dodać status tokeny: `success #4A8A6A`, `warning #C8A456`, `danger #C85040`, `info #1E9AB0`  
**Nakład:** S

### S22-02 — ARCHITECTURE.md: zaktualizować ADR-004 i ADR-005 (DOK-03 + DOK-04)
**Plik:** `docs/ARCHITECTURE.md`  
**ADR-005:** Zmienić "Haversine, no PostGIS" → "PostGIS zaimplementowany w Sprint 3; Haversine jako fallback dla środowisk bez PostGIS"  
**ADR-004:** Zmienić "web = Mapbox" → "web = Google Maps od commita 150cba4 (WebGL conflict z Three.js)"  
**Nakład:** S

### S22-03 — Usunąć martwe referencje mapbox (KOD-13)
**Pliki:** `apps/web/next.config.js:25`, `.github/workflows/ci.yml` (MAPBOX secret)  
**Fix:** Usunąć `'mapbox-gl'` z `serverExternalPackages`; usunąć `NEXT_PUBLIC_MAPBOX_TOKEN` z build-web job  
**Nakład:** XS

### S22-04 — SPRINT_6_PLAN.md → archiwum + TRUST score fix (DOK-05)
**Pliki:** `docs/SPRINT_6_PLAN.md` (przenieść do `docs/_archive/`), `docs/HIDDEN_LAYER.md` (zaktualizować thresholdy na 150)  
**Nakład:** XS

---

## S-23 — Infrastruktura (wymagają akcji Szymona)
**Te zadania NIE wymagają zmiany kodu — tylko konfiguracji zewnętrznych usług**

| ID | Zadanie | Kto | Kryterium |
|---|---|---|---|
| S23-01 | R2: ustawić 5 env vars na Railway | Szymon | `POST /api/spots` z JPEG → 200, zdjęcie widoczne |
| S23-02 | Redis (Upstash): ustawić `REDIS_URL` | Szymon | Log API: `Socket.IO using Redis adapter` |
| S23-03 | PostGIS: aktywować extension na Railway | Szymon | Log bez `PostGIS unavailable` warning |
| S23-04 | Stripe live: ustawić 6 env vars | Szymon | `POST /api/billing/checkout` → Stripe URL |
| S23-05 | Google Maps: zweryfikować rotację klucza | Szymon | Console: historyczny klucz `revoked` |
| S23-06 | CI: usunąć `NEXT_PUBLIC_MAPBOX_TOKEN` z secrets | Szymon | Secret nieużywany, usunięty |

---

## S-24 — Packages: typy i api-client
**Szacowany nakład:** 1 sesja (L)  
**Bramka wejścia:** API stabilne (S-17 + S-19)

### S24-01 — api-client: zastąpić lokalne typy importami (PKG-01)
**Pliki:** `packages/api-client/src/endpoints/{explorers,circles,journeys,transmissions,signals}.ts`  
**Fix:** Usunąć lokalne interfejsy; importować z `@travelpoint/types`  
**Kryteria:** `grep -rn "interface Explorer" packages/api-client` → 0  
**Nakład:** M

### S24-02 — packages/validation: brakujące schematy (PKG-03)
**Plik:** `packages/validation/src/` — dodać:
- `TransmissionSchema` (body VarChar(2000), recipientId, circleId)
- `ForumPostSchema` (title, body, category)
- `ForumReplySchema` (body)
- `SpotCommentSchema` (body max 500)
- `ReportSchema` (targetType, targetId, reason)
**Kryteria:** `packages/validation` eksportuje nowe schematy; routes używają ich zamiast inline cast  
**Nakład:** M

### S24-03 — packages/types: brakujące typy (PKG-04)
**Plik:** `packages/types/src/`  
**Dodać:** `ForumPost`, `ForumReply`, `Photo`, `Report`, `ModerationAction` eksportowane z index.ts  
**Nakład:** S

### S24-04 — api-client: brakujące endpointy (PKG-02)
**Plik:** `packages/api-client/src/endpoints/`  
**Dodać:**
- `spots.ts`: komentarze (list, create), reakcje (toggle), weryfikacje  
- `explorers.ts`: avatar upload/complete, home-base, push-token  
**Nakład:** M

### S24-05 — Deprecated google.maps.Marker → AdvancedMarkerElement (KOD-14)
**Plik:** `apps/web/src/components/map/DiscoveryMap.tsx:~207`  
**Fix:** Migracja na `google.maps.marker.AdvancedMarkerElement`; wymaga `mapId` w inicjalizacji mapy  
**Nakład:** S

---

## Ścieżka krytyczna — kolejność wykonania

```
S-17 (krytyczne bugi)
  ↓
S-18 (journal fix)  →  S-19 (kod quality)
  ↓                      ↓
S-20 (testy)  ←──────────┘
  ↓
S-21 (mobile UX)  →  S-22 (dokumentacja)
  ↓
S-23 (infrastruktura — Szymon, równolegle)
  ↓
S-24 (packages — ostatni, stabilne API wymagane)
```

---

## Licznik zadań

| Sprint | Zadań | Nakład łączny |
|---|---|---|
| S-17 | 10 | M (1 sesja) |
| S-18 | 4 | M (1 sesja) |
| S-19 | 9 | L (1-2 sesje) |
| S-20 | 7 | XL (2 sesje) |
| S-21 | 5 | M (1 sesja) |
| S-22 | 4 | S (pół sesji) |
| S-23 | 6 | — (Szymon) |
| S-24 | 5 | L (1-2 sesje) |
| **ŁĄCZNIE** | **50** | **~8-10 sesji** |

---

## Pytania do Szymona (blokujące)

**P1 — Paleta kolorów** *(blokuje S22-01)*  
Zostajemy przy Terra Mare (cold ocean) czy nowa koncepcja? Jeśli nowa — podaj nastrój/inspirację.

**P2 — Web maps** *(blokuje S22-03)*  
Google Maps na stałe? Usunąć NEXT_PUBLIC_MAPBOX_TOKEN z CI?

**P3 — Cookie security** *(blokuje S17-10)*  
Przeprojektowanie webAuth na HttpOnly cookie wymaga server-side session. Czy admin panel dostępny tylko dla Ciebie? Jeśli tak — prostsze rozwiązanie: basic auth po stronie Next.js middleware zamiast cookie JWT.

**P4 — Journal statyczny vs DB** *(blokuje S18-01)*  
Czy chcesz żeby journal był zarządzany przez admin CMS (DB) czy statyczny plik jest OK na closed beta? Statyczny jest prostszy ale CMS jest już zrobiony — trzeba tylko podłączyć.
