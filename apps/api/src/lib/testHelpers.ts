import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Generuje token JWT kompatybilny z verifySupabaseJwt().
 * Używaj TYLKO w testach — nie w kodzie produkcyjnym.
 */
export function createTestToken(supabaseId: string, email = 'test@travelpoint.app'): string {
  return jwt.sign(
    { sub: supabaseId, email, role: 'authenticated', iss: 'supabase' },
    env.supabaseJwtSecret,
    { expiresIn: '1h' },
  );
}
