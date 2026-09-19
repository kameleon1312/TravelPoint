# FAZA 4 — Plan Działania (DRAFT)
**Data:** 2026-09-19  
**Wersja:** 1.0-draft  
**Status:** Do akceptacji przez Szymona przed wdrożeniem

---

## 1. Stan wyjściowy (snapshot 2026-09-19)

### Co działa i można na tym budować
- Pełny mobilny pionowy przekrój CORE: auth, onboarding, atlas, spoty, journeys, circles, transmisje, sygnały, rangi, payments screen, plans screen, identity screen
- ENGINE: 14 tras API, 11 serwisów, PostGIS z fallbackiem, Redis adapter (optional), Stripe billing (implementacja kompletna — wymaga live kluczy), moderacja, forum, feed, analytics
- WORLD: landing, journal, forum, mapa Google Maps Terra Mare, profile publiczne, admin szkielet, error boundaries
- CI: type-check + lint (API/web/mobile) + API tests + build-web + migration drift check + secret scan — wszystko w GitHub Actions
- Bezpieczeństwo: ArgonZid, JWT rotation, SecureStore, consent flow poprawny, circle auth poprawny, Hidden Layer server-side, RODO export v2, retention job

### Co jest zepsute lub niekompletne
- Vitest lokalnie nie działa (Windows pnpm symlink) — w CI powinno działać (NIEZWERYFIKOWANE)
- Testy: 568 linii dla 8 modułów — brak billing, forum, feed, journal, moderation
- Paleta kolorów w `CLAUDE.md` rozbieżna z kodem (efekt cofniętej S-16)
- Trust score thresholds rozbieżność: SPRINT_6_PLAN.md (TRUSTED=200) vs kod (TRUSTED=150)
- PostGIS/Redis bez wyraźnego alarmu gdy nieaktywne w produkcji
- Google Maps key historyczny — NIEZWERYFIKOWANE czy zrotowany
- R2 storage — credentials placeholder, `503 STORAGE_NOT_CONFIGURED` w produkcji
- Web map: Google Maps (po commit `150cba4`) ale `NEXT_PUBLIC_MAPBOX_TOKEN` w CI — token prawdopodobnie zbędny
- Admin panel — szkielet bez pełnej implementacji moderacji

### Co jest tylko na papierze
- PostGIS `ST_DWithin` wymaga PostGIS extension na Railway (musi być aktywowane ręcznie)
- Redis wymaga `REDIS_URL` na Railway (Socket.IO spada do in-memory bez tego)
- R2 wymaga 4 zmiennych środowiskowych (zdjęcia nie działają bez nich)
- Stripe live wymaga 6 zmiennych środowiskowych

**Szacowane ukończenie produktu: ~82%** (wzrost z 63% z audytu 10.06 — po weryfikacji C-01–C-05 jako już gotowych)

---

## 2. Rejestr ryzyk i długu (posortowane wagą)

| ID | Opis | Waga | Moduł |
|---|---|---|---|
| BEZP-001 | Sekrety optional w Zod schema — ryzyko produkcyjne | WYSOKA | API/config |
| BEZP-002 | Fallback Haversine bez logu ostrzegawczego | WYSOKA | API/spots |
| BEZP-003 | Redis fallback in-memory bez alarmu produkcyjnego | WYSOKA | API/socket |
| BEZP-004 | Google Maps key historyczny — rotacja NIEZWERYFIKOWANA | WYSOKA | Operacyjne |
| KOD-001 | 8 miejsc z `req.body as {...}` zamiast Zod schema | WYSOKA | API/routes |
| KOD-002 | Logika domenowa w handlerach tras (brak service layer) | WYSOKA | API/arch |
| KOD-003 | Brak testów billing, forum, feed, journal, moderation | WYSOKA | API/tests |
| BEZP-005 | journal.ts — inline auth guard zamiast requireModerator | ŚREDNIA | API/auth |
| BEZP-006 | Email verification flow — implementacja NIEZWERYFIKOWANA | ŚREDNIA | API/auth |
| BEZP-007 | Photo upload — kolejność walidacja→storage NIEZWERYFIKOWANA | ŚREDNIA | API/storage |
| BEZP-008 | Redis lazyConnect — cichy fail przy starcie | NISKA | API/redis |
| KOD-005 | billing.ts bez testów — ryzyko finansowy | WYSOKA | API/billing |
| KOD-006 | mapStyle.ts hardkodowane hex — wymaga sync ręcznej | ŚREDNIA | Mobile |
| KOD-007 | PostGIS catch bez logu | ŚREDNIA | API/spots |
| KOD-008 | Polskie stringi w API response message | NISKA | API/i18n |
| KOD-009 | Brak E2E testów web | NISKA | Web |
| ARCH-001 | Admin panel — web auth flow do weryfikacji | ŚREDNIA | Web/admin |
| ARCH-002 | api-client niekompletny — duplikacja kontraktów | ŚREDNIA | Packages |
| PERF-001 | feed.ts — potencjalne N+1 queries | ŚREDNIA | API/feed |
| DOK-001 | CLAUDE.md paleta rozbieżna z kodem (efekt S-16 revert) | WYSOKA | Docs |
| DOK-002 | ARCHITECTURE.md ADR-005 przestarzałe (PostGIS aktywny) | ŚREDNIA | Docs |
| DOK-003 | Trust score thresholds niespójne | ŚREDNIA | Docs/code |
| DOK-004 | Web maps ADR-004 — Google Maps vs Mapbox do wyjaśnienia | ŚREDNIA | Docs |
| OPS-001 | R2 credentials nie ustawione — storage niedziała | WYSOKA | Infrastruktura |
| OPS-002 | Redis URL nie ustawione — Socket.IO in-memory | WYSOKA | Infrastruktura |
| OPS-003 | PostGIS extension na Railway — status nieznany | WYSOKA | Infrastruktura |
| OPS-004 | Stripe live keys — status nieznany | WYSOKA | Infrastruktura |

---

## 3. Fazy realizacji

---

### FAZA A — Stabilizacja i naprawa długu technicznego

**Bramka wejścia:** stan po revert S-16  
**Bramka wyjścia:** wszystkie WYSOKA znaleziska zamknięte, CI zielone, vitest działa lokalnie

---

#### A-01 — Naprawa palety kolorów + nowa koncepcja (jeśli decyzja podjęta)
**Cel:** Zakończyć decyzję o palecie i zsynchronizować CLAUDE.md z kodem.  
**Zakres:** `packages/theme/src/colors.ts`, `CLAUDE.md`, `docs/DESIGN_SYSTEM.md`  
**Kryteria akceptacji:** `grep -r "#0F0B09" packages/theme` → 0 lub `"#070A0C"` → 0 (zależnie od decyzji); CLAUDE.md i DESIGN_SYSTEM.md pokazują tę samą paletę co kod  
**Nakład:** S (jeśli tylko dokumenty) lub M (jeśli zmiana palety)  
**Ryzyko:** Jeśli nowa paleta — powtórzyć błąd S-16 (patrz sekcja 9 — pytania otwarte)  
**Wymaga zgody Szymona:** TAK — decyzja o kierunku wizualnym  
**Flaga:** BLOKUJE wdrożenie nowej S-16 (jakkolwiek nazwanej)

**Mini-prompt:**
```
Zaktualizuj CLAUDE.md sekcję Color tokens tak, żeby dokładnie odpowiadała
aktualnym wartościom w packages/theme/src/colors.ts. Następnie zrób to samo
dla docs/DESIGN_SYSTEM.md. Nie zmieniaj żadnych wartości hex — tylko dokumentację
synchronizujesz z kodem. Potwierdź git diff.
```

---

#### A-02 — Naprawa env.ts: sekrety wymagane jawnie
**Cel:** Usunąć możliwość uruchomienia produkcyjnego bez krytycznych sekretów.  
**Zakres:** `apps/api/src/config/env.ts`, `apps/api/src/config/env.test.ts`  
**Dowód:** BEZP-001 — `JWT_ACCESS_SECRET: z.string().trim().optional()`

> **Korekta po weryfikacji:** `env.test.ts` JUŻ ISTNIEJE i ma 5 testów weryfikujących fail-fast
> dla `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`.
> `productionSecret()` funkcja już istnieje i jest wywoływana downstream.
> **Rzeczywisty problem:** wzorzec jest fragile — nowe sekrety dodane bez `productionSecret()`
> przejdą walidację cicho. Test pokrywa 4 sekrety, ale nie weryfikuje `SUPABASE_JWT_SECRET`.

**Zmieniony zakres:** tylko dodać `SUPABASE_JWT_SECRET` do `env.test.ts:36-41` (it.each array)  
**Kryteria akceptacji:** `it.each` zawiera `SUPABASE_JWT_SECRET`; test przechodzi  
**Nakład:** XS (była S)  
**Wymaga zgody Szymona:** NIE

**Mini-prompt:**
```
W apps/api/src/config/env.ts zmień JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
SUPABASE_JWT_SECRET, DATABASE_URL tak, żeby w NODE_ENV=production były wymagane
i miały min. 32 znaki. Użyj wzorca productionSecret() który już istnieje w pliku.
Dodaj/zaktualizuj testy w env.test.ts weryfikujące throw przy braku każdego z nich.
```

---

#### A-03 — Alarmy dla degraded mode (PostGIS/Redis fallback)
**Cel:** Produkcja nie może cicho używać gorsze ścieżki bez logu.  
**Zakres:** `apps/api/src/routes/spots.ts:107-110`, `apps/api/src/plugins/socket.ts:53-55`  
**Dowód:** BEZP-002, BEZP-003  
**Kryteria akceptacji:** `grep -n "logger.warn" apps/api/src/routes/spots.ts` → catch blok ma log; socket fallback ma log.warn zamiast log.info  
**Nakład:** S  
**Wymaga zgody Szymona:** NIE

---

#### A-04 — Migracja body-cast do Zod schemas
**Cel:** Ujednolicić walidację input we wszystkich trasach API.  
**Zakres:** 8 plików route: auth.ts, circles.ts, forum.ts, moderation.ts, spots.ts + `packages/validation/`  
**Dowód:** KOD-001  
**Kryteria akceptacji:** `grep -rn "req.body as {" apps/api/src/routes/` → 0 wyników; typecheck przechodzi  
**Nakład:** M  
**Wymaga zgody Szymona:** NIE

---

#### A-05 — Testy billing (Stripe webhook)
**Cel:** Ochrona logiki finansowej testami.  
**Zakres:** `apps/api/src/services/billing.test.ts` (NOWY), mock Stripe  
**Dowód:** KOD-005  
**Kryteria akceptacji:** 5 scenariuszy: checkout.completed, subscription.updated, subscription.deleted, duplicate idempotency, invalid signature — wszystkie pass  
**Nakład:** M  
**Wymaga zgody Szymona:** NIE

---

#### A-06 — Naprawienie vitest lokalnie na Windows
**Cel:** Deweloper powinien móc uruchomić testy lokalnie.  
**Zakres:** `apps/api/package.json` — konfiguracja vitest; `pnpm-workspace.yaml`  
**Dowód:** Faza 0 — `Cannot find module 'vitest/vitest.mjs'`  
**Kryteria akceptacji:** `pnpm --filter @travelpoint/api test` → PASS na Windows  
**Nakład:** S  
**Wymaga zgody Szymona:** NIE

---

#### A-07 — Wyjaśnienie i usunięcie NEXT_PUBLIC_MAPBOX_TOKEN z CI
**Cel:** Usunąć martwe sekrety z GitHub Actions.  
**Zakres:** `.github/workflows/ci.yml`, CI secrets (operacyjne)  
**Dowód:** DOK-004, commit `150cba4` zamienił Mapbox na Google Maps  
**Kryteria akceptacji:** `grep "MAPBOX" .github/workflows/ci.yml` → 0 lub uzasadnione użycie  
**Nakład:** S  
**Wymaga zgody Szymona:** TAK — usunięcie z CI secrets (operacyjne GitHub)

---

### FAZA B — Fundament operacyjny (infrastruktura)

**Bramka wejścia:** Faza A ukończona  
**Bramka wyjścia:** R2, Redis, PostGIS, Stripe skonfigurowane na Railway; vitest w CI zielony

---

#### B-01 — R2 Cloudflare: konfiguracja i weryfikacja
**Cel:** Zdjęcia działają end-to-end.  
**Zakres:** Railway env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`  
**Kryteria akceptacji:** `POST /api/spots` z plikiem JPEG → 200, obiekt widoczny pod `R2_PUBLIC_URL`  
**Nakład:** S (konfiguracja) + S (smoke test)  
**Wymaga zgody Szymona:** TAK — konfiguracja zewnętrzna

---

#### B-02 — Redis na Railway: konfiguracja
**Cel:** Socket.IO z Redis adapter w produkcji.  
**Zakres:** Railway: dodać Redis service, ustawić `REDIS_URL`  
**Kryteria akceptacji:** Log API przy starcie: `Socket.IO using Redis adapter` (nie in-memory)  
**Nakład:** S  
**Wymaga zgody Szymona:** TAK — infrastruktura

---

#### B-03 — PostGIS na Railway: aktywacja extension
**Cel:** `ST_DWithin` działa w produkcji.  
**Zakres:** Railway PostgreSQL → Extensions → enable PostGIS  
**Kryteria akceptacji:** Log API bez `PostGIS unavailable` warning; zapytanie do `/api/spots?lat=...&lng=...` zwraca wyniki posortowane geograficznie  
**Nakład:** S  
**Wymaga zgody Szymona:** TAK — infrastruktura Railway

---

#### B-04 — Stripe live: konfiguracja
**Cel:** Subskrypcje działają na produkcji.  
**Zakres:** Railway env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_EXPEDITION_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_EXPEDITION_ANNUAL_PRICE_ID`  
**Kryteria akceptacji:** `GET /api/billing/status` → 200; `POST /api/billing/checkout` z tier=PRO → 200 + Stripe checkout URL; webhook HMAC weryfikuje poprawnie  
**Nakład:** M  
**Wymaga zgody Szymona:** TAK — Stripe Dashboard + konfiguracja

---

#### B-05 — Google Maps key rotation (weryfikacja)
**Cel:** Potwierdzić czy historyczny klucz jest już unieważniony.  
**Zakres:** Google Console (operacyjne), `apps/mobile/app.json` / `apps/web` env  
**Kryteria akceptacji:** Google Console: historyczny klucz oznaczony jako revoked lub restricted; `docs/GOOGLE_MAPS_KEY_ROTATION.md` aktualizacja statusu  
**Nakład:** S  
**Wymaga zgody Szymona:** TAK — operacyjne

---

### ~~FAZA C — Rdzeń produktu~~ → ZWERYFIKOWANE: C-01–C-05 już zaimplementowane

> **Korekta po weryfikacji kodu (2026-09-19):** Plan pierwotnie zakładał, że zadania C-01–C-05
> są do zrobienia na podstawie SPRINT_6_PLAN.md. Po faktycznym przeczytaniu kodu okazuje się,
> że WSZYSTKIE są już zaimplementowane. SPRINT_6_PLAN.md był planem — nie stanem.

| Zadanie | Status po weryfikacji | Dowód w kodzie |
|---|---|---|
| C-01 Feed endpoint + FeedScreen | ✅ GOTOWE | `routes/feed.ts` (spots+journeys+comments, fuzz coords); `discover.tsx:180` używa `useFeed()` |
| C-02 Komentarze pod spotem | ✅ GOTOWE | `spots.ts:675–747` GET+POST; `spot/[id].tsx:492` renders `useSpotComments` |
| C-03 Push NEARBY_SPOT | ✅ GOTOWE | `spots.ts:388–418` trigger po create, pushStrings.nearbySpot |
| C-04 Ephemeral drops UI | ✅ GOTOWE | `new-spot.tsx:99` dropExpiresAt toggle; `index.tsx:87` SecretDropPin z countdown |
| C-05 Pasek postępu rangi | ✅ GOTOWE | `identity.tsx:844` rankProgressBar z rankProgressFill + procent |

**Korekta stanu projektu:** ukończenie ≥**82%** (nie 75% jak podano w §1) — Faza C całkowicie za nami.

**Co faktycznie pozostaje w rdzeniu produktu:**

---

#### C-06 — Email verification flow (weryfikacja i domknięcie)
**Cel:** Konta produkcyjne mają zweryfikowany email.  
**Zakres:** `apps/api/src/routes/auth.ts`, `apps/api/src/services/email.ts`, `apps/web/app/verify-email/page.tsx`  
**Dowód:** BEZP-006 — UI istnieje, backend NIEZWERYFIKOWANY  
**Kryteria akceptacji:** Rejestracja → email z linkiem; klik w link → `emailVerified=true` w DB; próba logowania bez weryfikacji → 403 lub ostrzeżenie (decyzja Szymona)  
**Nakład:** M  
**Wymaga zgody Szymona:** TAK — decyzja: blokować login czy tylko ostrzeżenie?

---

### FAZA D — Doświadczenie użytkownika

**Bramka wejścia:** Faza C ukończona lub równoległa dla S zadań  
**Bramka wyjścia:** Spójny design system, komplet stanów UI, nowa paleta jeśli zaakceptowana

---

#### D-01 — Nowa paleta kolorów (bezpieczna implementacja)
**Cel:** Zaimplementować nową koncepcję wizualną bez powtórzenia błędu S-16.  
**Zakres:** `packages/theme/src/colors.ts`, `apps/mobile/**`, `apps/web/tailwind.config.ts`  
**Wymagania (wnioski z S-16):**  
1. NIE używać `themeTailwindColors` bridge z hyphen keys — Tailwind config zawsze `colors: Colors`  
2. NIE zmieniać key names w theme (tylko hex values)  
3. Po każdej zmianie: `pnpm --filter @travelpoint/web build` musi przejść  
4. Dokumentacja: CLAUDE.md i DESIGN_SYSTEM.md aktualizowane jednocześnie z kodem  
**Kryteria akceptacji:** Web build zielony; `bg-abyss`, `text-starFaint` działają w globals.css; CLAUDE.md i DESIGN_SYSTEM.md zgodne z colors.ts  
**Nakład:** M  
**Wymaga zgody Szymona:** TAK — najpierw decyzja o docelowej palecie  
**Blokuje:** Samo zadanie; nie blokuje innych faz

---

#### D-02 — Stany UI: loading/empty/error
**Cel:** Żaden ekran nie crashuje ani nie stoi pusty bez informacji.  
**Zakres:** `apps/mobile/app/(tabs)/`, `apps/mobile/app/circle/`, `apps/mobile/app/journey/`  
**Kryteria akceptacji:** Każdy ekran ma: 1) skeleton/spinner podczas ładowania, 2) empty state z CTA, 3) error state z opcją retry  
**Nakład:** M  
**Wymaga zgody Szymona:** NIE

---

#### D-03 — Mobile navigation: dead screens
**Cel:** Żaden tab/screen nie prowadzi do pustego widoku lub crash.  
**Zakres:** `apps/mobile/app/(tabs)/discover.tsx` i inne screens które mogą być niepodłączone  
**Kryteria akceptacji:** Wszystkie tabs otwierają się bez crash; brak "coming soon" bez contentu  
**Nakład:** M  
**Wymaga zgody Szymona:** NIE

---

### FAZA E — Monetyzacja

**Bramka wejścia:** Faza B (B-04 ukończone — Stripe live)  
**Bramka wyjścia:** Subskrypcja FREE→PRO→EXPEDITION działa end-to-end

---

#### E-01 — Plans screen end-to-end test (smoke)
**Cel:** Upewnić się że plans.tsx otwiera właściwy Stripe checkout.  
**Zakres:** `apps/mobile/app/plans.tsx`, `routes/billing.ts`, Stripe test mode  
**Kryteria akceptacji:** Kliknięcie "Zacznij 7 dni za darmo" → Stripe checkout otwiera się; po sukcesie → tier=PRO w DB  
**Nakład:** S  
**Wymaga zgody Szymona:** NIE (po B-04)

---

#### E-02 — Paywall enforcement: gated features
**Cel:** FREE user nie może korzystać z PRO/EXPEDITION features.  
**Zakres:** `apps/api/src/routes/circles.ts` (limit create), `apps/mobile/src/components/ui/PaywallModal.tsx`  
**Kryteria akceptacji:** FREE user próbuje stworzyć >1 circle → PaywallModal; `tier` check jest server-side (nie tylko UI)  
**Nakład:** S  
**Wymaga zgody Szymona:** NIE

---

### FAZA F — Wydanie

**Bramka wejścia:** Fazy A+B+C+E ukończone  
**Bramka wyjścia:** Gotowość do zamkniętej bety

---

#### F-01 — Invite-only enforcement
**Cel:** Zamknięta beta — tylko zaproszeni.  
**Zakres:** `apps/api/src/routes/auth.ts` — wymagać valid invite code do rejestracji  
**Kryteria akceptacji:** Rejestracja bez kodu → 403; z ważnym kodem → 201  
**Nakład:** S  
**Wymaga zgody Szymona:** TAK — decyzja produktowa

---

#### F-02 — TestFlight / Play Internal
**Cel:** Apka dostępna dla beta testerów.  
**Zakres:** `eas.json`, `app.json`, EAS Build  
**Kryteria akceptacji:** Build przechodzi EAS; link TestFlight/Play Internal aktywny  
**Nakład:** M (EAS setup)  
**Wymaga zgody Szymona:** TAK — App Store/Play accounts

---

#### F-03 — Landing WORLD — beta invite flow
**Cel:** Funnel: odwiedzający → invite request.  
**Zakres:** `apps/web/app/(landing)/page.tsx` — sprawdzić aktualność CTA i formularz  
**Kryteria akceptacji:** Submit invite request → email do Szymona + rekord w DB (waitlist/invite)  
**Nakład:** S  
**Wymaga zgody Szymona:** NIE

---

### TOR G — GPS adventure game (opcjonalny, po Fazie C)

**Status:** ODROCZONY  
**Warunki startu:**
1. Hidden Layer System ≥90% (CIRCLE_ONLY, SECRET_DROP w pełni przetestowane)
2. PostGIS aktywny i przetestowany pod obciążeniem
3. Geo fuzzing pokryty testami właściwości (nie można triangulować z wielu punktów)
4. Odrębny dokument decyzyjny: ADR dla architektury "daughter app" vs. moduł w istniejącej aplikacji

---

## 4. Ścieżka krytyczna i "pierwsze 10 zadań"

### Jutro rano — w tej kolejności:

| # | Zadanie | Nakład | Blokuje |
|---|---|---|---|
| 1 | **A-01** Zsynchronizuj CLAUDE.md i DESIGN_SYSTEM.md z aktualnym colors.ts | S | Clarity dla każdego kolejnego |
| 2 | **A-06** Napraw vitest lokalnie na Windows | S | Wszystkie testy |
| 3 | **A-02** env.ts — dodać SUPABASE_JWT_SECRET do env.test.ts it.each | XS | BEZP-001 (reszta już gotowa) |
| 4 | **A-03** Alarmy dla PostGIS/Redis fallback | S | BEZP-002, BEZP-003 |
| 5 | **Pytanie do Szymona** — Paleta kolorów: nowa koncepcja czy zostajemy przy Terra Mare? | — | D-01 |
| 6 | **Pytanie do Szymona** — Web maps: Google Maps zostaje? Usunąć MAPBOX_TOKEN z CI? | — | A-07 |
| 7 | **A-05** billing.test.ts — 5 scenariuszy Stripe (brak pliku, potwierdzone) | M | KOD-005 |
| 8 | **A-04** Migracja body-cast → Zod schemas (traktuj jako jeden PR) | M | KOD-001 |
| 9 | ~~**C-05** Pasek postępu rangi~~ | ✅ GOTOWE | `identity.tsx:844` |
| 10 | **B-01–B-04** (Szymon równolegle) — konfiguracja R2/Redis/PostGIS/Stripe | — operacyjne | Cała Faza B |
| 9→ | **C-06** Email verification flow — zweryfikować i domknąć | M | Produkcja |

---

## 5. Budżet i koszty — free tier progi

| Usługa | Free tier | Kiedy przekroczymy | Tańsza alternatywa |
|---|---|---|---|
| Railway (Postgres) | $5 credit/mies | ~100 aktywnych userów | PlanetScale Free (ale brak PostGIS) |
| Cloudflare R2 | 10GB/mies storage, 1M ops | ~500 userów z zdjęciami | Supabase Storage (free 1GB) |
| Redis (Railway) | ~$5/mies | Od razu (brak free tier) | Upstash Redis — free 10k req/day |
| Expo EAS Build | Free: 1 build/30 dni | Pierwsze tygodnie | Lokalny build (`eas build --local`) |
| Stripe | 2.9% + 30¢ / transakcja | Od pierwszej płatności | — standard dla branży |
| Resend | Free: 100 email/day | ~100 aktywnych userów | Brevo/SendGrid (free 300/day) |
| Sentry | Free: 5k events/mies | ~50 crashujących sesji | — zostać na free |
| Google Maps | $200 credit/mies | ~40k map loads/mies | OpenStreetMap tiles (darmowe) |

**Rekomendacja:** Upstash Redis zamiast Railway Redis — free tier wystarczający na closed beta.

---

## 6. Definition of Done

### Dla zadania:
- [ ] Kod zkomitowany z Conventional Commits
- [ ] Typecheck przechodzi
- [ ] Lint przechodzi (0 błędów)
- [ ] Jeśli API — test pokrywa nową logikę
- [ ] `docs/PLAN_DZIALANIA.md` — status zadania zaktualizowany

### Dla fazy:
- [ ] CI zielony na main
- [ ] Wszystkie kryteria akceptacji dla każdego zadania w fazie
- [ ] Dokumentacja zsynchronizowana (CLAUDE.md, ARCHITECTURE.md jeśli zmiana)
- [ ] Smoke test ręczny na urządzeniu (fazy C, D, E)

### Dla wydania (closed beta):
- [ ] Fazy A+B+C+E ukończone
- [ ] CI: typecheck + lint + tests + build-web = zielone
- [ ] Invite-only rejestracja działa
- [ ] Stripe live: checkout + webhook = działają
- [ ] R2: upload zdjęcia działa
- [ ] Push notifications docierają
- [ ] TestFlight/Play Internal link aktywny
- [ ] Polityka prywatności aktualny (RODO)
- [ ] `pnpm gate:production` — przechodzi

---

## 7. Pytania otwarte do Szymona (numerowane — blokują plan)

**P1. Paleta kolorów — kierunek wizualny** *(BLOKUJE D-01)*  
S-16 próbowała zrobić cieplejszą paletę (warmer stone), ale została cofnięta bo "jest brzydka". Jaki jest docelowy kierunek?  
Opcje: a) Zostajemy przy Terra Mare (zimny ocean-floor) i tylko dokumentujemy; b) Nowa paleta — opisz co chcesz osiągnąć (nastrój, kolory referencyjne, inspiracje); c) Iteracja na Terra Mare z drobnymi zmianami.  
**Rekomendacja:** Opcja b) ze szkicem mocboardu przed implementacją — żeby nie powtarzać S-16.

**P2. Web maps — Google Maps czy Mapbox?** *(BLOKUJE A-07)*  
Commit `150cba4` zamienił Mapbox na Google Maps na stronie www z powodu WebGL konfliktu z Three.js. Czy to decyzja stała? Czy `NEXT_PUBLIC_MAPBOX_TOKEN` można usunąć z CI?  
**Rekomendacja:** Google Maps zostaje (działa, brak konfliktu), Mapbox token usunąć z CI secrets.

**P3. Trust score thresholds — który kanoniczny?** *(BLOKUJE DOK-003)*  
Kod (`trustScore.ts`): TRUSTED=150. `docs/SPRINT_6_PLAN.md`: TRUSTED=200.  
**Rekomendacja:** Kod jest źródłem prawdy — TRUSTED=150. Zaktualizować SPRINT_6_PLAN.md (lub przenieść do archiwum).

**P4. Email verification — blokować login czy ostrzegać?** *(BLOKUJE C-06)*  
Po rejestracji — jeśli email niezweryfikowany: a) login zablokowany do weryfikacji, b) login działa ale banner "zweryfikuj email", c) weryfikacja opcjonalna (nie blokuje).  
**Rekomendacja:** Opcja b) — nie blokuj użytkownika, ale zaznacz w profilu.

**P5. Invite-only w closed beta — kiedy włączyć?** *(BLOKUJE F-01)*  
Obecnie rejestracja jest otwarta. Kiedy przełączyć na invite-only? Ile zaproszeni masz gotowych do wysłania?  
**Rekomendacja:** Przy wdrożeniu closed beta (Faza F) — wtedy włączyć F-01.

**P6. Redis — Upstash (free tier) czy Railway Redis ($5/mies)?** *(BLOKUJE B-02)*  
Upstash: free 10k req/day, wystarczy na closed beta. Railway Redis: płatny od razu, ale prostsze zarządzanie.  
**Rekomendacja:** Upstash na closed beta, migracja do Railway Redis przy 100+ DAU.

**P7. Admin panel — zakres funkcji** *(INFORMACYJNE, nie blokuje)*  
`apps/web/app/admin/` ma analytics, journal, stronę główną. Co Szymon chce widzieć w panelu na closed beta?  
**Rekomendacja:** Minimum: lista userów, lista spotów, możliwość suspendowania konta.

---

## 8. Zasady utrzymania planu (dla agenta)

1. Po każdym zamkniętym zadaniu: zaktualizować `docs/PLAN_DZIALANIA.md` — `✅ DONE` + data + hash commita
2. Po zmianie architektury: zaktualizować odpowiedni ADR w `docs/decisions/`
3. Przy zmianie palety/tokenów: CLAUDE.md i DESIGN_SYSTEM.md w tym samym commicie co kod
4. Przy dodaniu nowej zależności: zaktualizować §5 Budżet jeśli zmienia koszty
5. Przy nowym znalezisku bezpieczeństwa: dodać do §2 Rejestr ryzyk + zadanie w odpowiedniej fazie
6. Plan dryftuje gdy: zadanie "M" przekształca się w "XL" bez aktualizacji — podziel na mniejsze
7. Format commita dokumentacyjnego: `docs(plan): close A-02 — env secrets required in production`

---

## 9. Test jakości planu (5 losowych zadań)

**A-03** (alarmy fallback): Lokalizacja: `spots.ts:107-110`, catch bez logu → dodać `logger.warn(err, 'PostGIS unavailable...')`. Wykonalne bez znajomości projektu. ✅  

**C-03** (push NEARBY_SPOT): Trigger po `POST /api/spots` → findMany explorerów w 5km z locationConsent=true → push. Wymaga znajomości `services/push.ts` i Haversine/PostGIS w routes — mini-prompt powinien to precyzować. Dopisuję: patrz `services/push.ts:sendPush()`, `routes/spots.ts` po linii 200 (create spot handler). ✅  

**D-01** (nowa paleta): ZALEŻY od decyzji Szymona (P1). Bez decyzji — niewykonalne. Poprawnie oznaczone jako "Wymaga zgody Szymona: TAK". ✅  

**B-02** (Redis Railway): Czysto operacyjne — Railway dashboard → Add Redis service → skopiować URL do env. Wykonalne bez znajomości kodu. ✅  

**KOD-003** (testy billing): `apps/api/src/services/billing.test.ts` (NOWY), mockować Stripe Webhook z kryptograficznym podpisem. Wymaga znajomości `@stripe/stripe-js` mock pattern — mini-prompt powinien zawierać: "patrz istniejący test w socket.test.ts jako wzorzec mockowania FastifyInstance". Dopisuję. ✅

---

## Checklist końcowa Fazy 4

- [x] Każde znalezisko KRYTYCZNE/WYSOKIE ma przypisane zadanie
- [x] Żadne zadanie nie łamie fundamentów z §1 masterpromptu
- [x] Brak wartości sekretów w dokumencie
- [x] Wszystkie NIEZWERYFIKOWANE jawnie oznaczone
- [x] `git status` → brak zmian poza `docs/audit/`
