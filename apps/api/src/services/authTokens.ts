import crypto from 'crypto';
import type { AuthTokenType, PrismaClient } from '@prisma/client';

export function hashAuthToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueAuthToken(
  prisma: PrismaClient,
  explorerId: string,
  type: AuthTokenType,
  ttlMs: number,
): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { explorerId, type, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.authToken.create({
      data: {
        explorerId,
        type,
        tokenHash: hashAuthToken(token),
        expiresAt: new Date(now.getTime() + ttlMs),
      },
    }),
  ]);
  return token;
}
