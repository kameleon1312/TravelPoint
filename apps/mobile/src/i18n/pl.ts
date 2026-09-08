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
