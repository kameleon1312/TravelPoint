export const Colors = {
  // ─── Backgrounds (dark warm greys) ────────────────────────────────────────
  void:           '#0C0C0C',   // near-black
  abyss:          '#141414',   // main background
  graphite:       '#1E1E1E',   // cards
  graphiteSoft:   '#262626',   // hover / nested
  steel:          '#3C3C3C',   // borders, dividers

  // ─── Depth tones ──────────────────────────────────────────────────────────
  midnight:       '#181818',
  deepBlue:       '#1A1A20',
  cosmicBlue:     '#202028',

  // ─── Primary accent — Orange ──────────────────────────────────────────────
  aurora:         '#E8600A',   // main orange — discovery, CTA
  auroraDeep:     '#B84A06',   // darker orange — pressed state
  signal:         '#E09020',   // amber — links, navigation, presence
  signalGlow:     '#FFB040',   // bright amber — glow effects
  ember:          '#D03820',   // red-orange — alerts, danger, urgency
  violet:         '#8B78D0',   // dusk purple — circles, trusted

  // ─── Warm accents ─────────────────────────────────────────────────────────
  sand:           '#C89040',   // golden
  moss:           '#50885A',   // deep green

  // ─── Text (warm white scale) ──────────────────────────────────────────────
  starlight:      '#F2EEEB',   // primary — warm near-white
  star:           '#A89890',   // secondary — warm medium grey
  starFaint:      '#686060',   // tertiary — warm dark grey
  starGhost:      '#464040',   // placeholder / disabled
  textOnDark:     '#FFFFFF',   // pure white for buttons on dark

  // ─── Glass (warm, subtle) ─────────────────────────────────────────────────
  glass:          'rgba(255,255,255,0.05)',
  glassBorder:    'rgba(255,255,255,0.10)',
  glassStrong:    'rgba(255,255,255,0.09)',
  glassShadow:    'rgba(0,0,0,0.40)',

  // ─── Overlays ─────────────────────────────────────────────────────────────
  overlayDark:       'rgba(0,0,0,0.50)',
  overlayDarkStrong: 'rgba(0,0,0,0.70)',
  overlayGreen:      'rgba(232,96,10,0.15)',
  overlayLight:      'rgba(255,255,255,0.10)',

  // ─── Status ───────────────────────────────────────────────────────────────
  success:        '#42A862',
  warning:        '#E09020',
  danger:         '#D03820',
  info:           '#E8600A',

  // ─── Legacy aliases (kept for backwards compatibility) ────────────────────
  backgroundSky:  '#181818',
  backgroundGreen:'#141414',
  surfaceSand:    '#1E1E1E',
  borderStrong:   '#555555',
  borderSand:     '#3C3C3C',
  borderSky:      '#3C3C3C',
  sandDark:       '#A07030',
} as const;

export type ColorToken = keyof typeof Colors;
