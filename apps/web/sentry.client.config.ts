import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production. In development the SDK is a no-op but
// still sets up performance monitoring integrations (replayIntegration uses
// web-vitals internally), which triggers a bug where entry.startTime is
// undefined — resulting in an Uncaught TypeError on every page navigation.
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],

    tracesSampleRate: 0.1,

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    environment: process.env.NODE_ENV,
    release: process.env['NEXT_PUBLIC_APP_VERSION'],
  });
}
