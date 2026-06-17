import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export function signAccessToken(explorerId: string): string {
  return jwt.sign({ sub: explorerId, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  });
}

export function signRefreshToken(explorerId: string): string {
  return jwt.sign({ sub: explorerId, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtAccessSecret, {
    algorithms: ['HS256'],
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  }) as { sub: string };
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtRefreshSecret, {
    algorithms: ['HS256'],
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  }) as { sub: string };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
