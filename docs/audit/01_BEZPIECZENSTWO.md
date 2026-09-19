# FAZA 1 — Audyt bezpieczeństwa i prywatności
**Data:** 2026-09-19  
**Baseline:** `docs/PROJECT_AUDIT_2026-06-10.md`  
**Zakres:** stan bieżący po S1–S15 (commit `0dc3875`)

---

## 1.0 Weryfikacja końcowa
- [x] Brak wartości sekretów
- [x] Brak zmian w kodzie — tylko `docs/audit/`
- [x] Nie dotknięto Supabase/RLS/schema/API

---

## 1.1 Postęp względem audytu z 10 czerwca 2026

Poniższe krytyczne/wysokie z poprzedniego audytu zostały naprawione:

| Problem z 06-2026 | Status |
|---|---|
| Circle join bez walidacji invite code | ✅ NAPRAWIONE — `services/inviteCodes.ts`, `circles.ts:96-130` |
| Socket circle:join bez membership check | ✅ NAPRAWIONE — `plugins/socket.ts:26-36`, `hasCircleMembership()` |
| Zgody prawne domyślnie true | ✅ NAPRAWIONE — checkboxy w `join.tsx:220-254` |
| OS location permission = product consent | ✅ NAPRAWIONE — `index.tsx:430-545`, separacja dwóch zgód |
| Mobile lint 22 błędów (nie w CI) | ✅ NAPRAWIONE — lint w CI, 0 błędów |
| AES-256-GCM helper bez użycia | ✅ NAPRAWIONE — home base encrypt/decrypt |
| Brak retencji GPS i purge | ✅ NAPRAWIONE — `services/retention.ts`, `retention.yml` |
| SECRET_DROP nie znika po wygaśnięciu | ✅ NAPRAWIONE — `hiddenLayer.ts` + sprint3 gate |
| CIRCLE_ONLY ujawnia tytuł/pozycję | ✅ NAPRAWIONE — sprint3 gate pre-commit check |
| Push receipts bez obsługi | ✅ NAPRAWIONE — `services/pushReceipts.ts` |

---

## 1.2 Znaleziska aktualne (stan 2026-09-19)

---

### BEZP-001
**Waga:** WYSOKA  
**Lokalizacja:** `apps/api/src/config/env.ts:6-9`  
**Dowód:**
```typescript
DATABASE_URL: z.string().trim().optional(),
JWT_ACCESS_SECRET: z.string().trim().optional(),
JWT_REFRESH_SECRET: z.string().trim().optional(),
SUPABASE_JWT_SECRET: z.string().trim().optional(),
```
**Wpływ:** Sekrety krytyczne są `.optional()` na poziomie Zod. Dopiero poniżej (funkcja `productionSecret`) są wymuszane w produkcji, ale ta logika jest rozproszona — każda nowa zmienna dodana bez `productionSecret()` przejdzie walidację bez błędu.  
**Naruszone założenie:** `docs/SECURITY.md` wymaga fail-fast przy braku sekretów.  
**Rekomendacja:** Zmienić na `.string().min(32)` z asercją inline zamiast optional+runtime check. Dodać test jednostkowy `env.test.ts` weryfikujący throw przy braku każdego sekretu produkcyjnego.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S

---

### BEZP-002
**Waga:** WYSOKA  
**Lokalizacja:** `apps/api/src/routes/spots.ts:107-110` + `apps/api/prisma/migrations/`  
**Dowód:**
```typescript
// Local/dev databases may not have PostGIS migrated yet. Keep the old path as
// a deterministic fallback so tests and non-geo deployments still function.
return findNearbySpotCandidatesFallback(app, input);
```
**Wpływ:** Fallback Haversine oblicza dystans w pamięci procesu po wyciągnięciu kandydatów bounding-boxem. Na dużym zbiorze danych: N+1 spotów ładowanych do RAM, O(n) sorting w JS, brak PostGIS index. **Ważniejsze:** jeśli `REDIS_URL` i PostGIS nie są skonfigurowane w produkcji, system po cichu spada do degraded mode bez żadnego alarmu/logu WARN.  
**Naruszone założenie:** `docs/ARCHITECTURE.md:ADR-005` — Haversine jako przejściowe rozwiązanie.  
**Rekomendacja:** Dodać `logger.warn('PostGIS unavailable, using Haversine fallback')` przy catch. Dodać check w production startup: jeśli `NODE_ENV=production` i PostGIS niedostępne — log ERROR (nie crash, ale wyraźny sygnał).  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S

---

### BEZP-003
**Waga:** WYSOKA  
**Lokalizacja:** `apps/api/src/plugins/socket.ts:48-54`  
**Dowód:**
```typescript
const pub = getRedisPub();
const sub = getRedisSub();
if (pub && sub) {
  io.adapter(createAdapter(pub, sub));
  logger.info('Socket.IO using Redis adapter');
} else {
  logger.info('Socket.IO using in-memory adapter (no REDIS_URL)');
}
```
**Wpływ:** Bez `REDIS_URL` Socket.IO działa in-memory — przy 2+ instancjach API na Railway (auto-scale): prywatne wiadomości circle i presence trafiają tylko do instancji, która je wysłała. Nie jest to błąd bezpieczeństwa, ale może prowadzić do przekonania użytkownika, że message nie dotarł, gdy faktycznie jest na innej instancji.  
**Naruszone założenie:** `docs/ARCHITECTURE.md:ADR-006`, `docs/SECURITY.md:Live Travel Presence`.  
**Rekomendacja:** Wymusić `REDIS_URL` w produkcji przez `requiredInProduction()`. Dodać alert w Sentry gdy fallback aktywny + `NODE_ENV=production`.  
**Wymaga zgody Szymona:** TAK (zmiana env requirements)  
**Nakład:** S

---

### BEZP-004
**Waga:** WYSOKA  
**Lokalizacja:** `apps/mobile/app.json:33-34` (NIEZWERYFIKOWANE — brak bezpośredniego dostępu do aktualnej wartości)  
**Dowód:** `docs/PROJECT_AUDIT_2026-06-10.md:535` wskazuje: "Zrotować historyczny klucz Google Maps" jako NIEUKOŃCZONE operacyjnie. Commit `3680406` (fix(maps): switch Android to dedicated key) wskazuje na próbę rozwiązania, ale audyt nie może zweryfikować czy rotacja rzeczywiście nastąpiła.  
**Wpływ:** Jeśli stary klucz nadal aktywny — ryzyko nadużycia (billing na koncie Google) oraz możliwość skimmingu danych mapy.  
**Naruszone założenie:** `docs/SECURITY.md` — brak hardkodowanych kluczy.  
**Rekomendacja:** Zweryfikować w Google Console czy historyczny klucz z `app.json` sprzed `3680406` jest unieważniony. Dowód: `docs/GOOGLE_MAPS_KEY_ROTATION.md`.  
**Wymaga zgody Szymona:** TAK (operacyjne)  
**Nakład:** S

---

### BEZP-005
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/routes/journal.ts` (inline auth check)  
**Dowód:** Na podstawie S-15 (commit `0dc3875`) journal.ts zawiera inline moderator guard używający `verifySupabaseJwt`. Ta implementacja jest niespójna z resztą API, gdzie `requireModerator` jako preHandler jest standardem.  
**Wpływ:** Duplikacja logiki auth może prowadzić do rozbieżności przy przyszłych zmianach (np. zmiana definicji MODERATOR).  
**Naruszone założenie:** Spójność autoryzacji (ARCHITECTURE — ENGINE design).  
**Rekomendacja:** Wyekstrahować do `requireModerator` preHandler jak w pozostałych chronionych routach.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S

---

### BEZP-006
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/routes/auth.ts` — brak weryfikacji email + brak rate limiting na login  
**Dowód:** `docs/PROJECT_AUDIT_2026-06-10.md:179` — email verification: 10%. Plik `apps/web/app/verify-email/page.tsx` istnieje (UI), `apps/web/app/reset-password/page.tsx` istnieje (UI), ale weryfikacja czy endpoint API faktycznie wysyła email i weryfikuje token wymaga dalszego sprawdzenia.  
**Wpływ:** Konta niezweryfikowane mogą uczestniczyć w Hidden Layer, invite flows i moderacji.  
**Naruszone założenie:** `docs/SECURITY.md` — enumeracja kont, brute-force protection.  
**Rekomendacja:** Zweryfikować czy `AuthToken` model i `email.ts` obsługują pełny flow weryfikacji i resetu. Dodać rate limit 5/15min na POST /api/auth/login (jeśli brak).  
**Wymaga zgody Szymona:** NIE  
**Nakład:** M

---

### BEZP-007
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/routes/spots.ts` — `ALLOWED_MIME_TYPES` po S-15  
**Dowód (wniosek):** S-15 naprawił HEIC/HEIF mismatch. Obecny stan: `['image/jpeg', 'image/png', 'image/webp']`, limit 8MB. Jednak photo upload używa `R2` — jeśli `R2_SECRET_ACCESS_KEY` nie jest ustawiony, upload zwraca `503`. Brakuje weryfikacji czy walidacja MIME działa **przed** sprawdzeniem storage (tj. nie ma path, gdzie plik wchodzi do storage bez walidacji).  
**Wpływ:** Content injection, storage abuse.  
**Rekomendacja:** Potwierdzić kolejność: walidacja rozmiar+MIME → storage upload. Dodać test integracyjny.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S

---

### BEZP-008
**Waga:** NISKA  
**Lokalizacja:** `apps/api/src/lib/redis.ts:8-13`  
**Dowód:**
```typescript
const client = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
});
```
**Wpływ:** `lazyConnect: true` oznacza, że błąd połączenia Redis jest cichy do pierwszego użycia. Jeśli Redis jest wymagany w produkcji (rate limiting, sessions), a połączenie się nie uda — pierwsze requestu dostają błąd, nie fail-fast przy starcie.  
**Rekomendacja:** Przy starcie serwera (`server.ts`) — jeśli `REDIS_URL` ustawiony, spróbuj `redis.ping()` i zaloguj wynik.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S

---

## 1.3 Mocne strony (nie ruszać)

- **Argon2id** z poprawnymi parametrami (`memoryCost:19456`, `timeCost:2`) — `lib/crypto.ts`
- **JWT rotation** z hashem refresh tokena w DB i revocation — `routes/auth.ts:120-161`
- **SecureStore** dla tokenów mobilnych — `src/lib/secureStorage.ts`
- **Pino redaction** koordynat, email, phone, authorization header — `lib/logger.ts`
- **Hidden Layer server-side** — `services/hiddenLayer.ts`, żadna dokładna koordynata nie trafia do klienta bez uprawnień
- **PostGIS ST_DWithin** z fallbackiem — `routes/spots.ts:88-95`
- **CORS strict whitelist** — `plugins/security.ts`
- **Rate limiting** na kluczowych endpointach (auth/invite, rodo, transmissions, forum) — S-15
- **Geo fuzzing** Mulberry32 PRNG z per-session seed — `packages/geo/src/fuzz.ts`
- **Consent checkboxy** w `join.tsx` — oddzielne dla regulaminu i prywatności, domyślnie false
- **Presence throttle** 30s per-socket — `plugins/socket.ts` S-15
- **Circle membership check** na socket join — `plugins/socket.ts:26-36`
- **Invite code validation** z purpose+circleId+expiry+maxUses — `services/inviteCodes.ts`
- **AES-256-GCM home base** encrypt/decrypt — po S2/sprint3 gate
- **RODO export v2** z faktycznymi danymi GPS i home base — `routes/explorers.ts`
- **Retention job** (GPS 90d, purge 30d) — `services/retention.ts`, `retention.yml`

---

## 1.4 RODO — stan

| Wymaganie | Status | Dowód |
|---|---|---|
| Explicit consent (terms+privacy) | ✅ | `join.tsx:220-254` |
| Geo consent oddzielny | ✅ | `index.tsx:430-545` |
| Right to erasure | ✅ | `routes/explorers.ts:71-123` |
| Data portability (full JSON) | 🟡 | `routes/explorers.ts:126-202` — v2 po S2 |
| GPS retention 90d | ✅ | `services/retention.ts`, `Journey.routeExpiresAt` |
| Purge 30d po soft-delete | ✅ | `retention.ts`, `Explorer.purgeAt` |
| Audit log dostępu | ✅ | `middleware/auditLog.ts`, `AuditLog` model |
| RODO request web | ✅ | `routes/rodo.ts`, `app/rodo/` |
| Email verification flow | 🟡 | UI istnieje (`verify-email/page.tsx`) — weryfikacja implementacji API NIEZWERYFIKOWANA |
| Analityka privacy-first | 🟡 | `AnalyticsEvent` model + `routes/analytics.ts` — zakres danych NIEZWERYFIKOWANY |
