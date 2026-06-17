import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { hasCircleMembership } from './circleAccess';

describe('hasCircleMembership', () => {
  it('allows only the explorer who belongs to the requested circle', async () => {
    const findUnique = vi.fn(async (args: {
      where: { circleId_explorerId: { circleId: string; explorerId: string } };
    }) => {
      const key = args.where.circleId_explorerId;
      return key.circleId === 'circle-a' && key.explorerId === 'member-a'
        ? { id: 'membership-a' }
        : null;
    });
    const prisma = {
      circleMember: { findUnique },
    } as unknown as Pick<PrismaClient, 'circleMember'>;

    await expect(hasCircleMembership(prisma, 'circle-a', 'member-a')).resolves.toBe(true);
    await expect(hasCircleMembership(prisma, 'circle-a', 'outsider')).resolves.toBe(false);
    await expect(hasCircleMembership(prisma, 'circle-b', 'member-a')).resolves.toBe(false);
  });
});
