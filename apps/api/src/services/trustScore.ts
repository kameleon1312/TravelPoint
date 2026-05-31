import type { Rank } from '@travelpoint/types';

const RANK_THRESHOLDS: Record<Rank, number> = {
  NEWCOMER: 0,
  EXPLORER: 50,
  TRUSTED: 150,
  INSIDER: 400,
  LEGEND: 1000,
};

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
