export const pushStrings = {
  circleInvite: {
    title: 'Zaproszenie do circle',
    body:  (circleName: string) => `Zostałeś zaproszony do circle ${circleName}`,
  },
  journeyLike: {
    title: 'Nowy sygnał',
    body:  'Ktoś polubił Twoją podróż',
  },
  nearbySpot: {
    title: 'Nowy spot w pobliżu',
    body:  (spotTitle: string) => `${spotTitle} — nowe miejsce od explorera z Twojego circle`,
  },
  spotComment: {
    title: 'Komentarz do spotu',
    body:  (handle: string) => `@${handle} skomentował Twój spot`,
  },
  spotUnlocked: {
    title: 'Spot odblokowany',
    body:  'Masz teraz dostęp do ukrytego miejsca',
  },
  rankUp: {
    title: 'Nowa ranga!',
    body:  (rank: string) => `Awansowałeś na ${rank}`,
  },
} as const;
