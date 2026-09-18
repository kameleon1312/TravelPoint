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

### ADR-004: Maps — Google Maps (mobile) + Mapbox (web) [DIVERGENCE DOCUMENTED]
- **Mobile (CORE):** `react-native-maps` — `PROVIDER_GOOGLE` on Android/iOS with `TERRA_MARE_STYLE` JSON overlay. Requires `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` and the key injected into `AndroidManifest.xml` at EAS build time. Without the key, the map tab renders a dark placeholder (geo functionality preserved).
- **Web (WORLD):** Mapbox GL JS (`mapbox-gl` package). Original ADR-004 specified Google Maps JS API for web, but the implementation uses Mapbox with a custom Terra Mare style. This divergence was introduced intentionally for the web map's advanced style control and terrain layer support. Key: `NEXT_PUBLIC_MAPBOX_TOKEN` (URL-restricted in Mapbox console).
- **Known divergence:** The two layers use different map providers. Unifying them under a single SDK (Mapbox Native or Google Maps) is tracked for Q1 2028 when mobile Mapbox Native becomes cost-effective.
- **Why not change web back to Google Maps:** Mapbox GL JS provides better style customisation for the Terra Mare dark nautical theme (custom terrain, water layers) that Google Maps styledMapType cannot fully replicate at equivalent quality.

### ADR-005: Haversine for geo queries (not PostGIS)
Rationale: Radius proximity queries use Haversine formula computed in Prisma raw queries, not PostGIS `ST_DWithin`. This avoids requiring the PostGIS extension on the Railway PostgreSQL instance (which requires manual activation and is not guaranteed on all plans). H3 index is pre-computed and stored in the `h3Index` column for fast hex-cell filtering. Revisit with PostGIS if query performance degrades beyond 10k spots.

### ADR-006: Socket.io for realtime
Rationale: Presence, signals, circle chat. WebSocket with fallback.
