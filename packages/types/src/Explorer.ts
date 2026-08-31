export type Archetype = 'WANDERER' | 'URBEXER' | 'NOMAD' | 'HUNTER' | 'PILGRIM';
export type Rank = 'NEWCOMER' | 'EXPLORER' | 'TRUSTED' | 'INSIDER' | 'LEGEND';
export type Tier = 'FREE' | 'PRO' | 'EXPEDITION';

export interface HomeBase {
  lat: number;
  lng: number;
}

export interface Explorer {
  id: string;
  email: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  archetype: Archetype;
  bio?: string;
  obsessions: string[];
  territories: string[];
  trustScore: number;
  rank: Rank;
  tier: Tier;
  tierExpiresAt?: string;
  locationConsent: boolean;
  presenceConsent: boolean;
  homeBase?: HomeBase;
  emailVerified: boolean;
  invitedById?: string;
  consentTerms: string;
  consentPrivacy: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}

export interface ExplorerPublicProfile {
  id: string;
  handle: string;
  displayName?: string;
  archetype: Archetype;
  bio?: string;
  obsessions: string[];
  rank: Rank;
}

export const TierLimits = {
  FREE: { savedWorlds: 25, journeys: 3, circlesOwned: 0, hiddenAccess: 'public' },
  PRO: { savedWorlds: Infinity, journeys: Infinity, circlesOwned: 0, hiddenAccess: 'trusted' },
  EXPEDITION: { savedWorlds: Infinity, journeys: Infinity, circlesOwned: 5, hiddenAccess: 'all' },
} as const;

export const RANK_ORDER: Record<Rank, number> = {
  NEWCOMER: 0,
  EXPLORER: 1,
  TRUSTED: 2,
  INSIDER: 3,
  LEGEND: 4,
};

export function rankAtLeast(rank: Rank, minimum: Rank): boolean {
  return RANK_ORDER[rank] >= RANK_ORDER[minimum];
}
