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
  Mapbox GL JS (public map)
```

## Key Technical Decisions

### ADR-001: pnpm Workspaces (not full Turborepo)
Rationale: 2 apps + 1 backend. Turbo adds overhead without enough benefit at MVP scale.
Revisit: Q4 2026 when team grows.

### ADR-002: Fastify over Express
Rationale: 2x faster, schema-first, native TypeScript support.

### ADR-003: Expo over bare React Native
Rationale: OTA updates, EAS Build, faster iteration. No native modules that require ejection at MVP.

### ADR-004: Maps — Mapbox (web) + react-native-maps (mobile)
- **Web (WORLD):** Mapbox GL JS — full custom Terra Mare dark style via JSON, Mapbox token required.
- **Mobile (CORE):** `react-native-maps` — `PROVIDER_GOOGLE` on Android with custom `TERRA_MARE_STYLE` JSON overlay. Requires `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` and the key injected into `AndroidManifest.xml` at EAS build time. Without the key the map tab renders a dark placeholder (geo functionality is preserved — only the visual map is hidden).
- Revisit: consider Mapbox Native SDK for mobile (Maps SDK for React Native) in Q1 2027 for visual consistency.

### ADR-005: PostGIS for geo queries
Rationale: ST_DWithin radius queries and H3 clustering are native to PostGIS.

### ADR-006: Socket.io for realtime
Rationale: Presence, signals, circle chat. WebSocket with fallback.
