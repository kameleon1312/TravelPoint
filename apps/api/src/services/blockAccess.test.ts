import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { getAllowedCircleRecipientIds } from './blockAccess';

describe('getAllowedCircleRecipientIds', () => {
  it('excludes blocked relationships from circle realtime recipients', async () => {
    const prisma = {
      circleMember: {
        findMany: vi.fn(async () => [
          { explorerId: 'allowed' },
          { explorerId: 'blocked-by-sender' },
          { explorerId: 'blocked-sender' },
        ]),
      },
      block: {
        findMany: vi.fn(async () => [
          { blockerId: 'sender', blockedId: 'blocked-by-sender' },
          { blockerId: 'blocked-sender', blockedId: 'sender' },
        ]),
      },
    } as unknown as PrismaClient;

    await expect(
      getAllowedCircleRecipientIds(prisma, 'circle-a', 'sender'),
    ).resolves.toEqual(['allowed']);
  });
});
