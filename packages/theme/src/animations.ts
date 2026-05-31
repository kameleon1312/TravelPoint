export const Easing = {
  cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
  signal: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  drift: 'cubic-bezier(0.4, 0, 0.2, 1)',
  snap: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const Duration = {
  micro: 120,
  fast: 220,
  base: 360,
  slow: 600,
  cinematic: 900,
  epic: 1400,
} as const;

// React Native Reanimated easing config
export const RNEasing = {
  cinematic: { duration: 600, dampingRatio: 0.8 },
  signal: { duration: 420, dampingRatio: 0.6 },
  drift: { duration: 320, dampingRatio: 0.9 },
  snap: { duration: 180, dampingRatio: 1.0 },
} as const;

export const MotionPatterns = {
  signalPulse: 'expanding ring + opacity fade, loop 2.4s',
  parallaxGlobe: 'rotate Y slow + mouse/gyro tilt',
  floatingLayers: 'translateY ±8px sine loop, różne fazy',
  routeDraw: 'SVG stroke-dashoffset reveal',
  starfieldDrift: 'particles slow drift, depth parallax',
  cinematicReveal: 'opacity 0→1 + translateY 24→0 + blur 8→0',
  depthScroll: 'sekcje wjeżdżają z różną prędkością (parallax)',
} as const;
