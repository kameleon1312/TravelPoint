export const Colors = {
  // ─── Backgrounds (beach / azure coast) ────────────────────────────────────
  void:            '#F4EFE8',   // warm ivory sand — primary background
  abyss:           '#EBF5FA',   // azure sky wash — secondary background
  backgroundSky:   '#D6EFF9',   // clear Côte d'Azur sky
  backgroundGreen: '#DCF0E6',   // coastal Mediterranean vegetation

  // ─── Surfaces ─────────────────────────────────────────────────────────────
  graphite:        '#FFFFFF',   // white like Mediterranean architecture
  graphiteSoft:    '#F8F4EE',   // warm sunlit white
  surfaceSand:     '#FBF0DC',   // warm sandy surface

  // ─── Borders ──────────────────────────────────────────────────────────────
  steel:           '#DDE8EE',   // sea spray
  borderStrong:    '#B5CDD9',   // ocean blue-gray
  borderSand:      '#E4D0A8',   // sand border
  borderSky:       '#A8D8EE',   // sky border

  // ─── Depth / sky tones ────────────────────────────────────────────────────
  midnight:        '#E8F5FD',   // morning sky
  deepBlue:        '#B3E0F7',   // mid sky
  cosmicBlue:      '#64BEF5',   // bright sky blue

  // ─── Primary accent — Mediterranean Turquoise ─────────────────────────────
  aurora:          '#0096C7',   // Côte d'Azur azure — CTA, active elements
  auroraDeep:      '#0077A8',   // deeper turquoise — pressed state

  // ─── Secondary accent — Sky Blue ──────────────────────────────────────────
  signal:          '#0288D1',   // coastal sky blue
  signalGlow:      '#42B4F4',   // bright sky glow

  // ─── Warm accents ─────────────────────────────────────────────────────────
  ember:           '#FF7043',   // coral sunset — alerts / signals
  violet:          '#6B9BAE',   // coastal mist — circles / trusted

  // ─── Natural tones ────────────────────────────────────────────────────────
  sand:            '#F4C87E',   // golden beach sand
  sandDark:        '#D4A056',   // amber sand separator
  moss:            '#52B788',   // Mediterranean coastal vegetation

  // ─── Text (deep navy — ocean depth) ───────────────────────────────────────
  starlight:       '#152844',   // primary text — deep navy
  star:            '#3D5E7C',   // secondary text — ocean blue-gray
  starFaint:       '#6E8FA4',   // tertiary — coastal mist
  starGhost:       '#9AB5C4',   // placeholder / disabled — sea foam
  textOnDark:      '#FFFFFF',   // text on dark overlays / CTA buttons

  // ─── Glass (white, sunlit) ────────────────────────────────────────────────
  glass:           'rgba(255,255,255,0.84)',
  glassBorder:     'rgba(255,255,255,0.65)',
  glassStrong:     'rgba(255,255,255,0.92)',
  glassShadow:     'rgba(21,40,68,0.10)',

  // ─── Photo overlays ───────────────────────────────────────────────────────
  overlayDark:       'rgba(21,40,68,0.42)',
  overlayDarkStrong: 'rgba(21,40,68,0.58)',
  overlayGreen:      'rgba(0,150,199,0.20)',
  overlayLight:      'rgba(255,255,255,0.18)',

  // ─── Status ───────────────────────────────────────────────────────────────
  success:         '#40916C',
  warning:         '#F4C87E',
  danger:          '#EF5350',
  info:            '#0288D1',
} as const;

export type ColorToken = keyof typeof Colors;
