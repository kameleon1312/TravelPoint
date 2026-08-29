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
    shadowColor: '#5CB88C',   // seagrass green — Terra Mare
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 8,
  },
  signalGlow: {
    shadowColor: '#1E9AB0',   // ocean teal — Terra Mare
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  emberGlow: {
    shadowColor: '#C86840',   // terracotta canyon — Terra Mare
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 10,
  },
} as const;

// CSS box-shadow equivalents for web
export const CssShadow = {
  card: '0 8px 32px rgba(0,0,0,0.45)',
  auroraGlow: '0 0 32px rgba(92,184,140,0.35)',    // #5CB88C
  signalGlow: '0 0 24px rgba(30,154,176,0.40)',    // #1E9AB0
  emberGlow: '0 0 40px rgba(200,104,64,0.45)',     // #C86840
} as const;
