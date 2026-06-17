# Google Maps key rotation

## Cel

Zamknąć punkt 7 Sprintu 1 bez ponownego commitowania klucza klienta.

## Google Cloud Console

1. Utwórz nowy API key w projekcie używanym przez TravelPoint.
2. Ustaw `Application restrictions` na `Android apps`.
3. Dodaj package name `io.travelpoint.app`.
4. Dodaj SHA-1 certyfikatu release używanego przez EAS.
5. Dla development build dodaj osobny klucz z package/SHA-1 certyfikatu development.
6. Ustaw `API restrictions` na `Maps SDK for Android`.
7. Ustaw quota i alert budżetowy.
8. Usuń albo wyłącz historyczny klucz zapisany wcześniej w `apps/mobile/app.json`.

Nie włączaj na kluczu mobilnym Geocoding API, Places API ani innych web-service API.

## EAS

Dodaj nowy klucz jako zmienną sensitive dla środowisk `preview` i `production`:

```powershell
eas env:create preview --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --visibility sensitive
eas env:create production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --visibility sensitive
eas env:create preview --name EXPO_PUBLIC_API_URL --value https://api.travelpoint.app
eas env:create production --name EXPO_PUBLIC_API_URL --value https://api.travelpoint.app
```

Build release zostanie zatrzymany, jeśli klucz jest pusty, ma zły format albo API URL nie używa HTTPS.

## Weryfikacja

1. `pnpm --filter @travelpoint/mobile config:check`
2. Zbuduj preview APK przez EAS.
3. Potwierdź wyświetlanie kafelków mapy na fizycznym Androidzie.
4. Wywołanie Geocoding API historycznym kluczem musi zwracać odmowę, nie `status=OK`.
5. W Google Cloud Console potwierdź ruch wyłącznie w `Maps SDK for Android`.
