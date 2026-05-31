# TravelPoint — Design System: Cinematic Exploration

## Philosophy

Positioning: **"Secret network of travelers that looks like a spacecraft navigation system from Interstellar."**

The user should feel: *"I'm entering a secret network of explorers"* — NOT *"I'm opening a planning app"*.

## Visual Direction

| Element | Direction | Anti-pattern (what NOT to do) |
|---|---|---|
| Background | Deep cosmic, midnight blue, graphite, star dust | Orange palms, beach, sunshine |
| Accents | Aurora gradient, signal glow, starlight | Cheap tourist gradients |
| UI | Glassmorphism, silver lines, depth layers | Flat material, white cards |
| Maps | Dark cosmic-map with neon spots | Light Google Maps |
| Typography | Precise technical sans + expedition display | Comic, rounded "friendly" fonts |
| Motion | Floating layers, parallax globe, signal pulse | No animations / rigid transitions |
| Language | Explorers, signals, expeditions, hidden worlds | Users, customers, "plan your trip" |

## Color Tokens (`packages/theme/src/colors.ts`)

### Surfaces (dark → light)
- `void` `#05060A` — deepest background
- `abyss` `#0A0E18` — main screen background
- `graphite` `#11161F` — cards, elevated surface
- `graphiteSoft` `#1A212E` — hover/nested surface
- `steel` `#232C3B` — borders, dividers

### Brand Blues
- `midnight` `#0E1A33`
- `deepBlue` `#13294B`
- `cosmicBlue` `#1B3A6B`

### Accents
- `aurora` `#3DD6C4` — primary accent (teal-mint glow)
- `signal` `#5B8DEF` — links, routes, navigation
- `ember` `#FF7A59` — rare warm accent (secret drops, alerts)
- `violet` `#9B6DFF` — circles, trusted items

### Text
- `starlight` `#EAF1FF` — primary text
- `star` `#C6D2E8` — secondary text
- `starFaint` `#8A97B0` — tertiary text
- `starGhost` `#5A6478` — placeholder/disabled

## Typography

| Font | Use |
|---|---|
| **Clash Display** | Hero, brand, section headers |
| **General Sans** | UI body, buttons, labels |
| **Space Mono** | Coordinates, data, signal codes |

## Motion Patterns

| Pattern | Description |
|---|---|
| `signalPulse` | Expanding ring + opacity fade, loop 2.4s |
| `parallaxGlobe` | Rotate Y slow + mouse/gyro tilt |
| `floatingLayers` | translateY ±8px sine loop |
| `routeDraw` | SVG stroke-dashoffset reveal |
| `starfieldDrift` | Particles slow drift, depth parallax |
| `cinematicReveal` | opacity 0→1 + translateY 24→0 + blur 8→0 |

**Always respect `prefers-reduced-motion`** — pause or simplify all animations.

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

1. Import ALL tokens from `@travelpoint/theme` — zero hardcoded values
2. Mobile-first: 393px base, scale up with `md:`/`lg:`
3. Touch targets ≥ 44pt (iOS) / 48dp (Android)
4. Animations on UI thread (Reanimated worklets, not JS thread)
5. Glassmorphism via `expo-blur` (use sparingly — expensive)
6. Glow effects over drop shadows on dark backgrounds
