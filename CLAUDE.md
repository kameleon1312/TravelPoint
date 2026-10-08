# TravelPoint — Agent Rules

You are working on TravelPoint — a cult network for travelers obsessed with discovery.
Two structures: WORLD (public web) + CORE (private mobile app). NOT a trip-planner.

## ALWAYS read first
- **docs/PROJECT_STATE_2026-10-08.md** — aktualny stan projektu, feature matrix, aktywne bugi, roadmapa (czytaj PIERWSZY)
- docs/ARCHITECTURE.md, docs/SECURITY.md, docs/DESIGN_SYSTEM.md, docs/HIDDEN_LAYER.md

## Project structure
- Monorepo, pnpm workspaces
- apps/mobile — Expo/RN — CORE (private epicenter, PRIMARY 60%)
- apps/web — Next.js 15 — WORLD (public magazine/forum/map/landing, 35%)
- apps/api — Fastify + Prisma + PostgreSQL/PostGIS — ENGINE (5%)
- packages/theme — design tokens (single source of truth)
- packages/types, packages/validation, packages/geo, packages/utils, packages/api-client

## Critical rules
1. GEO-PRIVACY FIRST: location off by default, opt-in, public coords fuzzed ≥500m,
   exact coords of locked spots NEVER sent to unentitled clients, geo NEVER logged.
2. HIDDEN LAYER access control is SERVER-SIDE ONLY (services/hiddenLayer.ts).
3. SECURITY: Argon2id, JWT 15min/7d, expo-secure-store, RODO compliant.
4. NO hardcoded colors/fonts/motion — import from @travelpoint/theme.
5. NO `any`. Mobile-first 393px. 60fps animations on UI thread.
6. Brand language: explorer/signal/journey/circle/expedition — NEVER user/notification/trip.
7. Map style = dark nautical/terrain (Terra Mare). Never default Google Maps look.
8. Comments EN, UI strings PL via strings.pl.ts.
9. Validate frontend AND backend with same Zod schema from packages/validation.

## Design System — Terra Mare

**Positioning:** "Secret network of travelers — feels like a map carved from living rock
and ocean depths. Not a spacecraft. Not a travel app. A world that breathes."

The explorer should feel: *"I'm looking at a map that only people who've actually been
there can read."*

### Visual direction

| Element | Terra Mare direction | Anti-pattern |
|---|---|---|
| Background | Ocean floor dark, wet stone, deep water | Bright whites, tourist blues |
| Accents | Seagrass glow, ocean teal, terracotta signal | Neon, corporate gradients |
| UI | Dark glass with warm organic tint | Cold steel glassmorphism |
| Maps | Dark nautical/terrain — stone land, ocean depth | Light Google Maps, cosmic purple |
| Typography | Clash Display + General Sans + Space Mono (unchanged) | Rounded friendly fonts |
| Motion | Tidal drift, organic float, signal pulse | Rigid transitions, no animations |
| Language | Explorer obsessed with raw places, freedom | Tourist, planner, customer |

### Color tokens (`packages/theme/src/colors.ts`)

#### Surfaces
- `void` `#070A0C` — ocean abyss
- `abyss` `#0C1014` — main background (deep water)
- `graphite` `#131A1F` — cards (wet dark rock)
- `graphiteSoft` `#1B2328` — hover / nested
- `steel` `#253035` — borders, dividers

#### Ocean blues
- `midnight` `#0F1E2A`
- `deepBlue` `#133040`
- `cosmicBlue` `#1A4055`

#### Accents
- `aurora` `#5CB88C` — seagrass green (primary — discovery, CTA)
- `auroraDeep` `#3A8C6A` — darker seagrass
- `signal` `#1E9AB0` — deep teal ocean (links, navigation, presence)
- `signalGlow` `#3DBDD4` — brighter teal for glow effects
- `ember` `#C86840` — terracotta canyon (alerts, secret drops, urgency)
- `violet` `#7A6D9E` — dusk lavender (circles, trusted items)

#### Terra accents
- `sand` `#C8A456` — dry sand, golden hour
- `moss` `#4A8A6A` — deep forest moss

#### Text (warm cream — paper, not cold screen)
- `starlight` `#EDE8DF` — primary text
- `star` `#C4B9AC` — secondary text
- `starFaint` `#8A827A` — tertiary text
- `starGhost` `#5A5550` — placeholder / disabled

#### Glass (warm organic tint — NOT cold steel)
- `glass` `rgba(237,232,223,0.05)` — subtle warm overlay
- `glassBorder` `rgba(237,232,223,0.10)` — glass border
- `glassStrong` `rgba(237,232,223,0.09)` — stronger glass

#### Status
- `success` `#5CB88C` — alias aurora
- `warning` `#C8A456` — alias sand
- `danger` `#C85040` — deep red-terracotta
- `info` `#1E9AB0` — alias signal

### Motion patterns (unchanged names, new descriptions)
- `signalPulse` — seagrass ripple on water surface
- `floatingLayers` — tidal drift, organic vertical sway
- `routeDraw` — river/path tracing across terrain
- `starfieldDrift` — particles slow drift (dust, spores, sea foam)
- `cinematicReveal` — opacity + translateY + blur (unchanged)

### Brand Language

| Generic (NEVER) | TravelPoint |
|---|---|
| user / użytkownik | explorer / podróżnik |
| profil | explorer identity |
| znajomi / followers | circle / signals |
| wiadomości | transmissions |
| zapisane miejsca | saved worlds |
| trasa / plan | journey / expedition |
| powiadomienie | signal |
| odznaka | explorer rank / aura |
| ukryte miejsce | hidden spot / secret drop |
| grupa | circle |
| rejestracja | request access / join the network |

## Vibe check (the most important rule)
Before finishing any UI: "Does an obsessed explorer feel they're looking at a map
carved from real places — raw, deep, alive — not opening a planning app?"
If it looks like a tourism website or a corporate dashboard — redo it.

## When in doubt — ask before:
- adding dependencies, changing folder structure, changing theme tokens,
  touching hidden-layer access logic.
