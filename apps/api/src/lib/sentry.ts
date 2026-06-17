// eslint-disable-next-line @typescript-eslint/no-require-imports
import * as Sentry from '@sentry/node';
import { env } from '../config/env';

// Initialise Sentry as early as possible (before Fastify, routes, plugins).
// When DSN is missing (local dev without Sentry) this is a no-op.
export function initSentry(): void {
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    release: env.appVersion,

    // Capture 10% of traces in production to stay within free quota.
    tracesSampleRate: env.isProduction ? 0.1 : 1.0,

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
