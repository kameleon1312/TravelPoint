export const Gradients = {
  aurora:  ['#3A8C6A', '#5CB88C', '#1E9AB0'],   // seagrass → ocean
  cosmic:  ['#070A0C', '#0F1E2A', '#133040'],    // ocean depth
  signal:  ['#1E9AB0', '#5CB88C'],               // ocean teal → seagrass
  ember:   ['#C86840', '#7A6D9E'],               // terracotta → dusk
  sheen:   ['rgba(237,232,223,0.12)', 'rgba(237,232,223,0.00)'],
} as const;

export type GradientToken = keyof typeof Gradients;
