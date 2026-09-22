export const Gradients = {
  // Primary natural gradient — green CTA, active elements
  aurora:  ['#256628', '#2E7D32', '#43A047'],

  // Sky / travel / map gradient
  cosmic:  ['#E3F4FA', '#B3E5FC', '#64B5F6'],

  // Navigation / info gradient
  signal:  ['#0288D1', '#42A5F5'],

  // Warm sand gradient — onboarding, featured cards
  ember:   ['#F4E1C1', '#D7B892'],

  // Subtle light sheen
  sheen:   ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.00)'],
} as const;

export type GradientToken = keyof typeof Gradients;
