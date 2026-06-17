import type { Prisma, PrismaClient, TrustEventType } from '@prisma/client';
import type { Rank } from '@travelpoint/types';
export type { PrismaClient };

const RANK_THRESHOLDS = {
  NEWCOMER: 0,
  EXPLORER: 50,
  TRUSTED: 150,
  INSIDER: 400,
  LEGEND: 1000,
} satisfies Record<Rank, number>;

export function computeRank(trustScore: number): Rank {
  if (trustScore >= RANK_THRESHOLDS.LEGEND) return 'LEGEND';
  if (trustScore >= RANK_THRESHOLDS.INSIDER) return 'INSIDER';
  if (trustScore >= RANK_THRESHOLDS.TRUSTED) return 'TRUSTED';
  if (trustScore >= RANK_THRESHOLDS.EXPLORER) return 'EXPLORER';
  return 'NEWCOMER';
}

export const TrustPoints = {
  SPOT_CREATED: 5,
  SPOT_VERIFIED: 15,
  CIRCLE_REACTION: 3,
  PHOTO_ADDED: 5,
  INVITE_JOINED: 20,
  JOURNEY_PUBLISHED: 8,
  WEEK_ACTIVE: 2,
} as const;

export async function addTrustPoints(
  prisma: PrismaClient,
  explorerId: string,
  points: number,
  type: TrustEventType,
  referenceId?: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (referenceId) {
      const existing = await tx.trustEvent.findFirst({ where: { explorerId, type, referenceId } });
      if (existing) return;
    }
    const explorer = await tx.explorer.update({
      where: { id: explorerId },
      data: { trustScore: { increment: points } },
      select: { trustScore: true, rank: true },
    });
    const rank = computeRank(explorer.trustScore);
    await tx.explorer.update({ where: { id: explorerId }, data: { rank } });
    await tx.trustEvent.create({
      data: {
        explorerId,
        type,
        delta: points,
        scoreAfter: explorer.trustScore,
        rankAfter: rank,
        referenceId,
        metadata,
      },
    });
    if (explorer.rank !== rank) {
      await tx.signal.create({
        data: {
          explorerId,
          type: 'SPOT_UNLOCKED',
          dedupeKey: `rank-unlocked:${explorerId}:${rank}`,
          payload: { rank, trustScore: explorer.trustScore },
        },
      });
    }
  });
}

export async function setExplorerTier(
  prisma: PrismaClient,
  explorerId: string,
  toTier: 'FREE' | 'PRO' | 'EXPEDITION',
  reason: string,
  tierExpiresAt?: Date | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const explorer = await tx.explorer.findUnique({ where: { id: explorerId }, select: { tier: true } });
    if (!explorer || explorer.tier === toTier) return;
    await tx.explorer.update({ where: { id: explorerId }, data: { tier: toTier, tierExpiresAt } });
    await tx.tierEvent.create({
      data: { explorerId, fromTier: explorer.tier, toTier, reason: reason.slice(0, 120) },
    });
  });
}
