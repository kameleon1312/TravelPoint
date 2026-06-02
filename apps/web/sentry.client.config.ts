import * as Sentry from '@sentry/nextjs';

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

Sentry.init({
  dsn,

  // Performance — capture 10% of transactions in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay — 10% of sessions, 100% when an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Do not send errors in development (prevents noise in Sentry dashboard)
  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,
  release: process.env['NEXT_PUBLIC_APP_VERSION'],
});
