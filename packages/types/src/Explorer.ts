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

export const RANK_THRESHOLDS: Record<Rank, { next: Rank | null; required: number }> = {
  NEWCOMER: { next: 'EXPLORER', required: 50 },
  EXPLORER: { next: 'TRUSTED',  required: 150 },
  TRUSTED:  { next: 'INSIDER',  required: 400 },
  INSIDER:  { next: 'LEGEND',   required: 1000 },
  LEGEND:   { next: null,       required: 1000 },
};

export const RANK_START: Record<Rank, number> = {
  NEWCOMER: 0,
  EXPLORER: 50,
  TRUSTED:  150,
  INSIDER:  400,
  LEGEND:   1000,
};

export const RANK_LABELS: Record<Rank, string> = {
  NEWCOMER: 'Nowicjusz',
  EXPLORER: 'Explorer',
  TRUSTED:  'Zaufany',
  INSIDER:  'Wtajemniczony',
  LEGEND:   'Legenda',
};

export const TIER_ORDER: Record<Tier, number> = { FREE: 0, PRO: 1, EXPEDITION: 2 };

export function tierAtLeast(tier: Tier, minimum: Tier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[minimum];
}

// Paid plan required to see a spot unlocked. Rank is prestige and invite power, not access.
export const ACCESS_LEVEL_TIER = {
  PUBLIC: 'FREE',
  TRUSTED: 'PRO',
  SECRET_DROP: 'EXPEDITION',
} as const satisfies Record<'PUBLIC' | 'TRUSTED' | 'SECRET_DROP', Tier>;

export function rankAtLeast(rank: Rank, minimum: Rank): boolean {
  return RANK_ORDER[rank] >= RANK_ORDER[minimum];
}
