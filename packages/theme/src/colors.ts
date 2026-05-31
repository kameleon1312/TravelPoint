export const Colors = {
  // ─── Deep surfaces (ocean floor meets dark stone) ───
  void:         '#070A0C',   // deepest — ocean abyss
  abyss:        '#0C1014',   // main background — deep water
  graphite:     '#131A1F',   // cards — wet dark rock
  graphiteSoft: '#1B2328',   // hover / nested surface
  steel:        '#253035',   // borders, dividers

  // ─── Ocean depth tones ───
  midnight:     '#0F1E2A',
  deepBlue:     '#133040',
  cosmicBlue:   '#1A4055',

  // ─── Accents ───
  aurora:       '#5CB88C',   // seagrass green — primary accent
  auroraDeep:   '#3A8C6A',   // darker seagrass
  signal:       '#1E9AB0',   // deep teal ocean — links / navigation
  signalGlow:   '#3DBDD4',   // brighter teal for glow
  ember:        '#C86840',   // terracotta canyon — rare warm accent
  violet:       '#7A6D9E',   // dusk lavender — circles / trusted

  // ─── Terra accents ───
  sand:         '#C8A456',   // dry sand, golden hour
  moss:         '#4A8A6A',   // deep forest moss

  // ─── Text (warm cream tones — paper, not cold screen) ───
  starlight:    '#EDE8DF',   // primary text — warm cream
  star:         '#C4B9AC',   // secondary text
  starFaint:    '#8A827A',   // tertiary text
  starGhost:    '#5A5550',   // placeholder / disabled

  // ─── Glass (warmer organic tint) ───
  glass:        'rgba(237,232,223,0.05)',
  glassBorder:  'rgba(237,232,223,0.10)',
  glassStrong:  'rgba(237,232,223,0.09)',

  // ─── Status ───
  success:      '#5CB88C',
  warning:      '#C8A456',
  danger:       '#C85040',
  info:         '#1E9AB0',
} as const;

export type ColorToken = keyof typeof Colors;
