export const pl = {
  // Auth
  auth: {
    joinTitle:        'Dołącz do sieci',
    joinSubtitle:     'Sieć podróżników z obsesją odkrywania.',
    emailPlaceholder: 'twój@email.com',
    handlePlaceholder: 'twój_handle',
    passwordPlaceholder: 'Hasło (min. 12 znaków)',
    acceptTerms:      'Akceptuję regulamin',
    acceptPrivacy:    'Akceptuję politykę prywatności',
    joinCta:          'Chcę wejść do sieci',
    loginTitle:       'Powrót do sieci',
    loginCta:         'Wejdź',
    haveAccount:      'Masz już konto?',
    noAccount:        'Nie masz konta?',
  },

  // Navigation
  nav: {
    atlas:    'Atlas',
    discover: 'Odkryj',
    circles:  'Circles',
    journeys: 'Journeys',
    identity: 'Tożsamość',
  },

  // Spots
  spots: {
    dropSpot:       'Drop',
    hiddenSpot:     'Ukryty Spot',
    lockedSpot:     'Zablokowane',
    unlockRequires: 'Wymaga',
    secretDrop:     'Tajny Drop',
    expiresIn:      'Wygasa za',
    saveToWorlds:   'Zapisz w Saved Worlds',
    savedInWorlds:  'Zapisano w Saved Worlds',
    savedWorlds:    'Saved Worlds',
    noSavedWorlds:  'Brak Saved Worlds',
  },

  // Presence
  presence: {
    nearby:         'Explorers w pobliżu',
    presenceActive: 'Presence aktywny',
    presenceOff:    'Presence wyłączony',
    enablePresence: 'Włącz Presence',
  },

  // Journeys
  journeys: {
    newJourney:     'Nowe Journey',
    replayJourney:  'Odtwórz',
    privateJourney: 'Prywatne',
  },

  // GPS Recording
  recording: {
    startRecording:      'Nagraj Journey',
    stopRecording:       'Zatrzymaj nagrywanie',
    stopBtn:             '⏹ Zatrzymaj',
    recordBtn:           'Wyprawa',
    journeyNameLabel:    'Nazwa Journey',
    journeyNameHint:     'np. Poranny urbex w Łodzi...',
    startBtn:            'Rozpocznij',
    recordingActive:     'Nagrywam',
    locationRequired:    'Wymagana lokalizacja',
    locationDeniedMsg:   'Zezwól na dostęp do lokalizacji w ustawieniach, aby nagrywać Journey.',
    savedTitle:          'Journey zapisane',
    savedBody:           (pts: number, km: number) =>
      `${pts} punktów GPS · ${km.toFixed(2)} km`,
    tooFewPoints:        'Za mało punktów GPS. Poruszaj się, by zarejestrować trasę.',
    saveFailed:          'Błąd zapisu trasy. Spróbuj ponownie.',
    cancelTitle:         'Anulować nagrywanie?',
    cancelMsg:           'Zarejestrowana trasa zostanie utracona.',
    cancelConfirm:       'Tak, anuluj',
  },

  // Circles
  circles: {
    myCircles:    'Moje Circles',
    joinCircle:   'Dołącz',
    createCircle: 'Utwórz Circle',
    inviteOnly:   'Tylko zaproszenia',
  },

  // Photos
  photos: {
    addPhoto:          'Dodaj zdjęcie',
    camera:            'Aparat',
    gallery:           'Galeria',
    permissionDenied:  'Brak dostępu do aparatu lub galerii.',
    tooLarge:          'Zdjęcie jest za duże. Wybierz mniejszy plik (max 3 MB).',
    uploadFailed:      'Błąd wgrywania zdjęcia.',
    caption:           'Opis (opcjonalnie)',
    captionHint:       'Co kryje to miejsce?',
    addBtn:            'Dodaj ◎',
  },

  // New spot form
  newSpot: {
    eyebrow:          'Nowe odkrycie',
    titleLabel:       'Nazwa miejsca',
    titlePlaceholder: 'np. Opuszczona fabryka przy dworcu...',
    storyLabel:       'Historia (opcjonalnie)',
    storyPlaceholder: 'Co kryje to miejsce? Jak tam trafiłeś?',
    categoryLabel:    'Kategoria',
    accessLabel:      'Poziom dostępu',
    circleLabel:      'Circle',
    noCircleMsg:      'Nie należysz do żadnego circle. Dołącz lub stwórz circle, by ograniczyć dostęp.',
    dropTitle:        '⬡ Tajny Drop',
    dropSub:          'Spot zniknie po wybranym czasie. Tylko dla uprawnionych eksploratorów.',
    dropDuration:     'Czas trwania',
    expiryLabel:      'Wygaśnie:',
    expiryRequired:   'Wybierz czas trwania Secret Drop',
    gpsFetching:      'Pobieranie lokalizacji...',
    gpsDenied:        'Brak dostępu do lokalizacji — koordynaty nie zostaną zapisane.',
    saveError:        'Błąd zapisu. Sprawdź połączenie i spróbuj ponownie.',
  },

  // Spot categories
  spotCategories: {
    ABANDONED:   'Opuszczone',
    CAFE:        'Kawiarnia',
    BEACH:       'Plaża',
    ROUTE:       'Trasa',
    UNDERGROUND: 'Podziemia',
    VIEWPOINT:   'Widok',
    CAMP:        'Baza',
  },

  // Access level labels
  spotAccess: {
    PUBLIC:      'Publiczne',
    TRUSTED:     'Zaufani',
    CIRCLE_ONLY: 'Tylko Circle',
    SECRET_DROP: 'Tajny Drop',
  },

  // Circle member roles
  roles: {
    FOUNDER: 'Założyciel',
    GUIDE:   'Przewodnik',
    MEMBER:  'Członek',
  },

  // Signal type labels (in-app notifications)
  signalLabels: {
    NEARBY_EXPLORER: 'Explorer w pobliżu',
    NEARBY_SPOT:     'Nowy spot w pobliżu',
    SPOT_UNLOCKED:   'Spot odblokowany',
    SPOT_COMMENT:    'Komentarz do spotu',
    CIRCLE_INVITE:   'Zaproszenie do circle',
    SECRET_DROP:     'Secret drop aktywny',
    JOURNEY_LIKE:    'Reakcja na journey',
    TRANSMISSION:    'Nowa transmisja',
    FORUM_REPLY:     'Odpowiedź na forum',
    RANK_UP:         'Nowa ranga!',
  },

  forum: {
    title:        'Forum',
    newPost:      '+ Post',
    replyPlaceholder: 'Odpowiedz…',
    locked:       'Wątek zablokowany przez moderatora',
    noReplies:    'Bądź pierwszy który odpowie.',
    noThreads:    'Brak wątków. Napisz pierwszy post.',
    replies:      'odpowiedzi',
    replySingle:  'odpowiedź',
  },

  // Signal type icons
  signalIcons: {
    NEARBY_EXPLORER: '◎',
    NEARBY_SPOT:     '◉',
    SPOT_UNLOCKED:   '◈',
    SPOT_COMMENT:    '◇',
    CIRCLE_INVITE:   '◑',
    SECRET_DROP:     '◉',
    JOURNEY_LIKE:    '◎',
    TRANSMISSION:    '◐',
    FORUM_REPLY:     '◇',
    RANK_UP:         '◈',
  },

  // Spot category icons (Terra Mare visual symbols)
  spotCategoryIcons: {
    ABANDONED:   '◈',
    CAFE:        '◎',
    BEACH:       '◎',
    ROUTE:       '◉',
    UNDERGROUND: '◈',
    VIEWPOINT:   '◎',
    CAMP:        '◉',
  },

  // Spot locked overlay strings
  spotLock: {
    title:          'Zablokowane',
    hintCircleOnly: 'Dołącz do odpowiedniego circle żeby odblokować ten spot.',
    hintDefault:    'Zwiększ swój rank lub odblokuj wyższy plan dostępu.',
    unlockWithPlan: (plan: string) => `Odblokuj z planem ${plan}`,
  },

  // Subscription tier display names
  tierNames: {
    FREE:       'Explorer',
    PRO:        'Explorer PRO',
    EXPEDITION: 'Expedition',
  },

  // Feed activity type labels
  feedTypes: {
    SPOT_CREATED:      'dodał nowy Spot',
    JOURNEY_PUBLISHED: 'opublikował Journey',
    SPOT_COMMENT:      'skomentował Spot',
    REACTION_RECEIVED: 'zareagował',
    CIRCLE_ACTIVITY:   'aktywny w Circle',
  },

  // Feed activity type icons
  feedIcons: {
    SPOT_CREATED:      '◉',
    JOURNEY_PUBLISHED: '◎',
    SPOT_COMMENT:      '◇',
    REACTION_RECEIVED: '♥',
    CIRCLE_ACTIVITY:   '◑',
  },

  // Search
  search: {
    placeholder:     'Szukaj spotów, eksploratorów, tras...',
    minChars:        'Wpisz min. 2 znaki',
    noResults:       'Brak wyników dla',
    spotsSection:    'Spoty',
    explorersSection:'Eksploratorzy',
    journeysSection: 'Journeys',
    recentLabel:     'Ostatnie wyszukiwania',
    clearRecent:     'Wyczyść',
    lockedSpot:      'Zablokowane',
    privateJourney:  'Prywatne',
  },

  // Biometrics
  biometrics: {
    promptMessage:  'Potwierdź swoją tożsamość',
    cancelLabel:    'Anuluj',
    settingTitle:   'Blokada biometryczna',
    settingDesc:    'Zabezpiecz dostęp do aplikacji odciskiem palca lub Face ID.',
    lockScreen:     'TravelPoint',
    lockSubtitle:   'Dotknij sensora, aby wejść',
    unlockBtn:      'Odblokuj',
    notSupported:   'Biometria niedostępna na tym urządzeniu.',
  },

  // Common
  common: {
    save:   'Zapisz',
    cancel: 'Anuluj',
    delete: 'Usuń',
    loading: 'Ładowanie...',
    error:  'Błąd',
    retry:  'Spróbuj ponownie',
  },
} as const;
