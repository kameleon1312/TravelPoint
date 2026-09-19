# Pełna weryfikacja stanu projektu (code-read audit)
**Data:** 2026-09-19  
**Metoda:** Odczyt każdego pliku źródłowego — 4 równoległe agenty:
- Agent A: wszystkie routes/ + services/ (18 plików)
- Agent B: wszystkie screens + hooks + stores (40+ plików)
- Agent C: wszystkie strony web + komponenty (35 plików)
- Agent D: wszystkie testy + CI + schema + packages

---

## 1. Rzeczywisty stan ukończenia

| Warstwa | Stan | Komentarz |
|---|---|---|
| Mobile screens | **95%** | Wszystkie 23 ekrany COMPLETE, podłączone do prawdziwego API |
| API routes | **90%** | Wszystkie trasy zaimplementowane; problemy: jakość, nie kompletność |
| Web pages | **80%** | KRYTYCZNY BUG: journal oderwany od DB; pozostałe strony COMPLETE |
| Testy | **25%** | 28 przypadków testowych, wiele krytycznych ścieżek bez pokrycia |
| **ŁĄCZNIE** | **~87%** | (skorygowane z poprzedniego 82%) |

---

## 2. Rejestr wszystkich znalezisk (zweryfikowanych)

### BEZPIECZEŃSTWO

| ID | Waga | Lokalizacja | Opis | Dowód |
|---|---|---|---|---|
| SEC-01 | KRYTYCZNA | `apps/mobile/app/modals/transmissions.tsx:~247` | URL injection — raw user input interpolowany do ścieżki API bez `encodeURIComponent`. Handle zawierający `/` lub `?` produkuje nieoczekiwane żądania. | `api.get('/api/explorers/${handle}')` tylko z `.replace('@','')` |
| SEC-02 | WYSOKA | `apps/web/src/lib/webAuth.ts:~19` | Cookie `tp_access_token` ustawiany przez `document.cookie` — nie jest HttpOnly. XSS na dowolnej stronie WORLD może go wykraść. | `document.cookie = 'tp_access_token=...'` zamiast Set-Cookie z serwera |

### BŁĘDY — WYSOKA WAGA

| ID | Waga | Lokalizacja | Opis | Dowód |
|---|---|---|---|---|
| BUG-01 | WYSOKA | `apps/api/src/services/storage.ts:~64` + `spots.ts:516` | Photo upload zawsze zwraca `PHOTO_TOO_LARGE` gdy klient nie wyśle `sizeBytes`. `sizeBytes ?? 0` trafia do `validatePhoto`, która odrzuca wartości `< 1`. | `finalizePhoto(sizeBytes ?? 0)` → `validatePhoto` odrzuca `0` |
| BUG-02 | WYSOKA | `apps/api/src/routes/feed.ts` | `GET /api/feed` — spoty i journeys zablokowanych użytkowników nadal pojawiają się w feedzie. `getBlockedExplorerIds` nie jest wywoływane. Inne trasy (transmissions, signals) poprawnie filtrują. | Brak wywołania `getBlockedExplorerIds` w całym pliku |
| BUG-03 | WYSOKA | `apps/web/app/journal/page.tsx:33` + `app/journal/[slug]/page.tsx:17` | Journal publiczny czyta wyłącznie z hardkodowanego `src/lib/journal.ts` (4 wpisy statyczne). Admin CMS zapisuje do bazy, ale publiczne strony nigdy jej nie czytają. Baza jest niewidoczna dla odwiedzających. | `const posts = JOURNAL_POSTS` + `getPost(slug)` z pliku statycznego |
| BUG-04 | WYSOKA | `apps/web/app/journal/[slug]/opengraph-image.tsx:11` | Next.js 15: `params` jest `Promise<{slug}>` ale kod nie awaita — runtime error przy generacji OG image dla każdego artykułu. | `interface Props { params: { slug: string } }` — brak `Promise<>` |
| BUG-05 | WYSOKA | `apps/mobile/app/spot/[id].tsx:567` | `useState(false)` dla `saved` — nigdy nie seedowany z odpowiedzi API. Przycisk "Zapisz" zawsze pokazuje stan "niezapisany" przy pierwszym ładowaniu. | `const [saved, setSaved] = useState(false)` bez inicjalizacji z danych |
| BUG-06 | WYSOKA | `apps/mobile/app/explorer/[handle].tsx:~73` | `useState(false)` dla `blocked` — nie seedowany z API. Przycisk blokady pokazuje błędną etykietę dla wcześniej zablokowanych eksploratorów. | `const [blocked, setBlocked] = useState(false)` |

### BŁĘDY — ŚREDNIA WAGA

| ID | Waga | Lokalizacja | Opis | Dowód |
|---|---|---|---|---|
| BUG-07 | ŚREDNIA | `apps/api/src/routes/circles.ts:~188` | `DELETE` dla jedynego założyciela usuwa koło przez `circle.delete`. Spoty z `circleId` wskazującym na usunięte koło stają się osieroconymi rekordami CIRCLE_ONLY. | `await app.prisma.circle.delete({...})` bez cascade check spotów |
| BUG-08 | ŚREDNIA | `apps/api/src/routes/waitlist.ts:38-54` | `POST /api/invite-request` nie sprawdza duplikatów — istniejący użytkownik może się rejestrować wielokrotnie, tworząc zduplikowane wpisy w audit log. | Brak `findFirst` przed `create` na waitlist |
| BUG-09 | ŚREDNIA | `apps/api/src/routes/spots.ts:147` | `syncSpotLocation`: wszystkie błędy `$executeRaw` (PostGIS) swallowane w pustym `catch {}` bez logu. Błąd DB połączenia = cicha utrata kolumny geometry. | `} catch {} // ignore if PostGIS unavailable` |
| BUG-10 | ŚREDNIA | `apps/mobile/app/(tabs)/_layout.tsx:48` | `useEffect` dependency: `[unseenCount > 0]` to wyrażenie boolean. Animacja pulsowania nie restaruje się gdy count zmienia się z 1 → 5 (oba truthy). | `}, [unseenCount > 0])` zamiast `}, [unseenCount])` |
| BUG-11 | NISKA | `apps/web/app/rodo/RodoRequestForm.tsx:132` | Klasa CSS `text-danger` nie istnieje w Tailwind ani design systemie Terra Mare. Tekst błędu jest niewidoczny. | `className="text-danger"` — powinno być `text-ember` |
| BUG-12 | NISKA | `apps/mobile/app/(auth)/login.tsx:113` | `"Request Access"` — hardkodowany angielski tekst w polskim UI. | `<Text>"Request Access"</Text>` |
| BUG-13 | NISKA | `apps/mobile/app/(tabs)/index.tsx:788` | Overlay błędu mapy pokazuje tekst developerski użytkownikowi: `"Włącz 'Maps SDK for Android' w Google Cloud Console..."` | Bezpośredni string techniczny w UI |

### BRAKUJĄCE FUNKCJE

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| FEAT-01 | WYSOKA | `apps/mobile/app/(auth)/login.tsx` | Brak "Zapomnij hasło" / reset hasło w mobilnej aplikacji. Strona `reset-password` istnieje na webie, ale żaden link w mobile login nie prowadzi do przeglądarkowego reset flow. |
| FEAT-02 | ŚREDNIA | `apps/mobile/src/stores/onboarding.ts` | Brak `persist` middleware w Zustand. Zabicie aplikacji w połowie onboardingu (po kroku 1, przed zapisem do API w kroku 3) traci wszystkie wybory. |
| FEAT-03 | NISKA | `apps/web/app/(landing)/page.tsx:86-90` | Statsy landing: `'58'` krajów, `'340'` eksploratorów, `'12'` kół — hardkodowane, nigdy nie aktualizowane z API. Tylko liczba spotów pochodzi z DB. |
| FEAT-04 | NISKA | `apps/web/app/admin/journal/page.tsx` | Admin CMS nie ma możliwości usunięcia postu — jedynie archiwizacja (ARCHIVED status). |
| FEAT-05 | NISKA | `apps/web/app/explorers/page.tsx` | Strona wyszukiwania eksploratorów wymaga JWT z sessionStorage (po zalogowaniu przez forum). Niezalogowani użytkownicy widzą komunikat ale nie mają ścieżki do logowania — muszą najpierw przejść na `/forum`. |

### JAKOŚĆ KODU — API

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| KOD-01 | WYSOKA | 9 miejsc w routes/ | Raw `req.body as {...}` zamiast Zod: auth.ts:164, spots.ts:705, circles.ts:96+237, forum.ts:29, analytics.ts:35, transmissions.ts:193, moderation.ts:184. |
| KOD-02 | ŚREDNIA | `routes/journal.ts:22-35` | Inline `verifySupabaseJwt()` + ręczne sprawdzenie roli zamiast `preHandler: [requireModerator]`. Funkcjonalnie poprawne, niespójne z resztą. |
| KOD-03 | ŚREDNIA | `routes/explorers.ts:441` | `await import('@travelpoint/geo')` wewnątrz handlera żądania — dynamic import na każde wywołanie zamiast static import na górze pliku. |
| KOD-04 | ŚREDNIA | `services/pushReceipts.ts:9` | `pendingTickets` to `Map` in-memory — w multi-instance deployment (Redis adapter już działa dla Socket.IO) cleanup tokenów `DeviceNotRegistered` zawodzi na instancji, która nie wysyłała pushy. |
| KOD-05 | ŚREDNIA | `routes/moderation.ts:74+87` + `routes/explorers.ts` | Duplikacja bloków: `POST /api/blocks/:explorerId` i `POST /api/explorers/:id/block` robią to samo. Klient może używać jednego, dokumentacja drugiego. |
| KOD-06 | NISKA | `services/email.ts:147+156` | `sendVerificationEmail()` i `sendPasswordResetEmail()` nigdy nie wywoływane (Supabase obsługuje to natively). Martwy kod. |
| KOD-07 | NISKA | `services/billing.ts` | Brak obsługi `invoice.payment_failed`. Status `past_due` propaguje się tylko gdy Stripe wyśle `customer.subscription.updated` — może opóźnić degradację tieru. |

### JAKOŚĆ KODU — MOBILE

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| KOD-08 | ŚREDNIA | `src/hooks/useJourneys.ts:26` | `mutationFn: (body: unknown)` — brak typowania wejścia. Powinno być `CreateJourneyInput` z `@travelpoint/validation`. |
| KOD-09 | ŚREDNIA | `app/circle/[id].tsx:~151` | `as unknown as CircleDetail` — podwójny cast wskazuje na niezgodność typu `Circle` z `@travelpoint/types` z lokalnym interfejsem `CircleDetail`. |
| KOD-10 | NISKA | `src/hooks/useExplorers.ts:57` | `useSearchExplorers()` zwraca plain async function, nie hook state z loading/error/data. Niespójny wzorzec z całą resztą hooks. |
| KOD-11 | NISKA | `src/stores/recording.ts:3` vs `src/stores/offlineQueue.ts:1` | Niespójne API `expo-file-system`: recording używa `expo-file-system/legacy`, offlineQueue używa nowego `File`/`Paths` API. |
| KOD-12 | NISKA | `src/stores/recording.ts:256` | `void writeSession(...)` w `addPoint` — fire-and-forget. GPS point może zaginąć przy natychmiastowym force-kill zanim async write się skończy. |

### JAKOŚĆ KODU — WEB

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| KOD-13 | NISKA | `apps/web/next.config.js:25` | `serverExternalPackages: ['mapbox-gl']` — martwa referencja. mapbox-gl nie jest używany w projekcie od commita `150cba4`. |
| KOD-14 | NISKA | `apps/web/src/components/map/DiscoveryMap.tsx:~207` | Deprecated `google.maps.Marker` — powinien być `google.maps.marker.AdvancedMarkerElement`. Funcjonalny, ale Google zapowiedziało usunięcie w przyszłej wersji. |
| KOD-15 | NISKA | `apps/web/app/admin/page.tsx:71` | Tekst rozwiązania raportu hardkodowany: `'Resolved in operator panel'`. Brak edytowalnego pola przyczyny. |

### CI/CD

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| CI-01 | WYSOKA | `.github/workflows/ci.yml:161` | `migration-check` ma `continue-on-error: true` — drift schematu NIGDY nie blokuje merge PR. Jest dekoracyjny. |
| CI-02 | ŚREDNIA | `.github/workflows/ci.yml` | Brak `needs:` między jobami — nieudany type-check nie zatrzymuje uruchamiania testów; zmarnowane minuty runnera. |
| CI-03 | NISKA | `.github/workflows/security.yml` vs `ci.yml` | Secret scan uruchamia się dwukrotnie przy każdym push/PR (raz w ci.yml job "secret-scan", raz w security.yml). |
| CI-04 | NISKA | `.github/workflows/production-smoke.yml` | Trigger tylko `workflow_dispatch` — brak automatycznego uruchomienia po deploy. Smoke test nie jest automatyczny. |

### DOKUMENTACJA

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| DOK-01 | WYSOKA | `CLAUDE.md` (Color tokens) | void/abyss wartości z cofniętej S-16 (`void #0F0B09`, `abyss #141009`). Kod ma `void #070A0C`, `abyss #0C1014`. |
| DOK-02 | ŚREDNIA | `CLAUDE.md` | Brak tokenów: `auroraDeep #3A8C6A`, `signalGlow #3DBDD4`, `glass rgba(...)`, `glassBorder`, `glassStrong`, `success #4A8A6A`, `warning #C8A456`, `danger #C85040`, `info #1E9AB0`. Istnieją w colors.ts, brakuje w CLAUDE.md. |
| DOK-03 | ŚREDNIA | `docs/ARCHITECTURE.md:ADR-005` | Twierdzi "Haversine, no PostGIS" — kod używa PostGIS ST_DWithin od Sprint 3. |
| DOK-04 | ŚREDNIA | `docs/ARCHITECTURE.md:ADR-004` | Twierdzi "web = Mapbox" — web używa Google Maps od commita `150cba4`. |
| DOK-05 | NISKA | `docs/SPRINT_6_PLAN.md` vs `services/trustScore.ts` | TRUSTED=200 w dokumencie vs TRUSTED=150 w kodzie. Kod jest źródłem prawdy. |

### SCHEMAT BAZY DANYCH

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| DB-01 | NISKA | `schema.prisma` — `Circle` + `CircleMember` | Brak `updatedAt` — nie można śledzić ostatniej modyfikacji koła ani zmiany roli. |
| DB-02 | NISKA | `schema.prisma` — `Reaction` | Unique constraint tylko `[spotId, explorerId]` — jeden typ reakcji per user per spot (nie `[spotId, explorerId, type]`). Zmiana typu to UPDATE nie INSERT. Niezudokumentowane. |
| DB-03 | NISKA | `schema.prisma` — `Spot` | Brak indeksu na `circleId`. Zapytania o "wszystkie CIRCLE_ONLY spoty dla koła X" nie mają indeksu. |

### PACKAGES / TYPY

| ID | Waga | Lokalizacja | Opis |
|---|---|---|---|
| PKG-01 | ŚREDNIA | `packages/api-client/src/endpoints/` | 5 plików definiuje lokalne typy zamiast importować z `@travelpoint/types`: Explorer, Circle, Journey, Transmission, Signal. Mogą dryfować. |
| PKG-02 | ŚREDNIA | `packages/api-client` | Brakujące endpointy: komentarze, reakcje, raporty, avatar upload/complete, home-base, push-token, weryfikacje spotów, moderacja. |
| PKG-03 | ŚREDNIA | `packages/validation` | Brak schematów Zod dla: transmissions, forum posts/replies, komentarze do spotów, reakcje, raporty, invite codes, billing checkout (zduplikowany inline). |
| PKG-04 | NISKA | `packages/types` | Brak typów: `ForumPost`, `ForumReply`, `Photo`, `Report`, `Block`, `ModerationAction`. |

### INFRASTRUKTURA (wymagają decyzji operacyjnych)

| ID | Waga | Opis |
|---|---|---|
| OPS-01 | WYSOKA | R2 Cloudflare credentials nie skonfigurowane — zdjęcia zwracają `503 STORAGE_NOT_CONFIGURED` |
| OPS-02 | WYSOKA | Redis URL nie skonfigurowane — Socket.IO działa in-memory (brak shared state między instancjami) |
| OPS-03 | WYSOKA | PostGIS extension na Railway — status nieznany (jeśli nieaktywne: ST_DWithin ciszo failuje na Haversine) |
| OPS-04 | WYSOKA | Stripe live keys — nie skonfigurowane — płatności nie działają w produkcji |
| OPS-05 | ŚREDNIA | Google Maps key rotation — operacyjnie nieukończone (historyczny klucz może być aktywny) |
| OPS-06 | NISKA | `NEXT_PUBLIC_MAPBOX_TOKEN` w CI secrets — nieużywany w kodzie od `150cba4`; do usunięcia |

### TESTY — LUKI

Łącznie: **28 przypadków testowych** w 12 plikach. Brakuje:

| Brak testu | Ryzyko |
|---|---|
| `billing.test.ts` | Finansowe — webhook replay, duplikaty, złe signature |
| `feed.test.ts` | Privacy — blokady nie filtrują feedu (BUG-02 brak testu) |
| `auth.test.ts` — complete-signup flow | Core rejestracja bez pokrycia |
| `forum.test.ts` | Moderacja, autoryzacja delete |
| `journal.test.ts` | Admin CMS endpoints |
| `moderation.test.ts` | Suspensje, raporty |
| `waitlist.test.ts` | Duplikaty invite-request |
| `spots.ts` — photo upload | BUG-01 bez testu regresji |
| Boundary values w istniejących testach | `trustScore.test.ts` nie testuje 49/51/149/151 |

---

## 3. Mocne strony (nie ruszać)

- **Wszystkie 23 ekrany mobilne są COMPLETE** — zero stubów, zero placeholder, wszystkie podłączone do prawdziwego API
- **Billing** (routes + services): Kompletny, timing-safe HMAC, idempotency klucze — BEZ zmian
- **hiddenLayer.ts**: Poprawna izolacja server-side — BEZ zmian
- **socket.ts**: Prawidłowy membership check, presence throttle, Redis adapter — BEZ zmian
- **retention.ts**: GPS 90d + purge 30d — BEZ zmian
- **trustScore.ts**: Transakcje z duplicate-prevention — BEZ zmian
- **requireAuth / requireModerator**: Poprawna implementacja — BEZ zmian
- **Argon2id, JWT rotation, SecureStore** — BEZ zmian
- **Conventional Commits** przez całą historię git
- **Geo fuzzing** (mulberry32, 500m, per-session seed) — BEZ zmian
- **Offline queue** z retry — BEZ zmian
- **CI**: typecheck + lint + test-api + build-web + secret-scan — fundamenty dobre

---

## 4. Zaktualizowana mapa ukończenia

| Funkcja | Poprzedni audyt | Po code-read |
|---|---|---|
| Explorer Identity | 85% | **92%** — bug BUG-05/06 (stan init) |
| Hidden Layer | 75% | **88%** — logika kompletna; brak testów granicznych |
| Travel Circles | 70% | **88%** — BUG-07 (cascade delete) |
| Journey System | 70% | **92%** — kompletny |
| Live Presence | 60% | **78%** — OPS-02 (Redis) |
| Communication | 65% | **88%** — BUG-02 (feed bloki), SEC-01 (URL injection) |
| Payments/Stripe | 70% | **88%** — OPS-04 (live keys) |
| Storage/R2 | 40% | **72%** — kod kompletny, BUG-01, OPS-01 |
| Forum WORLD | 70% | **90%** |
| Journal WORLD | 40% | **35%** — BUG-03 (całkowite rozłączenie DB) |
| Admin Panel | 30% | **72%** — funkcjonalny, manualne JWT pattern |
| Analytics | 40% | **78%** |
| Testy | 35% | **25%** (po dokładnym policzeniu — tylko 28 przypadków) |
| E2E | 0% | **0%** |
