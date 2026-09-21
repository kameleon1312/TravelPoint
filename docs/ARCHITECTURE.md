# TravelPoint — Architecture

## Two Worlds

TravelPoint consists of two deliberately separated worlds:

| Layer | App | Role | Priority |
|---|---|---|---|
| **WORLD** | `apps/web` (Next.js 14) | Public magazine, forum, SEO, growth funnel | 35% |
| **CORE** | `apps/mobile` (Expo/RN) | Private explorer network, maps, circles, hidden layer | 60% |
| **ENGINE** | `apps/api` (Fastify) | Auth, geo, realtime, hidden layer logic | 5% (high weight) |

### Why separated?
- WORLD: public, indexable, viral, open — it's the funnel
- CORE: private, exclusive, "secret network" — it's retention + emotions
- Some WORLD content is locked → forces conversion to CORE

## Monorepo Structure

```
travelpoint/
├── apps/mobile        # CORE (Expo + React Native)
├── apps/web           # WORLD (Next.js 14 App Router)
├── apps/api           # ENGINE (Fastify + Prisma + PostGIS)
├── packages/
│   ├── theme          # Design tokens — single source of truth
│   ├── types          # Shared TS types
│   ├── validation     # Zod schemas (shared frontend + backend)
│   ├── geo            # Geo privacy helpers
│   ├── utils          # Encryption, date, format
│   └── api-client     # Typed SDK
└── tools/             # ESLint configs, tsconfig presets
```

## Data Flow

```
[Mobile CORE] ──────────────────────► [ENGINE API]
  React Query                           Fastify
  expo-secure-store (tokens)            Prisma → PostgreSQL/PostGIS
  Socket.io client (presence)           Redis (sessions/presence)
  Zustand (local state)                 Socket.io (realtime)

[Web WORLD] ─────────────────────────► [ENGINE API]
  Next.js RSC + App Router              Same API
  TanStack Query (client)
  Google Maps JS API (public map, Terra Mare style)
```

## Key Technical Decisions

### ADR-001: pnpm Workspaces (not full Turborepo)
Rationale: 2 apps + 1 backend. Turbo adds overhead without enough benefit at MVP scale.
Revisit: Q4 2026 when team grows.

### ADR-002: Fastify over Express
Rationale: 2x faster, schema-first, native TypeScript support.

### ADR-003: Expo over bare React Native
Rationale: OTA updates, EAS Build, faster iteration. No native modules that require ejection at MVP.

### ADR-004: Maps — Google Maps (mobile + web)
- **Mobile (CORE):** `react-native-maps` — `PROVIDER_GOOGLE` on Android/iOS with `TERRA_MARE_STYLE` JSON overlay. Requires `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` and the key injected into `AndroidManifest.xml` at EAS build time. Without the key, the map tab renders a dark placeholder (geo functionality preserved).
- **Web (WORLD):** Google Maps JS API (`@types/google.maps`) with custom `TERRA_MARE_STYLE: google.maps.MapTypeStyle[]` overlay. Switched from Mapbox GL JS (original choice) after a WebGL context conflict with Three.js caused map canvas corruption on some devices. Key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (HTTP referrer-restricted in Google Cloud Console).
- Both layers share the same `TERRA_MARE_STYLE` JSON definition — dark nautical/terrain look consistent across platforms.

### ADR-005: PostGIS for geo queries (upgraded from Haversine in Sprint 3)
Rationale: Radius proximity queries use `ST_DWithin` with `geography(Point, 4326)` columns — active in production on Supabase PostgreSQL 17 (PostGIS pre-installed). H3 index is pre-computed and stored in `h3Index` for fast hex-cell pre-filtering before the PostGIS radius check. Haversine raw SQL remains available as a fallback for environments without PostGIS.
Original Sprint 1 decision (Haversine only) was revisited after query performance degraded beyond 5k spots — PostGIS `ST_DWithin` with a GiST index gives ~8× speedup at p95.

### ADR-006: Socket.io for realtime
Rationale: Presence, signals, circle chat. WebSocket with fallback.
