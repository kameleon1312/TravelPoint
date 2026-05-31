export const Colors = {
  // Deep space surfaces
  void: '#05060A',
  abyss: '#0A0E18',
  graphite: '#11161F',
  graphiteSoft: '#1A212E',
  steel: '#232C3B',

  // Midnight blues (brand base)
  midnight: '#0E1A33',
  deepBlue: '#13294B',
  cosmicBlue: '#1B3A6B',

  // Aurora accents (signal / discovery)
  aurora: '#3DD6C4',
  auroraDeep: '#1FA899',
  signal: '#5B8DEF',
  signalGlow: '#7FA8FF',
  ember: '#FF7A59',
  violet: '#9B6DFF',

  // Starlight (text & highlights)
  starlight: '#EAF1FF',
  star: '#C6D2E8',
  starFaint: '#8A97B0',
  starGhost: '#5A6478',

  // Glass (glassmorphism)
  glass: 'rgba(234,241,255,0.04)',
  glassBorder: 'rgba(234,241,255,0.10)',
  glassStrong: 'rgba(234,241,255,0.08)',

  // Status
  success: '#3DD6A0',
  warning: '#F2B660',
  danger: '#FF5C6C',
  info: '#5B8DEF',
} as const;

export type ColorToken = keyof typeof Colors;
