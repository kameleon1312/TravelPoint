export const Colors = {
  // ─── Surfaces (ocean floor / wet stone) ──────────────────────────────────
  void:         '#070A0C',   // ocean abyss — deepest dark
  abyss:        '#0C1014',   // main background — deep water
  graphite:     '#131A1F',   // cards — wet dark rock
  graphiteSoft: '#1B2328',   // hover / nested
  steel:        '#253035',   // borders, dividers

  // ─── Ocean depth tones ────────────────────────────────────────────────────
  midnight:     '#0F1E2A',
  deepBlue:     '#133040',
  cosmicBlue:   '#1A4055',

  // ─── Primary accent — Seagrass green ─────────────────────────────────────
  aurora:       '#5CB88C',   // seagrass — discovery, CTA
  auroraDeep:   '#3A8C6A',   // pressed seagrass
  signal:       '#1E9AB0',   // deep teal ocean — links, navigation, presence
  signalGlow:   '#3DBDD4',   // brighter teal — glow effects
  ember:        '#C86840',   // terracotta canyon — alerts, secret drops, urgency
  violet:       '#7A6D9E',   // dusk lavender — circles, trusted

  // ─── Warm terra accents ───────────────────────────────────────────────────
  sand:         '#C8A456',   // dry sand / golden hour
  moss:         '#4A8A6A',   // deep forest moss

  // ─── Text (warm cream — paper, not cold screen) ───────────────────────────
  starlight:    '#EDE8DF',   // primary text
  star:         '#C4B9AC',   // secondary text
  starFaint:    '#8A827A',   // tertiary text    — contrast 5.2:1 on abyss ✓ WCAG AA
  starGhost:    '#5A5550',   // placeholder / disabled
  textOnDark:   '#FFFFFF',   // pure white for buttons on colored bg

  // ─── Glass (warm organic tint — NOT cold steel) ───────────────────────────
  glass:        'rgba(237,232,223,0.05)',
  glassBorder:  'rgba(237,232,223,0.10)',
  glassStrong:  'rgba(237,232,223,0.09)',
  glassShadow:  'rgba(0,0,0,0.50)',

  // ─── Overlays ─────────────────────────────────────────────────────────────
  overlayDark:       'rgba(7,10,12,0.65)',
  overlayDarkStrong: 'rgba(7,10,12,0.88)',
  overlayGreen:      'rgba(92,184,140,0.12)',   // seagrass glow
  overlayLight:      'rgba(237,232,223,0.08)',

  // ─── Status ───────────────────────────────────────────────────────────────
  success:      '#5CB88C',   // seagrass
  warning:      '#C8A456',   // sand
  danger:       '#C85040',   // deep red-terracotta
  info:         '#1E9AB0',   // teal

  // ─── Legacy aliases (backward compat) ────────────────────────────────────
  backgroundSky:   '#0F1E2A',
  backgroundGreen: '#0C1014',
  surfaceSand:     '#131A1F',
  borderStrong:    '#3A4A52',
  borderSand:      '#253035',
  borderSky:       '#253035',
  sandDark:        '#A07840',
} as const;

export type ColorToken = keyof typeof Colors;
