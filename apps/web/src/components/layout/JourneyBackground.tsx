'use client';
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Organic terrain generation — deterministic seeded noise → smooth Bezier path
// ─────────────────────────────────────────────────────────────────────────────
function pseudoRandom(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function terrainPath(
  seed: number,
  baseY: number,   // 0–1 fraction of viewport height
  amp: number,     // 0–1 amplitude
  segments = 16,
  W = 1440,
  H = 900,
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * W;
    const n =
      (pseudoRandom(seed + i * 0.61803) - 0.5) * 0.55 +
      (pseudoRandom(seed * 1.618 + i * 1.414) - 0.5) * 0.30 +
      (pseudoRandom(seed * 2.718 + i * 2.236) - 0.5) * 0.15;
    const y = Math.max(H * 0.06, Math.min(H * 0.96, (baseY + n * amp) * H));
    pts.push([x, y]);
  }
  // Mid-point Bezier — smooth organic curve through all points
  let d = `M0,${H} L${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const mx = ((x0 + x1) / 2).toFixed(1);
    d += ` C${mx},${y0.toFixed(1)} ${mx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d + ` L${W},${H} Z`;
}

// Sharper mountain peaks — mix of smooth Bezier + angular accent
function mountainPath(seed: number, baseY: number, amp: number, W = 1440, H = 900): string {
  const count = 11;
  const peaks: [number, number][] = [];
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * W;
    const peak = pseudoRandom(seed + i * 0.577) * amp - amp * 0.35;
    const y = Math.max(H * 0.12, (baseY + peak) * H);
    peaks.push([x, y]);
  }
  let d = `M0,${H}`;
  peaks.forEach(([x, y]) => { d += ` L${x.toFixed(1)},${y.toFixed(1)}`; });
  return d + ` L${W},${H} Z`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Biome definitions
// ─────────────────────────────────────────────────────────────────────────────
type Layer = { fill: string; opacity?: number; path: string; filter?: string };
type Biome = {
  id: string;
  from: number; to: number;
  sky: string;                    // CSS gradient — the sky
  lights: string[];               // extra atmospheric gradient overlays
  layers: Layer[];                // terrain SVG layers
  fog: string;                    // bottom atmospheric gradient
};

// Paths pre-computed (stable across re-renders — no seeded noise changes)
const P = {
  // Ocean waves
  wave1: terrainPath(11, 0.82, 0.05),
  wave2: terrainPath(23, 0.88, 0.03),
  wave3: terrainPath(7,  0.93, 0.02),

  // Forest canopy layers
  forest1: terrainPath(31, 0.60, 0.11), // far canopy
  forest2: terrainPath(43, 0.70, 0.14), // mid canopy
  forest3: terrainPath(57, 0.77, 0.16), // near canopy — bumpy tops
  forest4: terrainPath(71, 0.86, 0.10), // ground layer

  // Mountain range layers
  mtn1: mountainPath(83, 0.48, 0.30),  // far — tallest, angular peaks
  mtn2: mountainPath(97, 0.58, 0.25),  // mid
  mtn3: mountainPath(103,0.68, 0.22),  // near — darkest

  // Canyon mesas (flat-top: low amplitude, higher base)
  cyn1: terrainPath(113, 0.52, 0.09, 20),
  cyn2: terrainPath(127, 0.62, 0.10, 20),
  cyn3: terrainPath(139, 0.74, 0.08, 20),

  // Coastal cliffs — separate SVG shapes (defined inline)
  coast_sea:    'M0,420 C360,402 720,418 1080,408 C1260,402 1360,414 1440,410 L1440,518 C1360,522 1260,510 1080,516 C720,522 360,508 0,520 Z',
  coast_left:   'M0,900 L0,290 C14,320 34,390 52,480 C70,570 80,658 90,748 L114,900 Z',
  coast_right:  'M1440,900 L1440,290 C1426,320 1406,390 1388,480 C1370,570 1360,658 1350,748 L1326,900 Z',
  coast_rocks:  terrainPath(151, 0.88, 0.06),

  // Summit — distant ridgelines, open sky
  sum1: mountainPath(163, 0.62, 0.20),
  sum2: terrainPath(179, 0.75, 0.08),
};

const BIOMES: Biome[] = [
  // ── 1 · OCEAN DEPTHS ─────────────────────────────────────────────────────
  {
    id: 'ocean', from: 0, to: 0.24,
    sky: `linear-gradient(
      175deg,
      #020304 0%,
      #050B12 22%,
      #081828 48%,
      #0D2238 72%,
      #143848 100%
    )`,
    lights: [
      // Moonlight reflection — upper right
      'radial-gradient(ellipse 28% 22% at 76% 10%, rgba(196,185,172,0.09) 0%, transparent 100%)',
      // Moonlight path on water — vertical streak
      'linear-gradient(to bottom, transparent 30%, rgba(196,185,172,0.04) 55%, transparent 75%)',
      // Bioluminescence / teal depth
      'radial-gradient(ellipse 70% 30% at 50% 95%, rgba(19,48,64,0.55) 0%, transparent 100%)',
    ],
    layers: [
      { fill: '#0F2234', opacity: 0.75, path: P.wave1 },
      { fill: '#091828', opacity: 0.88, path: P.wave2 },
      { fill: '#060E1A', opacity: 1,    path: P.wave3 },
    ],
    fog: 'linear-gradient(to top, rgba(20,56,72,0.35) 0%, rgba(30,154,176,0.06) 30%, transparent 70%)',
  },

  // ── 2 · DENSE FOREST ─────────────────────────────────────────────────────
  {
    id: 'forest', from: 0.19, to: 0.44,
    sky: `linear-gradient(
      to bottom,
      #030604 0%,
      #060E08 28%,
      #0A1610 58%,
      #0E1E14 85%,
      #122018 100%
    )`,
    lights: [
      // Dappled light patches through canopy
      'radial-gradient(ellipse 18% 14% at 25% 35%, rgba(200,164,86,0.07) 0%, transparent 100%)',
      'radial-gradient(ellipse 12% 10% at 62% 28%, rgba(200,164,86,0.05) 0%, transparent 100%)',
      'radial-gradient(ellipse 22% 18% at 82% 45%, rgba(200,164,86,0.06) 0%, transparent 100%)',
      // Ground glow — soft earth tone
      'radial-gradient(ellipse 80% 25% at 50% 100%, rgba(74,138,106,0.12) 0%, transparent 100%)',
    ],
    layers: [
      // Far canopy — lighter, small bumps
      { fill: '#0C1A0E', opacity: 0.70, path: P.forest1, filter: 'url(#tex-forest)' },
      // Mid canopy
      { fill: '#081208', opacity: 0.85, path: P.forest2, filter: 'url(#tex-forest)' },
      // Near canopy — darkest, most detail
      { fill: '#050C05', opacity: 0.95, path: P.forest3, filter: 'url(#tex-forest)' },
      // Ground
      { fill: '#030804', opacity: 1,    path: P.forest4 },
    ],
    fog: 'linear-gradient(to top, rgba(255,255,255,0.04) 0%, rgba(200,164,86,0.03) 15%, transparent 50%)',
  },

  // ── 3 · MOUNTAIN RANGE ───────────────────────────────────────────────────
  {
    id: 'mountain', from: 0.39, to: 0.59,
    sky: `linear-gradient(
      to bottom,
      #020408 0%,
      #060C18 25%,
      #0C1628 55%,
      #101E34 80%,
      #142240 100%
    )`,
    lights: [
      // Alpenglow — warm pink-orange on horizon
      'linear-gradient(to top, rgba(140,80,60,0.08) 0%, transparent 30%)',
      // Blue atmospheric haze at mid-sky
      'linear-gradient(to bottom, transparent 35%, rgba(20,40,80,0.15) 65%, transparent 85%)',
      // Snow glow on peaks — faint starlight
      'radial-gradient(ellipse 100% 30% at 50% 45%, rgba(196,185,172,0.06) 0%, transparent 100%)',
    ],
    layers: [
      // Far range — atmospheric blue-grey, barely visible
      { fill: '#1A2840', opacity: 0.55, path: P.mtn1 },
      // Mid range
      { fill: '#0E1C2C', opacity: 0.75, path: P.mtn2, filter: 'url(#tex-rock)' },
      // Near range — darkest, most contrast
      { fill: '#070C14', opacity: 1,    path: P.mtn3, filter: 'url(#tex-rock)' },
    ],
    fog: 'linear-gradient(to top, rgba(20,40,80,0.20) 0%, rgba(30,60,120,0.05) 25%, transparent 55%)',
  },

  // ── 4 · CANYON / RED ROCK ────────────────────────────────────────────────
  {
    id: 'canyon', from: 0.56, to: 0.76,
    sky: `linear-gradient(
      to bottom,
      #080300 0%,
      #120600 30%,
      #1C0C04 62%,
      #160A04 88%,
      #0E0806 100%
    )`,
    lights: [
      // Warm sun / heat above horizon
      'radial-gradient(ellipse 60% 25% at 50% 20%, rgba(200,104,64,0.10) 0%, transparent 100%)',
      // Warm reflected light on canyon floor
      'radial-gradient(ellipse 80% 20% at 50% 100%, rgba(200,104,64,0.12) 0%, transparent 100%)',
      // Dust haze atmosphere
      'linear-gradient(to top, rgba(160,80,40,0.06) 0%, transparent 40%)',
    ],
    layers: [
      // Far mesa — warm tint, flatter
      { fill: '#301408', opacity: 0.60, path: P.cyn1, filter: 'url(#tex-rock)' },
      // Mid formation
      { fill: '#1E0E06', opacity: 0.80, path: P.cyn2, filter: 'url(#tex-rock)' },
      // Near canyon floor/wall
      { fill: '#0E0806', opacity: 1,    path: P.cyn3, filter: 'url(#tex-rock)' },
    ],
    fog: 'linear-gradient(to top, rgba(200,104,64,0.08) 0%, rgba(160,60,20,0.04) 20%, transparent 50%)',
  },

  // ── 5 · COASTAL CLIFFS ───────────────────────────────────────────────────
  {
    id: 'coastal', from: 0.73, to: 0.90,
    sky: `linear-gradient(
      to bottom,
      #020610 0%,
      #040E1E 30%,
      #081C30 65%,
      #0E2840 100%
    )`,
    lights: [
      // Horizon glow — overcast light
      'linear-gradient(to top, transparent 50%, rgba(30,154,176,0.06) 75%, rgba(20,100,130,0.04) 90%, transparent 100%)',
      // Sea surface shimmer
      'radial-gradient(ellipse 90% 8% at 50% 50%, rgba(30,154,176,0.10) 0%, transparent 100%)',
      // Spray light at cliff base
      'radial-gradient(ellipse 30% 12% at 8% 85%, rgba(220,230,240,0.05) 0%, transparent 100%)',
      'radial-gradient(ellipse 30% 12% at 92% 85%, rgba(220,230,240,0.05) 0%, transparent 100%)',
    ],
    layers: [
      // Sea band
      { fill: '#0A2030', opacity: 0.85, path: P.coast_sea },
      // Left cliff
      { fill: '#0C1C14', opacity: 1, path: P.coast_left, filter: 'url(#tex-rock)' },
      // Right cliff
      { fill: '#0C1C14', opacity: 1, path: P.coast_right, filter: 'url(#tex-rock)' },
      // Rocky shoreline
      { fill: '#070E0A', opacity: 1, path: P.coast_rocks },
    ],
    fog: 'linear-gradient(to top, rgba(30,154,176,0.10) 0%, rgba(20,80,110,0.05) 20%, transparent 50%)',
  },

  // ── 6 · OPEN SUMMIT / RETURN ─────────────────────────────────────────────
  {
    id: 'summit', from: 0.87, to: 1.0,
    sky: `linear-gradient(
      to bottom,
      #020306 0%,
      #04080E 28%,
      #060E1C 58%,
      #0A162A 82%,
      #101E38 100%
    )`,
    lights: [
      // Aurora borealis — faint seagrass glow on horizon
      'linear-gradient(to top, rgba(92,184,140,0.07) 0%, rgba(92,184,140,0.03) 18%, transparent 40%)',
      // Starfield glow overhead
      'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,185,172,0.05) 0%, transparent 100%)',
    ],
    layers: [
      // Distant ridgeline — atmospheric fade
      { fill: '#1C2E44', opacity: 0.50, path: P.sum1 },
      // Near ridge
      { fill: '#0A1220', opacity: 0.85, path: P.sum2, filter: 'url(#tex-rock)' },
    ],
    fog: 'linear-gradient(to top, rgba(92,184,140,0.08) 0%, rgba(30,154,176,0.04) 22%, transparent 55%)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SVG filter defs — reused across all biomes
// ─────────────────────────────────────────────────────────────────────────────
function FilterDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        {/* Rock / stone texture — coarse fractal noise */}
        <filter id="tex-rock" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035 0.06"
            numOctaves="4"
            seed="8"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Forest canopy — finer noise for organic branch texture */}
        <filter id="tex-forest" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06 0.04"
            numOctaves="5"
            seed="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="10"
            xChannelSelector="G"
            yChannelSelector="R"
          />
        </filter>
      </defs>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-biome animated layer
// ─────────────────────────────────────────────────────────────────────────────
const FADE = 0.07;

function BiomeLayer({
  biome,
  progress,
}: {
  biome: Biome;
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(
    progress,
    [
      Math.max(0, biome.from - FADE),
      biome.from,
      biome.to,
      Math.min(1, biome.to + FADE),
    ],
    [0, 1, 1, 0],
  );

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      {/* Sky gradient */}
      <div className="absolute inset-0" style={{ background: biome.sky }} />

      {/* Atmospheric light overlays */}
      {biome.lights.map((g, i) => (
        <div key={i} className="absolute inset-0" style={{ background: g }} />
      ))}

      {/* Terrain SVG */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {biome.layers.map((layer, i) => (
          <path
            key={i}
            d={layer.path}
            fill={layer.fill}
            opacity={layer.opacity ?? 1}
            filter={layer.filter}
          />
        ))}
      </svg>

      {/* Ground fog / atmosphere */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{ background: biome.fog }} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export function JourneyBackground() {
  const { scrollYProgress } = useScroll();

  return (
    <>
      <FilterDefs />
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {BIOMES.map((biome) => (
          <BiomeLayer key={biome.id} biome={biome} progress={scrollYProgress} />
        ))}

        {/* Global edge vignette — always present, improves text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 120% 120% at 50% 50%, transparent 35%, rgba(3,4,6,0.65) 100%)',
          }}
        />
      </div>
    </>
  );
}
