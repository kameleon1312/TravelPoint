export const Fonts = {
  display: 'Clash Display',
  sans: 'General Sans',
  mono: 'Space Mono',
} as const;

export const FontSize = {
  display: 64,
  hero: 44,
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  bodyLg: 17,
  body: 16,
  bodySm: 14,
  caption: 12,
  micro: 11,
  cta: 14,
  coord: 13,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const LetterSpacing = {
  tight: '-0.03em',
  tightish: '-0.02em',
  normal: '0',
  wide: '0.04em',
  eyebrow: '0.22em',
  coord: '0.08em',
} as const;

export const LineHeight = {
  tight: 1.0,
  snug: 1.12,
  normal: 1.4,
  relaxed: 1.6,
} as const;
