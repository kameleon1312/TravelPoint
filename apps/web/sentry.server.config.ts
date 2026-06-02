import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],

  // Capture all server-side errors
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,
  release: process.env['NEXT_PUBLIC_APP_VERSION'],
});
