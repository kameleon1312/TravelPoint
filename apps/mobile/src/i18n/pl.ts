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
    joinCta:          'Request Access',
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
    dropSpot:       'Drop a Spot',
    hiddenSpot:     'Hidden Spot',
    lockedSpot:     'Zablokowane',
    unlockRequires: 'Wymaga',
    secretDrop:     'Secret Drop',
    expiresIn:      'Wygasa za',
  },

  // Presence
  presence: {
    nearby:         'Explorers w pobliżu',
    presenceActive: 'Presence aktywny',
    presenceOff:    'Presence wyłączony',
    enablePresence: 'Włącz presence',
  },

  // Journeys
  journeys: {
    newJourney:     'Nowe journey',
    replayJourney:  'Replay',
    privateJourney: 'Prywatne',
  },

  // GPS Recording
  recording: {
    startRecording:      'Nagraj Journey',
    stopRecording:       'Zatrzymaj nagrywanie',
    journeyNameLabel:    'Nazwa journey',
    journeyNameHint:     'np. Poranny urbex w Łodzi...',
    startBtn:            'Rozpocznij',
    recordingActive:     'Nagrywam',
    locationRequired:    'Wymagana lokalizacja',
    locationDeniedMsg:   'Zezwól na dostęp do lokalizacji w ustawieniach, aby nagrywać journey.',
    savedTitle:          'Journey zapisane',
    savedBody:           (pts: number, km: number) =>
      `${pts} punktów GPS · ${km.toFixed(2)} km`,
    tooFewPoints:        'Za mało punktów GPS. Poruszaj się, by zarejestrować trasę.',
    saveFailed:          'Błąd zapisu trasy. Spróbuj ponownie.',
    cancelTitle:         'Anulować nagrywanie?',
    cancelMsg:           'Zarejestrowana trasa zostanie utracona.',
    cancelConfirm:       'Anuluj nagrywanie',
  },

  // Circles
  circles: {
    myCircles:    'Moje circles',
    joinCircle:   'Dołącz',
    createCircle: 'Utwórz circle',
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
