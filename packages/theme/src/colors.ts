export const Colors = {
  // ─── Backgrounds (light, natural) ─────────────────────────────────────────
  void:            '#E8EFE8',   // primary background — soft sage green
  abyss:           '#DDE8DD',   // secondary background — deeper sage
  backgroundSky:   '#D6EEF8',   // sky / map / travel sections
  backgroundGreen: '#D4EAD4',   // nature / success / profile sections

  // ─── Surfaces ─────────────────────────────────────────────────────────────
  graphite:        '#FFFFFF',   // cards, modals, inputs
  graphiteSoft:    '#F7F8F3',   // hover / nested surfaces
  surfaceSand:     '#FFF7E8',   // warm travel content

  // ─── Borders ──────────────────────────────────────────────────────────────
  steel:           '#D7E0D8',   // default border
  borderStrong:    '#B8C9BA',   // active input / selected card
  borderSand:      '#E4D0AE',   // sand element borders
  borderSky:       '#B3DDF0',   // sky element borders

  // ─── Depth / sky tones ────────────────────────────────────────────────────
  midnight:        '#E3F4FA',   // sky background (was deep blue)
  deepBlue:        '#B3E5FC',   // sky light
  cosmicBlue:      '#64B5F6',   // sky blue

  // ─── Primary accent — Natural Green ───────────────────────────────────────
  aurora:          '#2E7D32',   // primary green — CTA, active elements
  auroraDeep:      '#256628',   // pressed / darker green

  // ─── Secondary accent — Sky Blue ──────────────────────────────────────────
  signal:          '#0288D1',   // sky link / navigation
  signalGlow:      '#42A5F5',   // info blue / glow

  // ─── Warm accents ─────────────────────────────────────────────────────────
  ember:           '#F9A825',   // warm amber — alerts / signals
  violet:          '#5C8FA8',   // ocean blue-gray — circles / trusted

  // ─── Natural tones ────────────────────────────────────────────────────────
  sand:            '#F4E1C1',   // warm sand surface
  sandDark:        '#D7B892',   // sand border / separator
  moss:            '#81C784',   // green light — hover / secondary green

  // ─── Text ─────────────────────────────────────────────────────────────────
  starlight:       '#1B2B2F',   // primary text
  star:            '#546E7A',   // secondary text / descriptions
  starFaint:       '#78909C',   // tertiary text / metadata
  starGhost:       '#78909C',   // placeholder / disabled
  textOnDark:      '#FFFFFF',   // text on photo / dark overlay / green CTA

  // ─── Glass (light, natural) ───────────────────────────────────────────────
  glass:           'rgba(255,255,255,0.78)',
  glassBorder:     'rgba(255,255,255,0.55)',
  glassStrong:     'rgba(255,255,255,0.88)',
  glassShadow:     'rgba(27,43,47,0.12)',

  // ─── Photo overlays (login / registration) ────────────────────────────────
  overlayDark:       'rgba(27,43,47,0.42)',
  overlayDarkStrong: 'rgba(27,43,47,0.58)',
  overlayGreen:      'rgba(46,125,50,0.22)',
  overlayLight:      'rgba(255,255,255,0.16)',

  // ─── Status ───────────────────────────────────────────────────────────────
  success:         '#43A047',
  warning:         '#F9A825',
  danger:          '#EF5350',
  info:            '#42A5F5',
} as const;

export type ColorToken = keyof typeof Colors;
