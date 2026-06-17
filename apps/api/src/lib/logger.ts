import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      // Auth headers & credentials — never in logs
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.email',
      'req.body.inviteCode',

      // Cryptographic material — must never appear in plaintext
      '*.passwordHash',
      '*.tokenHash',
      '*.homeBaseEnc',
      '*.pushToken',

      // PII — contact & identity
      '*.email',
      '*.phone',

      // Geo — NEVER logged per privacy rules (CLAUDE.md #1)
      '*.lat',
      '*.lng',
      '*.latitude',
      '*.longitude',
      '*.locationLat',
      '*.locationLng',
      '*.coords',
      '*.coordinate',
      '*.coordinates',
      '*.routeGeoJson',
      '*.homeBase',
    ],
    censor: '[REDACTED]',
  },
});
