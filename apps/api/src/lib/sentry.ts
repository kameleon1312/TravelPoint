// eslint-disable-next-line @typescript-eslint/no-require-imports
import * as Sentry from '@sentry/node';

const dsn = process.env['SENTRY_DSN'];

// Initialise Sentry as early as possible (before Fastify, routes, plugins).
// When DSN is missing (local dev without Sentry) this is a no-op.
export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'production',
    release:     process.env['APP_VERSION'],

    // Capture 10% of traces in production to stay within free quota.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Redact sensitive data from breadcrumbs/events — mirrors Pino redaction.
    beforeSend(event: Sentry.ErrorEvent) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>)['authorization'];
        delete (event.request.headers as Record<string, unknown>)['cookie'];
      }
      return event;
    },
  });
}

export { Sentry };
