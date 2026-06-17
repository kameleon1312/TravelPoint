import type { PrismaClient } from '@prisma/client';

type CircleMembershipStore = Pick<PrismaClient, 'circleMember'>;

export async function hasCircleMembership(
  prisma: CircleMembershipStore,
  circleId: string,
  explorerId: string,
): Promise<boolean> {
  const membership = await prisma.circleMember.findUnique({
    where: { circleId_explorerId: { circleId, explorerId } },
    select: { id: true },
  });
  return membership !== null;
}
