# TravelPoint — Design System: Terra Mare

## Philosophy

Positioning: **"Secret network of travelers — feels like a map carved from living rock and ocean depths. Not a spacecraft. Not a travel app. A world that breathes."**

The explorer should feel: *"I'm looking at a map that only people who've actually been there can read."*

## Visual Direction

| Element | Terra Mare direction | Anti-pattern |
|---|---|---|
| Background | Ocean floor dark, wet stone, deep water | Bright whites, tourist blues |
| Accents | Seagrass glow, ocean teal, terracotta signal | Neon, corporate gradients |
| UI | Dark glass with warm organic tint | Cold steel glassmorphism |
| Maps | Dark nautical/terrain — stone land, ocean depth | Light Google Maps, cosmic purple |
| Typography | Clash Display + General Sans + Space Mono | Rounded friendly fonts |
| Motion | Tidal drift, organic float, signal pulse | Rigid transitions, no animations |
| Language | Explorer obsessed with raw places, freedom | Tourist, planner, customer |

## Color Tokens (`packages/theme/src/colors.ts`)

### Surfaces
- `void` `#070A0C` — ocean abyss (deepest background)
- `abyss` `#0C1014` — main background (deep water)
- `graphite` `#131A1F` — cards (wet dark rock)
- `graphiteSoft` `#1B2328` — hover / nested surface
- `steel` `#253035` — borders, dividers

### Ocean Blues
- `midnight` `#0F1E2A`
- `deepBlue` `#133040`
- `cosmicBlue` `#1A4055`

### Accents
- `aurora` `#5CB88C` — seagrass green (primary — discovery, CTA)
- `auroraDeep` `#3A8C6A` — darker seagrass
- `signal` `#1E9AB0` — deep teal ocean (links, navigation, presence)
- `signalGlow` `#3DBDD4` — brighter teal for glow effects
- `ember` `#C86840` — terracotta canyon (alerts, secret drops, urgency)
- `violet` `#7A6D9E` — dusk lavender (circles, trusted items)

### Terra Accents
- `sand` `#C8A456` — dry sand, golden hour (warnings)
- `moss` `#4A8A6A` — deep forest moss

### Text (warm cream — paper, not cold screen)
- `starlight` `#EDE8DF` — primary text
- `star` `#C4B9AC` — secondary text
- `starFaint` `#8A827A` — tertiary text
- `starGhost` `#5A5550` — placeholder / disabled

### Glass
- `glass` `rgba(237,232,223,0.05)` — warm glass tint
- `glassBorder` `rgba(237,232,223,0.10)` — warm glass border
- `glassStrong` `rgba(237,232,223,0.09)` — stronger glass

### Status
- `success` → alias `aurora` `#5CB88C`
- `warning` → alias `sand` `#C8A456`
- `danger` `#C85040` — danger red
- `info` → alias `signal` `#1E9AB0`

## Gradients (`packages/theme/src/gradients.ts`)

- `aurora` — `['#3A8C6A', '#5CB88C', '#1E9AB0']` — seagrass → ocean
- `cosmic` — `['#070A0C', '#0F1E2A', '#133040']` — ocean depth
- `signal` — `['#1E9AB0', '#5CB88C']` — ocean teal → seagrass
- `ember` — `['#C86840', '#7A6D9E']` — terracotta → dusk
- `sheen` — `['rgba(237,232,223,0.12)', 'rgba(237,232,223,0.00)']` — warm sheen

## Typography

| Font | Weight variants | Use |
|---|---|---|
| **Clash Display** | Regular / Medium / Semibold / Bold | Hero, brand, section headers |
| **General Sans** | Regular / Medium / Semibold / Bold | UI body, buttons, labels |
| **Space Mono** | Regular / Bold | Coordinates, data, signal codes |

### Font Sizes (`FontSize`)
`display: 64` / `hero: 44` / `h1: 32` / `h2: 24` / `h3: 20` / `body: 16` / `bodySm: 14` / `caption: 12` / `micro: 11`

## Motion Patterns (`packages/theme/src/animations.ts`)

| Pattern | Description |
|---|---|
| `signalPulse` | Seagrass ripple on water surface — expanding ring + opacity fade, loop 2.4s |
| `floatingLayers` | Tidal drift — organic vertical sway ±8px sine |
| `routeDraw` | River/path tracing across terrain — SVG stroke-dashoffset reveal |
| `starfieldDrift` | Particles slow drift — dust, spores, sea foam |
| `cinematicReveal` | opacity 0→1 + translateY 24→0 + blur 8→0 |
| `depthScroll` | Sections enter at different speeds (parallax depth) |

**Always respect `prefers-reduced-motion`** — pause or simplify all animations.

## Shadow & Glow (`packages/theme/src/spacing.ts`)

All glow colors match the current Terra Mare palette:
- `Shadow.auroraGlow` — `#5CB88C` seagrass
- `Shadow.signalGlow` — `#1E9AB0` ocean teal
- `Shadow.emberGlow` — `#C86840` terracotta

## Brand Language

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

## Component Principles

1. Import ALL tokens from `@travelpoint/theme` — zero hardcoded colors/fonts/motion
2. Mobile-first: 393px base
3. Touch targets ≥ 44pt (iOS) / 48dp (Android)
4. Animations on UI thread — Reanimated worklets on mobile, CSS transforms on web
5. Glass effects via `expo-blur` (mobile) / `backdrop-filter` (web) — use sparingly
6. Glow effects (`Shadow.auroraGlow` etc.) over drop shadows on dark backgrounds

## Vibe Check

Before finishing any UI: *"Does an obsessed explorer feel they're looking at a map carved from real places — raw, deep, alive — not opening a planning app?"*

If it looks like a tourism website or a corporate dashboard — redo it.
