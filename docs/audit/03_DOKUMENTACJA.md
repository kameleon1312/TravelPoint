# FAZA 3 — Inwentaryzacja i konsolidacja dokumentacji
**Data:** 2026-09-19

---

## 3.1 Spis wszystkich dokumentów

| Plik | Ost. zmiana (git) | Status | Zakres |
|---|---|---|---|
| `CLAUDE.md` | Sprint 16 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Operacyjne zasady dla agenta. Paleta Terra Mare w CLAUDE.md rozbieżna z `docs/DESIGN_SYSTEM.md` (patrz §3.3). |
| `docs/ARCHITECTURE.md` | Sprint 3 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | ADR-005 mówi "Haversine, no PostGIS" — ale PostGIS jest teraz zaimplementowany. ADR-004 mówi "web = Google Maps" — ale web używa Mapbox. |
| `docs/SECURITY.md` | Sprint 1 | ✅ AKTUALNY | Threat model, auth, geo privacy, RODO. Zgodny z implementacją po S1-S2. |
| `docs/HIDDEN_LAYER.md` | Sprint 2 | ✅ AKTUALNY | Access levels, trust scores, invite system, secret drops. |
| `docs/DESIGN_SYSTEM.md` | Sprint 1 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Paleta kolorów ("void #070A0C") rozbieżna z CLAUDE.md ("void #0F0B09" — przywrócony po revert S-16). Gradients lista niekompletna. |
| `docs/SPRINT_6_PLAN.md` | Sprint 6 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Plan Sprintu 6 — część zadań zrealizowana (plans.tsx, saved.tsx), część w toku lub nierozpoczęta (feed, komentarze, push NEARBY_SPOT). |
| `docs/PROJECT_AUDIT_2026-06-10.md` | 10 czerwca 2026 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Wartościowy baseline, wiele znalezisk naprawionych w S1-S15. Stoi jako historyczny dokument. |
| `docs/DEPLOYMENT.md` | Sprint 4 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Procedury wdrożenia. Wymaga aktualizacji: Next.js 14→15, Expo 53→54, Railway env vars. |
| `docs/RUNBOOKS.md` | Sprint 4 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Runbooki operacyjne — nie były aktualizowane od S4. |
| `docs/BACKUP_RESTORE_DRILL.md` | Sprint 4 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Procedura DR. NIEZWERYFIKOWANE czy ćwiczenie zostało wykonane. |
| `docs/GOOGLE_MAPS_KEY_ROTATION.md` | Sprint 1 gate | ✅ AKTUALNY | Procedura rotacji klucza — operacyjnie NIEUKOŃCZONA (patrz BEZP-004). |
| `docs/PRE_SPRINT_3_GATE.md` | Sprint 3 gate | ✅ AKTUALNY | Checklist bramki przed Sprint 3. Historycznie wartościowy. |
| `docs/SPRINT_4_PRODUCTION_HARDENING.md` | Sprint 4 | 🟡 CZĘŚCIOWO PRZESTARZAŁY | Plan Sprint 4 — status realizacji NIEZWERYFIKOWANY. |
| `apps/api/prisma/migrations/README.md` | Sprint 1 | 🟡 PRZESTARZAŁY | Opisuje ręczny proces SQL z WSL — projekt używa `prisma migrate` + Railway. |
| `apps/mobile/assets/fonts/README.md` | init | ✅ AKTUALNY | Prosty README fontów. |

**Dokumenty wymienione w masterprompcie ale NIEISTNIEJĄCE:**
- `TRAVELPOINT_INSTRUKCJA_AGENTA_VSC.md` — **BRAK w repo**
- `docs/TRAVELPOINT_REBUILD.md` — **BRAK w repo**

---

## 3.2 Macierz sprzeczności

### SPRZECZNOŚĆ A — Paleta kolorów (KRYTYCZNA dla agenta)

| Dokument | Wartość | Stan |
|---|---|---|
| `CLAUDE.md` (sekcja "Color tokens") | `void #0F0B09`, `abyss #141009` | Aktualny w kodzie? **NIE** — po revert S-16, `colors.ts` ma `void #070A0C`, `abyss #0C1014` |
| `docs/DESIGN_SYSTEM.md` | `void #070A0C`, `abyss #0C1014` | Zgodny z `packages/theme/src/colors.ts:2-7` |
| `packages/theme/src/colors.ts` | `void #070A0C`, `abyss #0C1014` | **ŹRÓDŁO PRAWDY** |

**Wniosek:** `CLAUDE.md` zawiera wartości z nieudanej/cofniętej S-16 (warmer stone direction). Po `git reset --hard 0dc3875` kod wrócił do zimnej palety Terra Mare, ale CLAUDE.md nie. **Wymaga zgody Szymona** na kierunek palety przed aktualizacją dokumentu.

---

### SPRZECZNOŚĆ B — PostGIS / ADR-005

| Dokument | Twierdzenie |
|---|---|
| `docs/ARCHITECTURE.md:69` | "Haversine formula... avoids requiring the PostGIS extension" |
| `apps/api/src/routes/spots.ts:88-95` | Używa `ST_DWithin`, `geography(Point,4326)` |
| `apps/api/prisma/schema.prisma` | `location Unsupported("geography(Point, 4326)")` |

**Wniosek:** PostGIS jest teraz zaimplementowany (Sprint 3). ADR-005 w ARCHITECTURE.md jest przestarzałe. Należy zaktualizować ADR-005: "PostGIS implemented in Sprint 3 with Haversine fallback for dev/non-PostGIS deployments".

---

### SPRZECZNOŚĆ C — Web maps ADR-004

| Dokument | Twierdzenie |
|---|---|
| `docs/ARCHITECTURE.md:63-64` | "ADR-004: divergence documented — web uses Mapbox" |
| `apps/web/app/map/MapClient.tsx` | NIEZWERYFIKOWANE — git wskazuje `150cba4` "replace Mapbox GL with Google Maps" |
| `apps/web/next.config.js:22` | `NEXT_PUBLIC_MAPBOX_TOKEN` w sekretach CI |

**Wniosek (do weryfikacji):** Commit `150cba4` zamienił Mapbox na Google Maps na webie, ale `NEXT_PUBLIC_MAPBOX_TOKEN` nadal w CI secrets. ADR-004 mówi o Mapbox. **NIEZWERYFIKOWANE** — wymaga sprawdzenia aktualnego `MapClient.tsx`. Szymon powinien potwierdzić aktualną decyzję.

---

### SPRZECZNOŚĆ D — Trust score thresholds

| Dokument | Thresholds |
|---|---|
| `docs/HIDDEN_LAYER.md` | NEWCOMER=0, EXPLORER=50, TRUSTED=150, INSIDER=400, LEGEND=1000 |
| `docs/SPRINT_6_PLAN.md` | NEWCOMER→EXPLORER=50, EXPLORER→TRUSTED=200, TRUSTED→INSIDER=500, INSIDER→LEGEND=1000 |
| `apps/api/src/services/trustScore.ts` | NIEZWERYFIKOWANE |

**Wniosek:** Dwa dokumenty mają inne progi. **Wymaga zgody Szymona** — który zestaw jest kanoniczny?

---

## 3.3 Docelowa architektura dokumentacji (propozycja)

```
travelpoint/
├── CLAUDE.md                      ← zwięzły (≤200 linii), tylko co agent musi wiedzieć ZAWSZE
│                                    Aktualizować po każdym sprincie przez agenta
├── docs/
│   ├── TRAVELPOINT_SPEC.md        ← NOWY: master spec (jedna wersja prawdy)
│   │                                Zastępuje: fragmenty ARCHITECTURE, DESIGN_SYSTEM, HIDDEN_LAYER, SECURITY
│   │                                Wersja: v1.0.0, data, changelog
│   ├── PLAN_DZIALANIA.md          ← NOWY: jedyny backlog (zastępuje SPRINT_*.md)
│   ├── ARCHITECTURE.md            ← zachować, zaktualizować ADR-005, ADR-004
│   ├── SECURITY.md                ← zachować aktualny
│   ├── HIDDEN_LAYER.md            ← zachować aktualny, poprawić thresholds
│   ├── DESIGN_SYSTEM.md           ← zaktualizować paletę po decyzji Szymona
│   ├── DEPLOYMENT.md              ← zaktualizować wersje i env vars
│   ├── RUNBOOKS.md                ← zaktualizować po S15
│   ├── decisions/                 ← NOWY katalog ADR
│   │   ├── ADR-001-pnpm.md
│   │   ├── ADR-002-fastify.md
│   │   ├── ADR-003-expo.md
│   │   ├── ADR-004-maps.md        ← wymaga aktualizacji po decyzji o web map
│   │   └── ADR-005-postgis.md     ← wymaga aktualizacji
│   └── _archive/
│       ├── 2026-09-19/
│       │   ├── PROJECT_AUDIT_2026-06-10.md   ← cenny, przenieść do archive
│       │   ├── PRE_SPRINT_3_GATE.md          ← historyczny
│       │   ├── SPRINT_4_PRODUCTION_HARDENING.md
│       │   ├── SPRINT_6_PLAN.md              ← zastąpiony przez PLAN_DZIALANIA.md
│       │   └── BACKUP_RESTORE_DRILL.md
│       └── migrations_README_2026-06.md
```

---

## 3.4 Reguła utrzymania (dla agenta)

Po każdym zamkniętym zadaniu/sprincie agent MUSI:
1. Zaktualizować `docs/PLAN_DZIALANIA.md` — status zadania, data ukończenia
2. Jeśli zmieniona architektura/decyzja: zaktualizować odpowiedni ADR w `docs/decisions/`
3. Jeśli zmieniony schemat DB: zaktualizować sekcję schematu w `TRAVELPOINT_SPEC.md`
4. Jeśli zmieniła się paleta/tokeny: zaktualizować `CLAUDE.md` + `docs/DESIGN_SYSTEM.md` jednocześnie (synchronizacja)
5. Commitować zmiany w `docs/` osobnym commitem: `docs(spec): update ADR-005 — PostGIS active`

---

## 3.5 Pytania otwarte wynikające z dokumentacji

1. **Paleta kolorów**: Jakie są docelowe wartości void/abyss/graphite? (patrz Sprzeczność A)
2. **Web maps**: Google Maps czy Mapbox na webie? Wyjaśnić commit `150cba4` vs NEXT_PUBLIC_MAPBOX_TOKEN w CI.
3. **Trust score thresholds**: Który zestaw kanoniczny — HIDDEN_LAYER.md (TRUSTED=150) czy SPRINT_6_PLAN.md (TRUSTED=200)?
4. **TRAVELPOINT_INSTRUKCJA_AGENTA_VSC.md**: Dokument wymieniony w masterprompcie nie istnieje — czy planowany do stworzenia?
