import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;

export function signAccessToken(explorerId: string): string {
  return jwt.sign({ sub: explorerId, type: 'access' }, ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  });
}

export function signRefreshToken(explorerId: string): string {
  return jwt.sign({ sub: explorerId, type: 'refresh' }, REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  }) as { sub: string };
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: 'travelpoint.io',
    audience: 'travelpoint-core',
  }) as { sub: string };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
