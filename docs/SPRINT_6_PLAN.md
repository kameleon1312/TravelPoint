# TravelPoint — Sprint 6 Plan

## Context: po Sprint 5

Sprint 5 dostarczył: reakcje na spoty, lajki journey, SpotPreviewSheet, weryfikację spotów.

**Kluczowa diagnoza po Sprint 5:**
Aplikacja nie ma powodu żeby wracać do niej codziennie, gdy użytkownik nie podróżuje.
Mapa, spoty, journey są reaktywne — działają TYLKO gdy aktywnie eksploruje.
Brakuje pętli dziennej retencji.

---

## Priorytet 1 — Retencja codzienna (Sprint 6)

### 1A. Home Feed — aktywność sieci
**Problem:** Po otwarciu apki jest tylko mapa. Pusta jeśli w domu.
**Rozwiązanie:** Nowy ekran (lub sekcja w tab home) pokazujący:
- Aktywność z circles do których należy explorer
- Nowe spoty od explorerów z kręgów
- Sygnały (ktoś zweryfikował twój spot, zareagował na journey)
- Format: FlatList z kartami aktywności, infinite scroll

**API:** GET /api/feed (nowy endpoint) — agreguje z: spots, journeys, reactions, verifications, circle activity
**Mobile:** nowy ekran FeedScreen lub modyfikacja tab index

---

### 1B. Push re-engagement — "Nowy spot w pobliżu"
**Problem:** Użytkownik nie wie że ktoś dropnął spot blisko niego.
**Rozwiązanie:** Trigger push po `POST /api/spots` — sprawdź explorerów w promieniu 5km którzy mają włączone powiadomienia i wyślij sygnał NEARBY_SPOT.
**API:** dodać do spots.ts po zapisie spotu — findMany explorerów z lastKnownLat/Lng w ST_DWithin(5km), wysłać Expo Push
**Ważne:** tylko do explorerów którzy opt-in do location (locationEnabled: true), geo NEVER logged

---

### 1C. Pasek postępu rangi
**Problem:** Explorer widzi rangę ale nie wie ile brakuje do następnej — brak motywacji.
**Rozwiązanie:** W ekranie Identity / profilu — pasek "do następnej rangi" z liczbą punktów / akcji.
**Progi rang (TrustScore):**
- NEWCOMER → EXPLORER: 50 pkt
- EXPLORER → TRUSTED: 200 pkt
- TRUSTED → INSIDER: 500 pkt
- INSIDER → LEGEND: 1000 pkt

---

### 1D. Komentarze pod spotem
**Problem:** Reakcje są jednostronne. Nie generują rozmowy ani powrotu.
**Rozwiązanie:**
- Nowa tabela `Comment` w Prisma: id, spotId, explorerId, body, createdAt
- API: GET/POST /api/spots/:id/comments
- Mobile: sekcja komentarzy w spot/[id].tsx pod reakjami
- Signal SPOT_COMMENT do właściciela spotu po dodaniu komentarza
- Max 500 znaków, moderacja przez trust rank (NEWCOMER: max 3 komentarze/dobę)

---

### 1E. Ephemeral drops — spoty znikające po 24h
**Problem:** Brak urgency, brak FOMO, użytkownik nie sprawdza codziennie.
**Rozwiązanie:** Pole `dropExpiresAt` już istnieje w modelu Spot.
- UI: toggle "Ephemeral drop (24h)" przy tworzeniu spotu
- Mapa: spoty ephemeral pokazane z licznikiem czasu (np. "Aktywny jeszcze 4h")
- Cron job (już istnieje retention.yml): DELETE spots WHERE dropExpiresAt < NOW() AND isEphemeral = true
- Opcjonalnie: push do zapisujących spot gdy zostaje <1h

---

## Priorytet 2 — Braki UX (można wpleść w Sprint 6 lub osobny)

### 2A. Ekran "Saved Worlds"
API GET /api/spots/saved istnieje. Hook useSaveSpot/useUnsaveSpot istnieją.
Brakuje: ekranu z listą zapisanych spotów.
- Nowy plik: apps/mobile/app/saved.tsx
- FlatList z kartami spotów, możliwość odsave
- Dostępny z Identity tab lub menu

### 2B. Avatar / zdjęcie profilu
- Dodać avatarUrl?: string do modelu Explorer w schema.prisma
- Presigned URL upload jak w photo/spot
- ImagePicker w ekranie Identity
- Wyświetlanie w: profilu, kartach w feed, circle czacie

### 2C. Filtr kategorii w Discover tab
- API obsługuje ?category=ABANDONED itp.
- UI: pozioma lista chipów nad listą spotów
- Brak stanu filtra = wszystkie kategorie

---

## Priorytet 3 — Infrastruktura monetyzacji

### 3A. Stripe live (konfiguracja, nie kod)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_EXPEDITION_PRICE_ID=price_...
```
Dodać do Railway Variables.

### 3B. Plans screen w mobile
- Ekran w Settings pokazujący FREE / PRO / EXPEDITION
- Co każdy tier odblokowuje (tabela)
- CTA "Upgrade" → Stripe Checkout
- Paywall modal przy próbie dostępu do gated feature przez FREE usera

### 3C. Annual pricing + trial
- W Stripe Dashboard: dodać annual price per produkt (–20%)
- Toggle miesięcznie/rocznie w Plans screen
- 7-dniowy trial: `trial_period_days: 7` w checkout session

---

## Kolejność implementacji Sprint 6

1. **Feed endpoint** (API) + **FeedScreen** (mobile) — fundament retencji
2. **Push re-engagement** NEARBY_SPOT — trigger w spots.ts
3. **Komentarze** — schema + API + UI
4. **Pasek postępu rangi** — tylko UI, dane już są
5. **Saved Worlds screen** — quick win, API gotowe
6. **Avatar upload** — profil kompletny
7. **Ephemeral drops UI** — toggle + licznik
8. **Stripe live** (konfiguracja)

---

## Definicja "Done" dla Sprint 6

- [ ] GET /api/feed zwraca zagregowaną aktywność
- [ ] FeedScreen ładuje feed bez crash
- [ ] Push NEARBY_SPOT wysyłany po dropnięciu spotu
- [ ] GET/POST /api/spots/:id/comments działa
- [ ] Komentarze widoczne w spot detail
- [ ] Pasek rangi widoczny w Identity tab
- [ ] Ekran Saved Worlds dostępny
- [ ] Avatar upload działa end-to-end
- [ ] Stripe live skonfigurowany (plan FREE i PRO checkout otwiera się)
