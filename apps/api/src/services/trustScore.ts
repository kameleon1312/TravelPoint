import type { PrismaClient } from '@prisma/client';
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
  INVITE_JOINED: 20,
  JOURNEY_PUBLISHED: 8,
  WEEK_ACTIVE: 2,
} as const;

export async function addTrustPoints(
  prisma: PrismaClient,
  explorerId: string,
  points: number,
): Promise<void> {
  const explorer = await prisma.explorer.findUnique({
    where: { id: explorerId },
    select: { trustScore: true },
  });
  if (!explorer) return;

  const newScore = explorer.trustScore + points;
  const newRank = computeRank(newScore);

  await prisma.explorer.update({
    where: { id: explorerId },
    data: { trustScore: newScore, rank: newRank },
  });
}
