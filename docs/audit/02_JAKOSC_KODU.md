# FAZA 2 — Audyt jakości kodu i architektury
**Data:** 2026-09-19  
**Zakres:** apps/api, apps/web, apps/mobile, packages/*

---

## 2.0 Weryfikacja końcowa
- [x] Brak wartości sekretów
- [x] Brak zmian w kodzie — tylko `docs/audit/`

---

## 2.1 Znaleziska

---

### KOD-001
**Waga:** WYSOKA  
**Lokalizacja:** `apps/api/src/routes/*.ts` — 8 miejsc  
**Dowód:**
```typescript
// auth.ts:164
const body = req.body as { recipientEmail?: unknown };
// circles.ts:96-97
const inviteCode = typeof (req.body as { inviteCode?: unknown } | null)?.inviteCode === 'string'
// forum.ts:182, moderation.ts:184, spots.ts:705, circles.ts:237 ...
```
**Wpływ:** Ręczne casty `req.body as {...}` z inline runtime checks zamiast Zod schema — niespójny kontrakt wejściowy. Brak kompilacji chroniącej przed literówkami w nazwach pól. Przy rozbudowie trasy łatwo o pominięcie walidacji.  
**Naruszone założenie:** `CLAUDE.md` — "Validate frontend AND backend with same Zod schema from packages/validation".  
**Rekomendacja:** Wyekstrahować każdy inline body-cast do named Zod schema w `packages/validation/`. Fastify 5 + Zod typeguard daje pełny type-safety bez castów.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** M

---

### KOD-002
**Waga:** WYSOKA  
**Lokalizacja:** `apps/api/src/routes/*.ts` — brak warstwy serwisowej dla wielu tras  
**Dowód:** `routes/feed.ts`, `routes/explorers.ts`, `routes/journal.ts` — logika domenowa (aggregacja, uprawnienia, transformacje) bezpośrednio w handlerze trasy.  
**Wpływ:** Duże trasy (explorers.ts ~400+ linii, feed.ts) są trudne do testowania jednostkowego — nie ma czystych funkcji serwisowych oddzielonych od Fastify. Testy muszą mockować pełny `FastifyInstance`.  
**Rekomendacja:** Wyekstrahować logikę do `services/feed.ts`, `services/explorers.ts` itp. Router powinien robić tylko: parsuj żądanie → wywołaj serwis → odpowiedz.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** L

---

### KOD-003
**Waga:** WYSOKA  
**Lokalizacja:** `apps/api/src/` — brak testów dla: billing, forum, feed, journal, moderation, analytics  
**Dowód:** Pliki testowe: `socket.test.ts`, `circles.test.ts`, `explorers.test.ts`, `spots.test.ts`, `hiddenLayer.test.ts`, `inviteCodes.test.ts`, `blockAccess.test.ts`, `circleAccess.test.ts`, `storage.test.ts`, `trustScore.test.ts` — 568 linii łącznie. Brakuje testów dla całych modułów billing/forum/feed/journal.  
**Wpływ:** Stripe webhook logic (`services/billing.ts` 273 linie) bez testów = ryzyko billing fraud przy edge cases (webhook replay, duplicate events).  
**Naruszone założenie:** `docs/PROJECT_AUDIT_2026-06-10.md:417` — "Brak testów" jako CRITICAL.  
**Rekomendacja:** Testy priority: 1) billing webhook idempotency, 2) forum autoryzacja (moderator delete), 3) feed aggregation correctness, 4) journal access control (DRAFT/ARCHIVED).  
**Wymaga zgody Szymona:** NIE  
**Nakład:** XL

---

### KOD-004
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/routes/` — brak `any` ale typy `unknown` z inline cast  
**Dowód:** Grep `any\b` w routes — 0 wyników w kodzie produkcyjnym (tylko w testach dla mock). Jednak `req.body as {...}` to efektywny `any` z dodatkowym krokiem.  
**Wpływ:** NISKA — Fastify wciąż serializuje response poprawnie, ale brak compile-time guarantee na body shape.  
**Rekomendacja:** Jak KOD-001 — Zod schema.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** M (kombinować z KOD-001)

---

### KOD-005
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/services/billing.ts:1` (imports) + `apps/api/src/routes/billing.ts`  
**Dowód (wniosek):** `billing.ts` 273 linie — brak pliku testowego. `isBillingConfigured()` używane jako guard — poprawny wzorzec, ale brak testów scenariuszy webhook (duplicate event, wrong signature, network error między Stripe a DB).  
**Wpływ:** Stripe jest jedynym źródłem przychodu. Błąd w webhook handlerie może prowadzić do: podwójnego provisioning tieru, nieprawidłowego anulowania, utraty subskrypcji.  
**Rekomendacja:** Testy: `billing.test.ts` z mockiem Stripe — minimum 5 przypadków: checkout.session.completed, subscription.updated, subscription.deleted, duplicate event (idempotency), invalid signature.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** M

---

### KOD-006
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/mobile/src/constants/mapStyle.ts:2-12`  
**Dowód:**
```typescript
{ elementType: 'geometry', stylers: [{ color: '#0C1014' }] },
{ elementType: 'labels.text.fill', stylers: [{ color: '#8A827A' }] },
// ... 9 hardkodowanych wartości hex
```
**Wpływ:** Jedyne miejsce z hardkodowanymi kolorami — akceptowalne dla map style JSON (Google Maps API wymaga ciągów hex, nie może importować tokenów). **Wymaga ręcznej synchronizacji** przy zmianie palety.  
**Naruszone założenie:** `CLAUDE.md:rule 4` — "NO hardcoded colors/fonts/motion".  
**Rekomendacja:** Dodać komentarz dokumentujący, że te wartości to `Colors.abyss`, `Colors.starFaint` etc., i wymagać ręcznej synchronizacji przy zmianie palety. Możliwe: skrypt generujący `mapStyle.ts` z tokenów.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S

---

### KOD-007
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/routes/spots.ts:107-110` — catch bez logu  
**Dowód:**
```typescript
} catch {
  return findNearbySpotCandidatesFallback(app, input);
}
```
**Wpływ:** Cichy fallback — deweloper i monitoring nie wiedzą, że PostGIS nie działa. Wersja produkcyjna może przez tygodnie używać Haversine bez alarmu.  
**Rekomendacja:** `logger.warn(err, 'PostGIS unavailable, falling back to Haversine')` w catch.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S (XS)

---

### KOD-008
**Waga:** NISKA  
**Lokalizacja:** `apps/api/src/routes/auth.ts:73`  
**Dowód:**
```typescript
return reply.status(409).send({ code: 'EMAIL_TAKEN', message: 'Email już zarejestrowany' });
```
**Wpływ:** Polskie stringi w API response — naruszenie zasady "Comments EN" i potencjalnie błędny kontrakt z klientem. Klient powinien używać własnej i18n na podstawie `code`, nie `message`.  
**Naruszone założenie:** `CLAUDE.md:rule 8` — "Comments EN".  
**Rekomendacja:** Zmienić `message` na angielski lub usunąć — wystarczy `code`.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** S (XS)

---

### KOD-009
**Waga:** NISKA  
**Lokalizacja:** `apps/api/src/` — brak web E2E  
**Dowód:** Brak pliku Playwright/Cypress w `apps/web/`. CI nie zawiera E2E job.  
**Wpływ:** Kluczowe przepływy WORLD (landing → invite request, forum, journal) bez automatycznego testu regresji.  
**Naruszone założenie:** `docs/PROJECT_AUDIT_2026-06-10.md` Sprint 4 DoD.  
**Rekomendacja:** Playwright E2E dla: 1) landing page ładuje, 2) invite request form submit, 3) journal article wyświetla się, 4) map ładuje.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** L

---

### ARCH-001
**Waga:** WYSOKA  
**Lokalizacja:** `apps/web/app/admin/` — admin panel bez właściwej ochrony  
**Dowód:** `apps/web/middleware.ts` istnieje i chroni `/admin/:path*` przez cookie `tp_access_token` + fetch do API. **ALE:** cookie jest sesyjny (max-age=86400), a web nie ma persystentnego auth state — po refresh strony cookie może wygasnąć przed zakończeniem sesji adminowej. Poza tym admin pages (`analytics`, `journal`) — zakres funkcji NIEZWERYFIKOWANY.  
**Wpływ:** Admin z ograniczonym dostępem do produkcyjnych danych. Przy braku persystentnego auth webowego mogą wystąpić broken redirects.  
**Rekomendacja:** Zweryfikować pełny flow admin login → cookie → middleware → page. Dodać graceful redirect z komunikatem po wygaśnięciu cookie.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** M

---

### ARCH-002
**Waga:** ŚREDNIA  
**Lokalizacja:** `packages/api-client/` — niekompletny klient  
**Dowód (wniosek):** Z poprzedniego audytu: api-client obejmuje tylko auth i spots. Mobile tworzy własny klient ad-hoc. Duplikacja kontraktów.  
**Wpływ:** Zmiana signature API → 2 miejsca do aktualizacji.  
**Rekomendacja:** Po stabilizacji API: rozszerzyć api-client o circles, journal, forum, billing. Mobile powinien używać tylko api-client.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** XL

---

### PERF-001
**Waga:** ŚREDNIA  
**Lokalizacja:** `apps/api/src/routes/feed.ts:12+`  
**Dowód:**
```typescript
const memberships = await app.prisma.circleMember.findMany({...})
// następnie N queries dla każdego circle
```
**Wpływ:** Feed endpoint może generować N+1 queries dla każdego circla użytkownika.  
**Rekomendacja:** Użyć Prisma include/nested z LIMIT. Dodać Sentry performance tracing dla tego endpointu.  
**Wymaga zgody Szymona:** NIE  
**Nakład:** M

---

## 2.2 Mocne strony (nie ruszać)

- **Podział services/routes** dla billing, hiddenLayer, inviteCodes, trustScore, storage, push, retention — wzorzec do rozszerzenia na pozostałe moduły
- **Zod validation** dla kluczowych operacji domenowych (CreateSpotSchema, SpotQuerySchema, UpdateSpotSchema z `@travelpoint/validation`)
- **Shared packages** — theme, types, validation, geo, utils są używane przez wszystkie aplikacje
- **Prisma explicit selects** w wielu trasach — zapobiega over-fetching
- **AuditLog** na wrażliwych operacjach
- **Conventional Commits** w całej historii git
- **Hardcoded colors w mobile: tylko 2 instancje** (mapStyle.ts — akceptowalne)
- **Mobile lint: 0 błędów** (był 22 w czerwcu 2026)
- **PostGIS z fallbackiem** — graceful degradation zamiast hard fail
- **`as unknown as`** tylko w plikach testowych dla mocków — czyste w kodzie produkcyjnym

---

## 2.3 Design System — zgodność

| Obszar | Status |
|---|---|
| Tokeny theme w mobile | 🟢 Prawie pełna — 2 wyjątki (mapStyle.ts) |
| Tokeny theme w web (Tailwind) | 🟢 Colors spread przez tailwind.config.ts |
| Hardkodowane kolory poza tokenami | 🟡 2 pliki (mapStyle.ts — uzasadnione) |
| Touch targets ≥44pt | NIEZWERYFIKOWANE |
| `prefers-reduced-motion` | NIEZWERYFIKOWANE |
| Loading/empty/error states | 🟡 Częściowo — niektóre ekrany bez error state |
| Animacje na UI thread | 🟢 Reanimated worklets w mobile |
