module.exports = () => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const isReleaseBuild =
    process.env.NODE_ENV === 'production' ||
    buildProfile === 'preview' ||
    buildProfile === 'production';

  if (isReleaseBuild && !apiUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is required for preview and production builds.',
    );
  }

  if (isReleaseBuild) {
    let parsedApiUrl;

    try {
      parsedApiUrl = new URL(apiUrl);
    } catch {
      throw new Error('EXPO_PUBLIC_API_URL must be a valid HTTPS URL.');
    }

    if (parsedApiUrl.protocol !== 'https:') {
      throw new Error('EXPO_PUBLIC_API_URL must be an HTTPS URL.');
    }
  }

  if (isReleaseBuild && !googleMapsApiKey) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is required for preview and production builds.',
    );
  }

  return {
    name: 'TravelPoint',
    slug: 'travelpoint',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'travelpoint',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/images/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#0A0A0F',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'io.travelpoint.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'TravelPoint uses your location to show nearby places and record active journeys.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'TravelPoint uses background location only while an active journey is being recorded.',
        UIBackgroundModes: ['location'],
      },
    },
    android: {
      package: 'io.travelpoint.app',
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#0A0A0F',
      },
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    web: {
      favicon: './assets/images/icon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'TravelPoint uses your location to show nearby places and record active journeys.',
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'TravelPoint needs access to your photos so you can add images to places and journeys.',
          cameraPermission:
            'TravelPoint needs access to your camera so you can take photos of places.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#5CB88C',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          organization: 'pawflo',
          project: 'travelpoint-mobile',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: 'fbd06b46-7ace-4d3e-bc29-6b51fcaf6453',
      },
      sentryDsn:
        process.env.EXPO_PUBLIC_SENTRY_DSN ??
        'https://51dbbb97643549599b76595c492be390@o4510573570682880.ingest.de.sentry.io/4510573571534928',
    },
    owner: 'pawflo',
  };
};
