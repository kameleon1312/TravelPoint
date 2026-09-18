export const pushStrings = {
  circleInvite: {
    title: 'Zaproszenie do circle',
    body: (circleName: string) => `Zostałeś zaproszony do circle ${circleName}`,
  },
  journeyLike: {
    title: 'Nowy sygnał',
    body: 'Ktoś polubił Twoją podróż',
  },
} as const;
