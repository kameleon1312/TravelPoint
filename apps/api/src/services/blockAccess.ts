import type { PrismaClient } from '@prisma/client';

export async function getBlockedExplorerIds(
  prisma: PrismaClient,
  explorerId: string,
): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: explorerId }, { blockedId: explorerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return blocks.map((block) =>
    block.blockerId === explorerId ? block.blockedId : block.blockerId);
}

export async function getAllowedCircleRecipientIds(
  prisma: PrismaClient,
  circleId: string,
  senderId: string,
): Promise<string[]> {
  const [members, blockedIds] = await Promise.all([
    prisma.circleMember.findMany({
      where: { circleId, explorerId: { not: senderId } },
      select: { explorerId: true },
    }),
    getBlockedExplorerIds(prisma, senderId),
  ]);
  const blocked = new Set(blockedIds);
  return members
    .map((member) => member.explorerId)
    .filter((explorerId) => !blocked.has(explorerId));
}
