export const Gradients = {
  aurora: ['#1FA899', '#3DD6C4', '#5B8DEF'],
  cosmic: ['#05060A', '#0E1A33', '#13294B'],
  signal: ['#5B8DEF', '#3DD6C4'],
  ember: ['#FF7A59', '#9B6DFF'],
  sheen: ['rgba(234,241,255,0.12)', 'rgba(234,241,255,0.00)'],
} as const;

export type GradientToken = keyof typeof Gradients;
