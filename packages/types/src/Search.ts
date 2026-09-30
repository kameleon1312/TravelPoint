import type { SpotCategory, AccessLevel } from './Spot';
import type { Rank, Archetype } from './Explorer';

export interface SpotSearchResult {
  id: string;
  title: string;
  category: SpotCategory;
  accessLevel: AccessLevel;
  locked: boolean;
}

export interface ExplorerSearchResult {
  id: string;
  handle: string;
  displayName?: string;
  rank: Rank;
  archetype: Archetype;
  avatarUrl?: string;
}

export interface JourneySearchResult {
  id: string;
  title: string;
  isPrivate: boolean;
  createdAt: string;
  explorer: {
    id: string;
    handle: string;
    rank: Rank;
  };
}

export interface SearchResults {
  spots: SpotSearchResult[];
  explorers: ExplorerSearchResult[];
  journeys: JourneySearchResult[];
}
