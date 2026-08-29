export type SignalType =
  | 'NEARBY_EXPLORER'
  | 'SPOT_UNLOCKED'
  | 'CIRCLE_INVITE'
  | 'SECRET_DROP'
  | 'JOURNEY_LIKE'
  | 'TRANSMISSION'
  | 'FORUM_REPLY';

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
