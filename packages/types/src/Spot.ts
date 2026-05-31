export type SpotCategory =
  | 'ABANDONED'
  | 'CAFE'
  | 'BEACH'
  | 'ROUTE'
  | 'UNDERGROUND'
  | 'VIEWPOINT'
  | 'CAMP';

export type AccessLevel = 'PUBLIC' | 'TRUSTED' | 'CIRCLE_ONLY' | 'SECRET_DROP';

export interface SpotPhoto {
  id: string;
  url: string;
  caption?: string;
}

export interface Spot {
  id: string;
  ownerId: string;
  title: string;
  story?: string;
  category: SpotCategory;
  lat: number;
  lng: number;
  h3Index: string;
  accessLevel: AccessLevel;
  circleId?: string;
  dropExpiresAt?: string;
  photos: SpotPhoto[];
  createdAt: string;
  updatedAt: string;
}

// Returned to non-entitled clients — exact coords replaced with fuzzed
export interface LockedSpot {
  id: string;
  title: string;
  category: SpotCategory;
  lat: number;
  lng: number;
  locked: true;
  requiredAccess: AccessLevel;
}

export type SpotForViewer = (Spot & { locked: false }) | LockedSpot;
