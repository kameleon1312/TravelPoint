export type SignalType =
  | 'NEARBY_EXPLORER'
  | 'NEARBY_SPOT'
  | 'SPOT_UNLOCKED'
  | 'SPOT_COMMENT'
  | 'CIRCLE_INVITE'
  | 'SECRET_DROP'
  | 'JOURNEY_LIKE'
  | 'TRANSMISSION'
  | 'FORUM_REPLY'
  | 'RANK_UP';

export interface SpotComment {
  id: string;
  spotId: string;
  explorerId: string;
  explorerHandle: string;
  explorerAvatarUrl?: string;
  body: string;
  createdAt: string;
}

export interface FeedItem {
  id: string;
  type: 'SPOT_CREATED' | 'JOURNEY_PUBLISHED' | 'SPOT_COMMENT' | 'REACTION_RECEIVED' | 'CIRCLE_ACTIVITY';
  actorHandle: string;
  actorAvatarUrl?: string;
  actorRank: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Signal {
  id: string;
  explorerId: string;
  type: SignalType;
  payload: Record<string, unknown>;
  createdAt: string;
  seenAt?: string;
}

export interface Transmission {
  id: string;
  senderId: string;
  recipientId?: string;
  circleId?: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface LivePresence {
  explorerId: string;
  handle: string;
  rank: string;
  // Fuzzed coordinates — never exact
  lat: number;
  lng: number;
  lastSeenAt: string;
}
