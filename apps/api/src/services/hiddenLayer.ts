// Why: exact coordinates of a hidden spot are the product's core value AND a
// safety concern. Access is decided server-side only. The client never receives
// raw lat/lng it isn't entitled to.
import { ACCESS_LEVEL_TIER, tierAtLeast } from '@travelpoint/types';
import { fuzzSpotCoordinates } from './geoPrivacy';
import type { Rank, Tier } from '@travelpoint/types';

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
  tier: Tier;
}

// Single source for "may this plan see this access level unlocked" (CIRCLE_ONLY is membership-based).
export function tierUnlocks(tier: Tier, accessLevel: SpotRow['accessLevel']): boolean {
  if (accessLevel === 'CIRCLE_ONLY') return false;
  return tierAtLeast(tier, ACCESS_LEVEL_TIER[accessLevel]);
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

export function isDropActive(spot: Pick<SpotRow, 'dropExpiresAt'>, now = new Date()): boolean {
  if (!spot.dropExpiresAt) return false;
  return spot.dropExpiresAt > now;
}

export async function resolveSpotForViewer(
  spot: SpotRow,
  viewer: ViewerContext,
  auditFn: (explorerId: string, spotId: string) => Promise<void>,
): Promise<ResolvedSpot | null> {
  // Expired drops are removed from discovery entirely, including for the
  // creator. Keeping them addressable would turn an expiry into a UI-only rule.
  if (spot.accessLevel === 'SECRET_DROP' && !isDropActive(spot)) {
    return null;
  }

  // Circle-only spots do not exist outside their circle. Returning even a
  // fuzzed pin would disclose the circle's activity and spot metadata.
  if (
    spot.accessLevel === 'CIRCLE_ONLY' &&
    spot.ownerId !== viewer.id &&
    (spot.circleId === null || !viewer.circleIds.includes(spot.circleId))
  ) {
    return null;
  }

  const entitled =
    spot.ownerId === viewer.id ||            // owner always sees their own spot
    (spot.accessLevel === 'CIRCLE_ONLY' &&
      spot.circleId !== null &&
      viewer.circleIds.includes(spot.circleId)) ||
    tierUnlocks(viewer.tier, spot.accessLevel);

  if (entitled) {
    await auditFn(viewer.id, spot.id);
    return { ...spot, locked: false };
  }

  const fuzzed = fuzzSpotCoordinates(spot, 1500);
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
