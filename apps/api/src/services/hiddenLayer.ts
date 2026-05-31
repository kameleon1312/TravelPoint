// Why: exact coordinates of a hidden spot are the product's core value AND a
// safety concern. Access is decided server-side only. The client never receives
// raw lat/lng it isn't entitled to.
import { fuzzCoordinates } from '@travelpoint/geo';
import { rankAtLeast } from '@travelpoint/types';
import type { Rank } from '@travelpoint/types';

interface SpotRow {
  id: string;
  title: string;
  story: string | null;
  category: string;
  lat: number;
  lng: number;
  h3Index: string;
  accessLevel: 'PUBLIC' | 'TRUSTED' | 'CIRCLE_ONLY' | 'SECRET_DROP';
  circleId: string | null;
  dropExpiresAt: Date | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  photos?: unknown[];
}

interface ViewerContext {
  id: string;
  rank: Rank;
  circleIds: string[];
  tier: string;
}

export type ResolvedSpot =
  | (SpotRow & { locked: false })
  | {
      id: string;
      title: string;
      category: string;
      lat: number;
      lng: number;
      locked: true;
      requiredAccess: string;
    };

function isDropActive(spot: SpotRow): boolean {
  if (!spot.dropExpiresAt) return false;
  return spot.dropExpiresAt > new Date();
}

export async function resolveSpotForViewer(
  spot: SpotRow,
  viewer: ViewerContext,
  sessionSeed: number,
  auditFn: (explorerId: string, spotId: string) => Promise<void>,
): Promise<ResolvedSpot> {
  const entitled =
    spot.accessLevel === 'PUBLIC' ||
    (spot.accessLevel === 'TRUSTED' && rankAtLeast(viewer.rank, 'TRUSTED')) ||
    (spot.accessLevel === 'CIRCLE_ONLY' &&
      spot.circleId !== null &&
      viewer.circleIds.includes(spot.circleId)) ||
    (spot.accessLevel === 'SECRET_DROP' && isDropActive(spot));

  if (entitled) {
    await auditFn(viewer.id, spot.id);
    return { ...spot, locked: false };
  }

  const fuzzed = fuzzCoordinates(spot.lat, spot.lng, 1500, sessionSeed);
  return {
    id: spot.id,
    title: spot.title,
    category: spot.category,
    lat: fuzzed.lat,
    lng: fuzzed.lng,
    locked: true,
    requiredAccess: spot.accessLevel,
  };
}
