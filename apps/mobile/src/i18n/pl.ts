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
    dropSpot:       'Oznacz miejsce',
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
