> **HISTORYCZNY AUDYT — stan na 10 czerwca 2026.**
> Wiele ustaleń zostało naprawionych (Forum, Admin, Billing, Error boundaries, CMS, Email verify/reset).
> Aktualny stan projektu: `docs/PROJECT_STATE_2026-09-30.md`

# TravelPoint - kompletny audyt projektu

**Data audytu:** 10 czerwca 2026  
**Perspektywa:** inwestor / CTO / Product Owner / architektura / UX / bezpieczeństwo  
**Zakres:** wszystkie śledzone pliki Markdown, kod `apps/*`, pakiety `packages/*`, konfiguracja CI, migracje, konfiguracja wdrożenia i deklarowane integracje.

## 0. Executive summary

TravelPoint jest rozbudowanym prototypem produktu z działającym szkieletem trzech głównych warstw: publicznego WORLD, mobilnego CORE i API ENGINE. Najwięcej realnej wartości dostarczono w aplikacji mobilnej: mapa, spoty, journeys, circles, wiadomości, onboarding, profile, powiadomienia oraz podstawowy Hidden Layer mają kompletne przepływy UI -> API -> baza.

Projekt nie jest jednak zgodny z poziomem dojrzałości opisywanym przez dokumentację bezpieczeństwa i wdrożenia. Największe braki dotyczą kontroli dostępu do circles, testów, PostGIS, Redis, retencji GPS, szyfrowania danych wrażliwych, storage zdjęć, płatności, obsługi cyklu życia konta i gotowości operacyjnej.

**Decyzja audytowa:**

- Gotowość do zamkniętego MVP: **NIE**, dopóki nie zostaną usunięte krytyczne luki kontroli dostępu i zgód.
- Gotowość do produkcji publicznej: **NIE**.
- Szacowane ukończenie produktu: **63%**.
- Zgodność dokumentacja <-> implementacja: **58%**.

## 1. Źródła i metoda

### 1.1 Przeanalizowana dokumentacja

W repozytorium znajduje się osiem śledzonych plików Markdown:

1. `CLAUDE.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DEPLOYMENT.md`
4. `docs/DESIGN_SYSTEM.md`
5. `docs/HIDDEN_LAYER.md`
6. `docs/SECURITY.md`
7. `apps/api/prisma/migrations/README.md`
8. `apps/mobile/assets/fonts/README.md`

Nie znaleziono formalnego PRD, roadmapy produktowej, backlogu `TASKS.md`, osobnego `TODO.md`, specyfikacji płatności, panelu administracyjnego ani funkcji AI. Plan produktu jest rozproszony pomiędzy powyższe dokumenty, landing page, `.env.example` i checklistę wdrożeniową.

### 1.2 Przeanalizowana implementacja

- `apps/api`: Fastify, Prisma, PostgreSQL, Socket.io, Sentry.
- `apps/mobile`: Expo Router, React Native, React Query, Zustand, SecureStore.
- `apps/web`: Next.js App Router, Mapbox GL, statyczny Journal, publiczne profile.
- `packages/api-client`, `geo`, `theme`, `types`, `utils`, `validation`.
- `.github/workflows/ci.yml`, `nixpacks.toml`, migracje Prisma i konfiguracje środowisk.

### 1.3 Weryfikacja wykonawcza

| Kontrola | Wynik |
|---|---|
| API build | ✅ Przechodzi |
| Web production build | ✅ Przechodzi; 18 stron wygenerowanych |
| API/Web/Mobile type-check | ✅ Przechodzi |
| API lint | ✅ Przechodzi |
| Web lint | ✅ Przechodzi |
| Mobile lint | 🔴 22 błędy |
| API tests | 🔴 Brak plików testowych; Vitest kończy się kodem 1 |
| Testy web/mobile/E2E | 🔴 Brak |

## 2. Master Project Blueprint

### 2.1 Główna wizja

TravelPoint ma być prywatną siecią dla osób obsesyjnie odkrywających świat, a nie planerem podróży. Produkt łączy publiczny kanał pozyskania użytkownika z prywatną aplikacją opartą na zaufaniu, reputacji, lokalizacji i ekskluzywnym dostępie do miejsc.

Dowody:

- `CLAUDE.md:4`
- `docs/ARCHITECTURE.md:9-16`
- `docs/HIDDEN_LAYER.md`

### 2.2 Założenia biznesowe

1. **WORLD jako growth funnel:** publiczny landing, Journal, Forum, mapa i profile.
2. **CORE jako retencja:** prywatna aplikacja mobilna, mapa, circles, journeys, obecność i Hidden Layer.
3. **ENGINE jako przewaga technologiczna:** autorytatywna kontrola dostępu, geo-prywatność, reputacja i realtime.
4. **Ekskluzywność:** zaproszenia, rangi i ukryte treści mają zwiększać wartość społeczności.
5. **Monetyzacja subskrypcyjna:** FREE, PRO i EXPEDITION; landing deklaruje 0/29/79 PLN miesięcznie.
6. **Bezpieczeństwo lokalizacji jako warunek produktu:** lokalizacja domyślnie wyłączona, jawne zgody, fuzzing i retencja.

### 2.3 Grupa docelowa

- urbexerzy,
- backpackerzy i nomadzi,
- podróżnicy szukający miejsc poza przewodnikami,
- twórcy lokalnych społeczności i zamkniętych circles,
- użytkownicy budujący tożsamość podróżniczą i reputację,
- osoby akceptujące model invite-only i prywatność lokalizacji.

### 2.4 Docelowe moduły

#### WORLD

- landing i funnel zaproszeń,
- publiczna Discovery Map,
- Explorer Journal,
- Forum,
- publiczne profile explorerów,
- SEO, social sharing i dane strukturalne,
- strony prawne i obsługa żądań RODO.

#### CORE

- rejestracja, logowanie, onboarding i tożsamość,
- Atlas/mapa,
- Hidden Layer,
- tworzenie, zapisywanie i odkrywanie spotów,
- zdjęcia spotów,
- journeys i nagrywanie GPS,
- circles, role, zaproszenia i czat,
- wiadomości bezpośrednie,
- live presence,
- signals i push notifications,
- rangi, trust score i tier/subskrypcje,
- ustawienia prywatności i obsługa konta.

#### ENGINE

- JWT i rotacja refresh tokenów,
- Argon2id,
- walidacja Zod,
- autoryzacja zasobów,
- PostgreSQL/PostGIS i H3,
- Socket.io i Redis,
- geo-fuzzing,
- szyfrowanie AES-256-GCM,
- audyt dostępu,
- retencja danych,
- storage zdjęć,
- e-mail,
- monitoring i health checks.

### 2.5 Docelowa architektura

Dokumentacja przewiduje monorepo pnpm z trzema aplikacjami i współdzielonymi kontraktami. Mobile komunikuje się z ENGINE przez REST i Socket.io, przechowuje tokeny w SecureStore i zarządza danymi serwerowymi przez React Query. WORLD korzysta z Next.js i Mapbox. ENGINE ma korzystać z PostgreSQL/PostGIS, Redis i autorytatywnego Hidden Layer.

Dowody: `docs/ARCHITECTURE.md:22-69`.

## 3. Stan implementacji modułów

| Moduł | Status | Ocena faktyczna | Dowody |
|---|---:|---|---|
| Frontend web | 🟡 | Landing, mapa, Journal, profile i strony prawne działają; Forum brak | `apps/web/app`, `apps/web/src/components` |
| Backend/API | 🟡 | Szerokie REST API i realtime; luki autoryzacji i brak warstwy serwis/repository | `apps/api/src/routes`, `plugins/socket.ts` |
| Database | 🟡 | Główny model domeny istnieje; brak PostGIS i części relacji/integralności | `apps/api/prisma/schema.prisma` |
| Auth | 🟡 | Argon2id, JWT, refresh rotation; brak email verification/reset/MFA | `routes/auth.ts`, `lib/crypto.ts`, `lib/jwt.ts` |
| Storage | 🔴 | R2 tylko w konfiguracji; zdjęcia jako URL/data URI w DB | `routes/spots.ts:218-245`, `.env.example` |
| Payments | 🔴 | Tiers i cennik bez checkoutu, billingów i webhooków | `schema.prisma`, landing tiers |
| Maps | 🟡 | Web Mapbox, mobile Google/react-native-maps; brak PostGIS | `DiscoveryMap.tsx`, mobile tab `index.tsx`, `spots.ts` |
| Chat | 🟡 | DM i circle chat REST/realtime; krytyczna luka room join | `routes/transmissions.ts`, `plugins/socket.ts` |
| Notifications | 🟡 | Expo push i Signal UI; większość typów sygnałów nie jest generowana | `services/push.ts`, `routes/signals.ts` |
| Admin Panel | 🔴 | Brak | brak tras, modeli i ekranów |
| Mobile App | 🟡 | Większość głównych ekranów istnieje; brak offline/background/release QA | `apps/mobile/app` |
| PWA | 🔴 | Minimalny niepodłączony service worker, bez manifestu i cache | `apps/web/public/sw.js` |
| AI Features | 🔴 | Brak wymagań i implementacji | brak zależności, tras i usług |
| SEO | 🟡 | Metadata, sitemap, robots, JSON-LD; brak pełnego content pipeline i OG per wpis | `apps/web/app` |
| Analytics | 🔴 | Brak; polityka prywatności deklaruje brak trackerów | `polityka-prywatnosci/page.tsx:164-165` |
| Monitoring | 🟡 | Sentry i health check; brak dowodu uptime/log aggregation/alerting | Sentry configs, `server.ts` |
| E-mail | 🟡 | Resend dla zaproszeń/RODO; brak pełnych przepływów konta | `apps/api/src/services/email.ts` |

## 4. Feature Coverage Report

| Funkcja | Wymagane | Zaimplementowane | Status | % | Dowody |
|---|---|---|---:|---:|---|
| Landing WORLD | Tak | Pełny landing i CTA | ✅ | 90 | `apps/web/app/(landing)/page.tsx` |
| Funnel request access | Tak | Formularz i proxy API | ✅ | 85 | `FinalCTA.tsx`, `app/api/invite-request/route.ts` |
| Discovery Map web | Tak | Mapbox, filtry, publiczne spoty | ✅ | 85 | `app/map/page.tsx`, `DiscoveryMap.tsx` |
| Explorer Journal | Tak | 4 statyczne artykuły | 🟡 | 55 | `src/lib/journal.ts` |
| CMS/publikowanie Journal | Domyślne dla magazynu | Brak | 🔴 | 0 | brak modelu i API |
| Forum WORLD | Tak | Tylko Coming soon | 🔴 | 5 | `WorldNav.tsx:15,102-107` |
| Publiczne profile | Tak | Profil SSR i metadata | ✅ | 80 | `app/explorer/[handle]/page.tsx` |
| SEO techniczne | Tak | Metadata, sitemap, robots, JSON-LD | ✅ | 80 | `layout.tsx`, `sitemap.ts`, `robots.ts` |
| Dynamiczne OG per treść | Tak | Tekstowe metadata, wspólny obraz/logo | 🟡 | 45 | metadata stron |
| Designed 404 | Tak | Istnieje | ✅ | 80 | `app/not-found.tsx` |
| Designed 500 | Tak | Brak `error.tsx`/`global-error.tsx` | 🔴 | 0 | brak pliku |
| Rejestracja | Tak | Działa, invite opcjonalny | 🟡 | 70 | `routes/auth.ts`, mobile `join.tsx` |
| Świadome zgody regulamin/RODO | Tak | Ustawione domyślnie na true, bez checkboxów | 🔴 | 20 | `join.tsx:25` |
| Invite-only onboarding | Tak | Kod opcjonalny; otwarta rejestracja | 🟡 | 35 | `routes/auth.ts:13-55` |
| Logowanie | Tak | JWT + Argon2id | ✅ | 90 | `routes/auth.ts`, `lib/crypto.ts` |
| Refresh token rotation | Tak | Hashowanie, revocation i rotacja | ✅ | 90 | `routes/auth.ts:120-161` |
| Email verification | Potrzebne produkcyjnie | Pole istnieje, brak flow | 🔴 | 10 | `schema.prisma:16` |
| Password reset | Potrzebne produkcyjnie | Brak | 🔴 | 0 | brak endpointów |
| Secure token storage mobile | Tak | SecureStore | ✅ | 90 | `src/lib/secureStorage.ts` |
| Biometria | Sugerowana zależnością | Zależność nieużywana | ⚫ | 5 | `mobile/package.json` |
| Onboarding tożsamości | Tak | Archetype, territories, obsessions | ✅ | 90 | `app/(onboarding)` |
| Profil i prywatność | Tak | Edycja oraz consent toggles | 🟡 | 75 | `identity.tsx`, `routes/explorers.ts` |
| Atlas mobile | Tak | Mapa, markery, spoty, obecność | ✅ | 80 | `app/(tabs)/index.tsx` |
| Mapbox mobile zgodnie z ADR | Tak | Użyto react-native-maps/Google Maps | 🔴 | 20 | `index.tsx`, `app.json` |
| Geo opt-in | Tak | DB default false, ale mapa automatycznie prosi i ustawia consent | 🟡 | 45 | `index.tsx:295-304` |
| Public fuzzing >=500 m | Tak | Działa | ✅ | 90 | `routes/spots.ts:36-73`, `geo/fuzz.ts` |
| Presence fuzzing | Tak | Działa, pamięć procesu | 🟡 | 70 | `plugins/socket.ts:35-44` |
| Hidden Layer server-side | Tak | Resolver po stronie API | 🟡 | 65 | `services/hiddenLayer.ts` |
| TRUSTED access | Tak | Rank check i locked result | ✅ | 85 | `hiddenLayer.ts` |
| CIRCLE_ONLY privacy | Tak | Zwraca fuzzed pin i metadane nieczłonkom | 🟡 | 40 | `hiddenLayer.ts:67-78` |
| SECRET_DROP expiry | Tak | Active exact; expired nadal widoczny jako locked | 🟡 | 50 | `hiddenLayer.ts`, `HIDDEN_LAYER.md:68` |
| Spot CRUD | Tak | Create/read/delete, brak update route | 🟡 | 75 | `routes/spots.ts` |
| Spot saves | Tak | Save/unsave | ✅ | 90 | `routes/spots.ts:180-201` |
| Zdjęcia spotów | Tak | Dodawanie/usuwanie, bez storage | 🟡 | 45 | `routes/spots.ts:204-259` |
| H3 | Tak | Indeks zapisywany | 🟡 | 50 | `routes/spots.ts`, `schema.prisma` |
| PostGIS ST_DWithin | Tak | Zastąpione bounding box + Haversine w pamięci | 🔴 | 10 | `routes/spots.ts:10-113` |
| Journey CRUD | Tak | Działa | ✅ | 85 | `routes/journeys.ts` |
| GPS journey recording | Tak | Foreground, pamięć procesu | 🟡 | 60 | `stores/recording.ts` |
| Background recording | Deklarowane przez iOS permission | Nie działa | 🔴 | 0 | `app.json`, `recording.ts` |
| Offline journey recovery | Oczekiwane mobilnie | Brak persystencji | 🔴 | 0 | `recording.ts` |
| Journey replay | Tak | Polyline i szczegóły | ✅ | 75 | `app/journey/[id].tsx` |
| Circles CRUD | Tak | List/create/join/leave/detail | 🟡 | 70 | `routes/circles.ts`, mobile screens |
| Circle invite validation | Tak | Dowolny niepusty kod przechodzi | 🔴 | 10 | `routes/circles.ts:72-92` |
| Circle roles | Tak | MEMBER/GUIDE/FOUNDER | 🟡 | 65 | schema i invite endpoints |
| Circle realtime chat | Tak | Persistencja, push, Socket.io | 🟡 | 70 | `plugins/socket.ts`, `transmissions.ts` |
| Socket room authorization | Tak | Brak checku membership przy join | 🔴 | 10 | `plugins/socket.ts:48-50` |
| Direct messages | Tak | Thread, send, read, realtime/push | ✅ | 80 | `routes/transmissions.ts` |
| Signals inbox | Tak | Lista i seen | 🟡 | 55 | `routes/signals.ts`, `useSignals.ts` |
| Wszystkie typy Signal | Tak | UI istnieje; większość typów bez generatorów | 🟡 | 30 | `SignalType`, grep wywołań |
| Push notifications | Tak | Expo Push API | 🟡 | 65 | `services/push.ts` |
| Push receipt cleanup | Produkcyjnie potrzebne | Brak | 🔴 | 0 | brak receipt worker |
| Trust thresholds | Tak | 0/50/150/400/1000 zgodne | ✅ | 100 | `services/trustScore.ts` |
| Trust event coverage | Tak | Tylko create spot/photo/journey | 🟡 | 35 | wywołania `addTrustPoints` |
| Reactions/verification | Tak w punktacji | Brak modeli i endpointów | 🔴 | 0 | brak implementacji |
| Tier FREE/PRO/EXPEDITION | Tak | Pole i blokada create circle | 🟡 | 35 | schema, `routes/circles.ts` |
| Payments/subscriptions | Tak biznesowo | Brak | 🔴 | 0 | brak providera/webhooków |
| Redis sessions/presence | Tak | Zależność nieużywana | 🔴 | 5 | `ioredis` tylko package.json |
| AES-256-GCM | Tak | Helper istnieje, brak użycia | 🟡 | 20 | `packages/utils/src/encryption.ts` |
| Home base encryption flow | Tak | Pole istnieje, brak zapisu/odczytu | 🔴 | 5 | `homeBaseEnc` |
| GPS retention 90 dni | Tak | Brak joba i pól retencji | 🔴 | 0 | `SECURITY.md:44,73` |
| Soft delete konta | Tak | Anonimizacja i revoked tokens | ✅ | 75 | `routes/explorers.ts:71-123` |
| Purge po 30 dniach | Tak | Tylko wpis `purgeAfter` w audycie | 🔴 | 10 | `routes/explorers.ts:115` |
| Data export | Tak, pełny JSON | Eksport celowo pomija route GPS/homebase | 🟡 | 55 | `routes/explorers.ts:126-202` |
| RODO request web | Tak | Formularz, endpoint, e-mail/audit | ✅ | 80 | `app/rodo`, `routes/rodo.ts` |
| Admin/moderation | Konieczne społecznościowo | Brak | 🔴 | 0 | brak |
| Content reporting | Konieczne społecznościowo | Brak | 🔴 | 0 | brak |
| Cloudflare R2 | Tak | Tylko env | 🔴 | 5 | `.env.example` |
| Sentry | Tak | API/web/mobile | ✅ | 85 | konfiguracje Sentry |
| Uptime monitoring | Tak | Health endpoint; brak konfiguracji monitora | 🟡 | 35 | `server.ts` |
| Backup/PITR | Tak | Checklist, brak dowodu konfiguracji | 🔴 | 10 | `DEPLOYMENT.md:37` |
| PWA/offline web | Tak jako obszar audytu | Minimalny SW bez rejestracji/cache | 🔴 | 5 | `public/sw.js` |
| Analytics produktowe | Przydatne | Brak | 🔴 | 0 | brak |
| AI | Nieudokumentowane | Brak | 🔴 | N/D | brak wymagania |
| Automated tests | Konieczne | Brak | 🔴 | 0 | Vitest: no test files |

## 5. Najważniejsze sprzeczności dokumentacja vs kod

### 5.1 PostGIS

Dokumentacja wskazuje PostgreSQL/PostGIS i `ST_DWithin` jako decyzję architektoniczną. Implementacja przechowuje `lat` i `lng` jako `Float`, wykonuje bounding box w Prisma, a końcowy dystans liczy Haversine w pamięci procesu.

- Dokumentacja: `docs/ARCHITECTURE.md:24,65-66`
- Kod: `apps/api/prisma/schema.prisma:66-91`, `apps/api/src/routes/spots.ts:10-113`

### 5.2 Redis

Architektura deklaruje Redis dla sesji/presence. `ioredis` jest zależnością, ale nie występuje w kodzie. Presence działa wyłącznie w pamięci instancji Socket.io, więc nie skaluje się horyzontalnie.

- Dokumentacja: `docs/ARCHITECTURE.md:41`
- Kod: `apps/api/package.json`, `apps/api/src/plugins/socket.ts`

### 5.3 Mapbox mobile

ADR wybiera Mapbox zamiast Google Maps. Web używa Mapbox, ale mobile używa `react-native-maps` i klucza Google Maps.

- Dokumentacja: `docs/ARCHITECTURE.md:62`
- Kod: `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app.json:33-34`

### 5.4 Hidden Layer

Dokumentacja wymaga niewidocznego CIRCLE_ONLY i całkowitego usuwania wygasłego SECRET_DROP. Resolver zwraca nieuprawnionym tytuł, kategorię i fuzzed pozycję zarówno dla CIRCLE_ONLY, jak i wygasłego SECRET_DROP.

- Dokumentacja: `docs/HIDDEN_LAYER.md:66-68`
- Kod: `apps/api/src/services/hiddenLayer.ts:67-78`

### 5.5 Geo opt-in

Baza poprawnie ustawia consent na false, ale otwarcie Atlasu prosi o permission, a po zgodzie systemowej automatycznie zapisuje `locationConsent=true`. Zgoda systemowa i zgoda produktowa są zatem scalone.

- Dokumentacja: `CLAUDE.md:18`, `docs/SECURITY.md:39,70`
- Kod: `apps/mobile/app/(tabs)/index.tsx:295-304`

### 5.6 Retencja i szyfrowanie

Dokumentacja wymaga AES-256-GCM i usuwania surowego GPS po 90 dniach. Helper AES istnieje, ale nie jest używany, a retencja nie ma joba ani polityki w bazie.

- Dokumentacja: `docs/SECURITY.md:43-44,62,73`
- Kod: `packages/utils/src/encryption.ts`, brak wywołań

### 5.7 Design system

`CLAUDE.md` i pakiet `theme` opisują paletę Terra Mare, natomiast `docs/DESIGN_SYSTEM.md` zawiera starszą paletę Cosmic/Interstellar. Kod w większości podąża za Terra Mare, ale zawiera również lokalne kolory i style map.

### 5.8 Migracje

README migracji opisuje ręczny proces SQL związany z WSL, lecz repozytorium korzysta obecnie z Prisma migrate i Railway `db:deploy`. Istnieją też dwa pliki dodające `territories`, co wskazuje na historyczny drift procesu.

## 6. Architecture Audit

### 6.1 Frontend Architecture - 7/10

**Mocne strony**

- Czytelny podział web/mobile.
- Next.js App Router, SSR/SSG i metadata.
- Expo Router i logiczny podział ekranów.
- Wspólny theme, validation i types.
- React Query oddziela stan serwerowy w mobile.
- Lazy/dynamic loading ciężkiej mapy web.

**Słabości**

- Brak feature-based modules; mobile ma duże ekrany zawierające UI, logikę i side effects.
- `api-client` obejmuje tylko auth i spots, podczas gdy mobile tworzy drugi, własny klient.
- Duplikacja map kategorii, rang, kolorów i etykiet.
- Dużo tekstów mobile poza `i18n/pl.ts`.
- Hardcoded kolory mimo reguły design systemu.
- 22 błędy lint mobile.
- Brak error boundaries i pełnych loading states na web.

### 6.2 Backend Architecture - 6/10

**Mocne strony**

- Fastify z centralną konfiguracją security.
- Zod dla głównych operacji domenowych.
- Prisma i jawne selecty w wielu trasach.
- Argon2id, hashowane refresh tokeny i rotacja.
- Hidden Layer liczony po stronie serwera.
- Sentry, health endpoint i redaction logów.

**Słabości**

- Routing zawiera jednocześnie walidację, autoryzację, logikę domenową, bazę, push i realtime.
- Brak spójnej warstwy service/repository i transakcji dla części operacji.
- Krytyczne niespójności autoryzacji circle HTTP/Socket.
- Część endpointów używa ręcznych castów body zamiast Zod.
- Brak idempotency i job queue.
- Brak Redis adaptera Socket.io.
- Brak testów kontraktowych i integracyjnych.

### 6.3 Database Architecture - 5/10

**Mocne strony**

- Główne encje domenowe są obecne.
- Istnieją indeksy dla najczęstszych filtrów.
- Unikalność członkostwa i zapisów spotów.
- Soft delete dla explorerów i spotów.

**Słabości**

- Brak PostGIS mimo jawnego ADR.
- `Spot.circleId`, `Transmission.circleId/recipientId`, `InviteCode.createdById/usedById` i `Explorer.invitedById` nie mają pełnych relacji/FK.
- InviteCode nie jest przypisany do circle ani typu zaproszenia.
- Brak modeli płatności, reakcji, weryfikacji, moderacji i retention jobs.
- Trasy GPS jako nieograniczony JSONB.
- Zdjęcia mogą być przechowywane jako base64/data URI w DB.
- Brak modelu historii zmian tierów i trust score.

### 6.4 Mobile Architecture - 6/10

**Mocne strony**

- Pełna nawigacja Expo Router.
- SecureStore dla tokenów.
- React Query hooks dla głównych domen.
- Zustand dla auth/onboarding/recording.
- Sentry, deep links i notifications.
- UI obejmuje główne use cases CORE.

**Słabości**

- Brak persystencji React Query i offline queue.
- Nagrywanie journey wyłącznie foreground i RAM.
- Brak recoverability po crashu/process kill.
- Automatyczne proszenie o lokalizację na kluczowych ekranach.
- Brak lint w CI i 22 lokalne błędy lint.
- Hardcoded Google API key.
- Brak testów urządzeniowych i E2E.

## 7. Security and Privacy Audit

### CRITICAL

1. **Nieautoryzowane dołączanie do prywatnego circle.**  
   `POST /api/circles/:slug/join` sprawdza tylko, czy `inviteCode` jest niepusty. Nie waliduje kodu, daty wygaśnięcia, wykorzystania ani powiązania z circle.  
   Dowód: `apps/api/src/routes/circles.ts:72-92`.

2. **Nieautoryzowana subskrypcja pokoju Socket.io.**  
   Każdy zalogowany socket może wykonać `circle:join` dla dowolnego ID. Membership jest sprawdzany przy wysyłaniu, ale nie przy odbieraniu broadcastów.  
   Dowód: `apps/api/src/plugins/socket.ts:48-50`.

### HIGH

3. **Klucz Google Maps wpisany w repozytorium.**  
   Klucze klienta mogą być publiczne tylko po restrykcji package/SHA/API/quota. Repozytorium nie dowodzi takich restrykcji. Należy go zrotować i przenieść do konfiguracji buildowej.  
   Dowód: `apps/mobile/app.json:33-34`.

4. **Zgody prawne domyślnie ustawione na true.**  
   UI rejestracji nie prezentuje osobnych checkboxów, lecz wysyła obie zgody.  
   Dowód: `apps/mobile/app/(auth)/join.tsx:25`.

5. **Brak testów bezpieczeństwa i autoryzacji.**  
   Żaden przypadek cross-user/cross-circle nie jest automatycznie weryfikowany.

6. **Brak retencji GPS i purge kont.**  
   Dokumentowane gwarancje nie mają wykonawczego mechanizmu.

7. **Zdjęcia/data URI w bazie.**  
   Ryzyko wzrostu DB, DoS rozmiarem, kosztów backupu i niewłaściwej walidacji treści.

### MEDIUM

8. SECRET_DROP nie znika po wygaśnięciu.
9. CIRCLE_ONLY ujawnia tytuł, kategorię i przybliżoną pozycję.
10. Rejestracja nie jest faktycznie invite-only.
11. Brak weryfikacji e-mail i resetu hasła.
12. Push tokens nie mają obsługi receiptów i invalidacji.
13. Brak startowego fail-fast validation dla wszystkich sekretów.
14. Eksport RODO nie odpowiada dokumentowanemu "full JSON".

## 8. Technical Debt Report

| Dług | Ryzyko | Dowód / skutek |
|---|---|---|
| Circle invite bez walidacji | CRITICAL | `routes/circles.ts`; obejście prywatności |
| Socket room join bez membership | CRITICAL | `plugins/socket.ts`; podsłuch realtime |
| Brak testów | CRITICAL | Vitest: no test files |
| Hardcoded Google Maps key | HIGH | `mobile/app.json` |
| Brak PostGIS | HIGH | skan kandydatów + Haversine w pamięci |
| Brak Redis | HIGH | realtime nie działa poprawnie na wielu instancjach |
| Brak GPS retention | HIGH | niezgodność z SECURITY i ryzyko prywatności |
| Brak purge worker | HIGH | soft-deleted dane mogą pozostać bezterminowo |
| Zdjęcia base64 w DB | HIGH | koszt, wydajność, backup, limity |
| Brak payments przy aktywnych tierach | HIGH | tier może być nadawany poza billingiem |
| Journey recording tylko RAM | HIGH | utrata trasy po zamknięciu/crashu |
| Brak admin/moderation/reporting | HIGH | ryzyko treści i bezpieczeństwa użytkowników |
| Mobile poza lint CI | MEDIUM | obecnie 22 błędy niewidoczne w GitHub checks |
| Martwe `ioredis` | MEDIUM | deklarowana architektura bez implementacji |
| Martwe `@fastify/jwt` | LOW | używany jest `jsonwebtoken` |
| Martwe `expo-local-authentication` | LOW | zależność bez funkcji |
| AES helper bez użycia | HIGH | pozorna gwarancja szyfrowania |
| `api-client` niepełny | MEDIUM | duplikacja klienta i kontraktów |
| Duplikowane enum labels/colors | MEDIUM | drift UI między web/mobile/packages |
| Teksty poza `i18n/pl.ts` | MEDIUM | brak spójności i18n |
| Hardcoded kolory | LOW | łamanie reguły design systemu |
| Statyczny Journal w TS | MEDIUM | brak procesu redakcyjnego/CMS |
| Minimalny nieużywany SW | LOW | martwy artefakt, nie PWA |
| Duplikacja migracji territories | MEDIUM | ryzyko driftu środowisk |
| Brak DB FK dla części identyfikatorów | HIGH | osierocone i niespójne dane |
| Brak historii trust/tier | MEDIUM | trudny audyt i reklamacje |
| Brak walidacji Zod części body | MEDIUM | niespójne kontrakty wejściowe |
| Brak web 500 boundary | MEDIUM | słaby UX błędów produkcyjnych |
| Brak analytics | MEDIUM | brak danych do decyzji produktowych |

## 9. Roadmap Gap Analysis

### Missing Features - priorytet według wpływu

1. **Naprawa prywatności circles i Socket.io.**
2. **Testy autoryzacji, integracyjne API i krytyczne E2E.**
3. **Prawidłowy model invite code przypisany do circle i celu.**
4. **Jawne zgody prawne i rozdzielone consent flows.**
5. **Storage zdjęć z uploadem podpisanym, walidacją i limitami.**
6. **Persystentne i odporne nagrywanie journeys.**
7. **Retencja GPS, purge kont i harmonogramy zadań.**
8. **PostGIS dla zapytań geo.**
9. **Redis adapter dla Socket.io/presence/rate-limit.**
10. **Moderacja, raportowanie i panel operacyjny.**
11. **Weryfikacja e-mail i reset hasła.**
12. **Płatności i prawdziwy lifecycle tierów.**
13. **Pełna obsługa trust events, reakcji i weryfikacji spotów.**
14. **Generator wszystkich typów Signal.**
15. **Forum WORLD.**
16. **CMS lub pipeline treści Journal.**
17. **Offline cache/queue mobile.**
18. **PWA, error boundaries i pełny web performance budget.**
19. **Analytics privacy-first i metryki funnel/retention.**
20. **Backup/PITR, alerting, runbooki i disaster recovery.**

## 10. Project Completion Score

### Produkt - 61%

Rdzeń wartości jest widoczny i demonstracyjny, ale monetyzacja, moderacja, Forum, content pipeline oraz część mechaniki reputacji nie istnieją.

### Frontend web - 68%

Landing, mapa, Journal, profile, SEO i legal działają. Brakuje Forum, CMS, 500 boundary, PWA i mierzalnego performance/analytics.

### Backend - 66%

API pokrywa większość domen, lecz krytyczne luki access control, brak Redis/PostGIS/jobs/storage i testów obniżają ocenę.

### Mobile - 70%

Najpełniejsza warstwa produktu. Ma szeroki zestaw ekranów i integracji, ale nie jest odporna offline, ma 22 błędy lint i niespełnione wymagania prywatności/background.

### Infrastructure - 45%

Railway/Nixpacks, CI, Sentry i health check istnieją. Brak dowodów backupów, Redis, R2, retention workers, alertingu, staging, mobile release QA i testów.

### UX - 67%

Spójny kierunek wizualny i rozbudowane przepływy. Ryzyka: automatyczne consent prompts, brak stanów awarii/offline, niespójny design system, statyczne liczby social proof i nieaktywne płatne plany.

### Dokumentacja - 64%

Dokumenty architektury, bezpieczeństwa i Hidden Layer są wartościowe. Brakuje PRD, roadmapy, kryteriów akceptacji, API spec, modelu danych, runbooków i aktualizacji dokumentów po zmianach architektury.

### Całość projektu - 63%

Wynik uwzględnia nie tylko liczbę ekranów, ale też bezpieczeństwo, niezawodność i zdolność do obsługi realnych użytkowników.

## 11. Next Milestone Plan

### Sprint 1 - Security and MVP Gate

**Cel:** usunąć blokery zamkniętego MVP.

1. Przebudować `InviteCode`: `purpose`, `circleId`, `createdById`, `usedById`, expiry, max uses i transakcja użycia.
2. Walidować invite przy `join` i odrzucać kod spoza circle.
3. Sprawdzać membership przed `socket.join`.
4. Dodać testy cross-user/cross-circle dla HTTP i Socket.io.
5. Dodać checkboxy regulaminu i polityki prywatności bez domyślnego zaznaczenia.
6. Rozdzielić OS location permission od zgody produktowej.
7. Zrotować Google Maps key i ustawić restrykcje.
8. Dodać mobile lint do CI i usunąć 22 błędy.
9. Dodać fail-fast validation zmiennych środowiskowych.

**Definition of Done:** brak krytycznych ustaleń audytu, CI obejmuje mobile lint i testy bezpieczeństwa.

#### Stan realizacji - 11 czerwca 2026

- [x] `InviteCode` ma purpose, scope circle, relacje użytkowników, expiry, max uses i transakcyjne użycie.
- [x] Migracja `20260610000000_secure_circle_invites` została wdrożona do Supabase.
- [x] Join circle waliduje cel, circle, expiry i limit użyć kodu.
- [x] `circle:join` w Socket.io wymaga aktywnego membership.
- [x] Testy cross-user/cross-circle obejmują HTTP i handler Socket.io.
- [x] Rejestracja wymaga niezaznaczonych domyślnie checkboxów regulaminu i prywatności.
- [x] Zgoda produktowa location jest oddzielona od permission systemowego i od Presence.
- [ ] Zrotować historyczny klucz Google Maps i ograniczyć nowy klucz do Android package/SHA-1 oraz Maps SDK for Android.
- [x] Klucz usunięto z `app.json`, release build pobiera go z EAS env i failuje przy braku lub złym formacie.
- [x] Mobile lint ma 0 błędów i jest uruchamiany w CI.
- [x] API uruchamia fail-fast validation konfiguracji produkcyjnej.
- [x] CI uruchamia testy bezpieczeństwa API.
- [x] Migracje, Prisma schema, API health, web production build i release config mobile zostały zweryfikowane.

**Stan:** zakres repozytoryjny jest ukończony. Sprint operacyjnie pozostaje na **8/9 punktów**, ponieważ 11 czerwca 2026 historyczny klucz nadal odpowiadał `status=OK` dla Google Geocoding API. Do 100% wymagane są czynności z `docs/GOOGLE_MAPS_KEY_ROTATION.md`.

### Sprint 2 - Data Integrity and Product Completion

**Cel:** zamknąć podstawowe przepływy danych.

- [x] R2/S3 signed uploads, limity MIME/size, thumbnails i usuwanie obiektów.
- [x] Weryfikacja e-mail i reset hasła.
- [x] Background/persistent journey recording z recovery.
- [x] Job usuwania GPS po 90 dniach i purge po 30 dniach.
- [x] Pełne FK/relacje dla circle, transmission i invites.
- [x] Historia trust score i tier changes.
- [x] Implementacja reactions, spot verification i brakujących trust events.
- [x] Generowanie wszystkich Signal types.
- [x] Moderacja: report/block/suspend oraz minimalny panel operatora.

**Definition of Done:** dane mają integralność, retencję i obsługę incydentów.

**Stan 12 czerwca 2026:** implementacja repozytoryjna Sprintu 2 jest ukończona **9/9**.
Migracja `20260612000000_sprint2_data_integrity` została zastosowana do Supabase,
`prisma migrate status` potwierdza aktualny schemat, testy API przechodzą 32/32,
type-check i lint przechodzą dla API/web/mobile, a produkcyjny build web jest zielony.

**Konfiguracja wdrożeniowa:** przed uruchomieniem uploadu na danym środowisku trzeba
ustawić prawdziwe `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_PUBLIC_URL` oraz `JOB_SECRET`. Repo lokalne zawiera obecnie placeholdery R2,
więc endpoint uploadu celowo zwraca `503 STORAGE_NOT_CONFIGURED`, zamiast zapisywać
zdjęcia w bazie jako base64.

#### Domknięcie bramki przed Sprintem 3 - 14 czerwca 2026

- [x] `CIRCLE_ONLY` jest całkowicie niewidoczny dla osób spoza circle.
- [x] Wygasły `SECRET_DROP` znika z listy i endpointu szczegółów.
- [x] Zdjęcia, zapisy, reakcje, weryfikacje i upload respektują dokładny dostęp do spotu.
- [x] Blokady użytkowników obejmują DM, historię circle, realtime circle, push i presence.
- [x] Home base ma zaszyfrowany zapis/odczyt/usunięcie oraz UI mobilne.
- [x] Eksport RODO v2 zawiera własne dokładne koordynaty, zachowane trasy i odszyfrowany home base.
- [x] Retencja została przeniesiona z timera procesu do dziennego workflow z trwałym statusem.
- [x] Dodano automatyczny preview smoke test i bramkę konfiguracji przed Sprintem 3.
- [x] Testy API przechodzą 40/40, a type-check API/web/mobile jest zielony.
- [ ] Operacyjnie: zrotować historyczny klucz Google Maps i ustawić nowy w EAS.
- [ ] Operacyjnie: utworzyć/skonfigurować R2 oraz ustawić sekrety Railway/GitHub.
- [ ] Operacyjnie: wykonać preview APK i smoke test na fizycznym Androidzie.

**Decyzja:** zakres repozytoryjny przed Sprintem 3 jest ukończony. Rozpoczęcie
Sprintu 3 pozostaje zablokowane do czasu przejścia zewnętrznej checklisty
`docs/PRE_SPRINT_3_GATE.md`. Polecenie `pnpm gate:pre-sprint3` celowo zgłasza
brak gotowości, dopóki środowisko nie zawiera prawdziwych wartości.

### Sprint 3 - Scale, Monetization and WORLD

**Cel:** uruchomić wzrost i monetyzację.

1. PostGIS geography + `ST_DWithin`; migracja i benchmarki.
2. Redis adapter Socket.io, presence TTL i distributed rate limiting.
3. Checkout, webhooki, customer portal, grace periods i tier reconciliation.
4. Forum WORLD z moderacją.
5. CMS/MDX pipeline dla Journal.
6. Dynamiczne OG images.
7. Privacy-first analytics dla funnelu, aktywacji i retencji.
8. Persisted React Query i offline queue mobile.

**Definition of Done:** produkt może skalować na wiele instancji i mierzyć model biznesowy.

### Sprint 4 - Production Hardening

**Cel:** gotowość do publicznej produkcji.

1. E2E web/mobile i testy obciążeniowe geo/realtime.
2. Staging, preview environments i migration gates.
3. Backup/PITR restore drill.
4. SLO, uptime monitoring, alerting i on-call runbooks.
5. Security review, dependency scanning i secret scanning.
6. Lighthouse >=90 i budżety bundle/performance.
7. Accessibility audit WCAG.
8. App Store/Play Store privacy declarations, screenshots i release checklist.
9. Disaster recovery i procedura data breach.

**Definition of Done:** mierzalne SLO, odtworzenie backupu i zatwierdzony release checklist.

## 12. Final CTO Report

### Mocne strony projektu

- Wyraźny i atrakcyjny koncept produktu.
- Dobry podział WORLD/CORE/ENGINE.
- Szeroki działający przepływ mobilny.
- Wspólne pakiety typów, walidacji, geo i theme.
- Solidna baza auth: Argon2id, JWT i refresh rotation.
- Server-side Hidden Layer jako właściwy kierunek.
- Działające buildy API i web oraz type-check całego produktu.
- Sentry i health check już na etapie MVP.

### Słabe strony projektu

- Dokumentacja wyprzedza implementację bezpieczeństwa i infrastruktury.
- Brak testów automatycznych.
- Krytyczne błędy access control w circles.
- Brak PostGIS/Redis/R2 mimo deklaracji architektonicznych.
- Brak payments, moderacji i operacyjnego panelu.
- Brak realnej retencji i purge.
- Mobile nie jest objęty lintem CI.

### Największe ryzyka

1. Ujawnienie prywatnych wiadomości circle.
2. Obejście invite-only.
3. Przechowywanie danych lokalizacyjnych bez wykonawczej retencji.
4. Utrata tras GPS po przerwaniu procesu.
5. Brak regresyjnej ochrony przez testy.
6. Nieskalowalny realtime i geo query.
7. Brak moderacji przy produkcie opartym o lokalizacje i treści użytkowników.

### Co wykonano najlepiej

Mobilny pionowy przekrój CORE: onboarding, mapa, spoty, journeys, circles, transmisje, profile, notifications i API tworzą wiarygodny demonstrator produktu.

### Co wykonano najgorzej

Warstwa gwarancji bezpieczeństwa. Dokumenty deklarują prywatność i autorytatywną kontrolę jako najważniejszą właściwość produktu, ale circles posiadają bezpośrednie obejścia dostępu, a retencja i szyfrowanie są głównie deklaratywne.

### Co należy zrobić natychmiast

1. Zamknąć luki circle HTTP/Socket.
2. Zrotować i ograniczyć Google Maps key.
3. Poprawić consent flow.
4. Dodać testy autoryzacji.
5. Włączyć mobile lint do CI.
6. Wstrzymać publiczne skalowanie do zamknięcia powyższych punktów.

### Czy projekt jest gotowy do MVP?

**Repozytoryjnie: TAK dla kontrolowanego, zamkniętego MVP.**  
**Operacyjnie: jeszcze NIE**, dopóki nie zostaną skonfigurowane i zweryfikowane
Google Maps, R2, retencja GitHub/Railway oraz preview APK na fizycznym urządzeniu.

### Czy projekt jest gotowy do produkcji?

**NIE.**  
Brakuje skalowania PostGIS/Redis, pełnych E2E, odtworzenia backupu, SLO/alertingu,
audytu dostępności, release QA oraz części modelu biznesowego.

### Szacowany poziom ukończenia

**63%**

### DOKUMENTACJA <-> IMPLEMENTACJA

**58% zgodności**

Najwyższa zgodność: struktura monorepo, główne domeny CORE, auth, fuzzing publiczny, progi rang, podstawowy realtime i kierunek wizualny Terra Mare.

Najniższa zgodność: PostGIS, Redis, Mapbox mobile, Hidden Layer edge cases, invite security, AES w użyciu, GPS retention, purge, storage R2, payments, Forum, testy i production checklist.
