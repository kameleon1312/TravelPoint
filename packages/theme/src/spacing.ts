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
    shadowColor: '#1B2B2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  auroraGlow: {
    shadowColor: '#2E7D32',   // primary green — Natural Harmony
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  signalGlow: {
    shadowColor: '#0288D1',   // sky blue — Natural Harmony
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  emberGlow: {
    shadowColor: '#F9A825',   // warm amber — Natural Harmony
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 5,
  },
} as const;

// CSS box-shadow equivalents for web
export const CssShadow = {
  card: '0 2px 10px rgba(27,43,47,0.08)',
  auroraGlow: '0 0 18px rgba(46,125,50,0.22)',     // #2E7D32
  signalGlow: '0 0 14px rgba(2,136,209,0.22)',     // #0288D1
  emberGlow:  '0 0 18px rgba(249,168,37,0.25)',    // #F9A825
} as const;
