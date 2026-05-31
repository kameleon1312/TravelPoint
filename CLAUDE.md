# TravelPoint — Agent Rules

You are working on TravelPoint — a cult network for travelers obsessed with discovery.
Two structures: WORLD (public web) + CORE (private mobile app). NOT a trip-planner.

## ALWAYS read first
- docs/ARCHITECTURE.md, docs/SECURITY.md, docs/DESIGN_SYSTEM.md, docs/HIDDEN_LAYER.md

## Project structure
- Monorepo, pnpm workspaces
- apps/mobile — Expo/RN — CORE (private epicenter, PRIMARY 60%)
- apps/web — Next.js 14 — WORLD (public magazine/forum/map/landing, 35%)
- apps/api — Fastify + Prisma + PostgreSQL/PostGIS — ENGINE (5%)
- packages/theme — cinematic design tokens (single source of truth)
- packages/types, packages/validation, packages/geo, packages/utils, packages/api-client

## Critical rules
1. GEO-PRIVACY FIRST: location off by default, opt-in, public coords fuzzed ≥500m,
   exact coords of locked spots NEVER sent to unentitled clients, geo NEVER logged.
2. HIDDEN LAYER access control is SERVER-SIDE ONLY (services/hiddenLayer.ts).
3. SECURITY: Argon2id, JWT 15min/7d, expo-secure-store, RODO compliant.
4. NO hardcoded colors/fonts/motion — import from @travelpoint/theme.
5. NO `any`. Mobile-first 393px. 60fps animations on UI thread.
6. Brand language: explorer/signal/journey/circle/expedition — NEVER user/notification/trip.
7. Map style = cosmic dark Mapbox. Never default Google Maps look.
8. Comments EN, UI strings PL via strings.pl.ts.
9. Validate frontend AND backend with same Zod schema from packages/validation.

## Vibe check (the most important rule)
Before finishing any UI: "Does an obsessed explorer feel they're entering a secret
network, not opening a planning app?" If not — redo it.

## When in doubt — ask before:
- adding dependencies, changing folder structure, changing theme tokens,
  touching hidden-layer access logic.
