export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  mega: 96,
  ultra: 128,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  pill: 999,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 12,
  },
  auroraGlow: {
    shadowColor: '#3DD6C4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 8,
  },
  signalGlow: {
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  emberGlow: {
    shadowColor: '#FF7A59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 10,
  },
} as const;

// CSS box-shadow equivalents for web
export const CssShadow = {
  card: '0 8px 32px rgba(0,0,0,0.45)',
  auroraGlow: '0 0 32px rgba(61,214,196,0.35)',
  signalGlow: '0 0 24px rgba(91,141,239,0.40)',
  emberGlow: '0 0 40px rgba(255,122,89,0.45)',
} as const;
