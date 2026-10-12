// Why: a fresh random jitter per response is centred on the true point, so averaging
// repeated responses converges to the exact location (~15 m after a few thousand
// requests for a 1500 m radius). Every obfuscated coordinate must therefore be a
// single, stable sample derived from a server secret — repeat requests reveal nothing new.
import crypto from 'crypto';
import { fuzzCoordinates, haversineKm } from '@travelpoint/geo';
import { env } from '../config/env';

const FUZZ_KEY = crypto
  .createHash('sha256')
  .update(`travelpoint:geo-fuzz:v1:${env.encryptionKey ?? env.jwtAccessSecret}`)
  .digest();

function keyedSeed(label: string): number {
  return crypto.createHmac('sha256', FUZZ_KEY).update(label).digest().readUInt32BE(0);
}

// Stable per spot and per radius: different radii use independent offsets, so two
// views of the same spot cannot be combined to solve for the true point.
export function fuzzSpotCoordinates(
  spot: { id: string; lat: number; lng: number },
  radiusMeters: number,
): { lat: number; lng: number } {
  return fuzzCoordinates(spot.lat, spot.lng, radiusMeters, keyedSeed(`spot:${spot.id}:${radiusMeters}`));
}

export const PRESENCE_CELL_METERS = 1000;
export const PRESENCE_NEARBY_KM = 5;
const METERS_PER_DEG_LAT = 111_320;

// Snaps a live position to the centre of a ~1 km grid cell whose origin is shifted by a
// secret per-explorer offset. A stationary explorer always maps to the same point, and
// the offset hides where cell boundaries lie.
export function snapPresence(explorerId: string, lat: number, lng: number): { lat: number; lng: number } {
  const seed = keyedSeed(`presence:${explorerId}`);
  const offLat = (seed & 0xffff) / 0x10000;
  const offLng = (seed >>> 16) / 0x10000;

  const cellLat = PRESENCE_CELL_METERS / METERS_PER_DEG_LAT;
  const snappedLat = (Math.floor(lat / cellLat - offLat) + offLat + 0.5) * cellLat;

  const cos = Math.max(Math.cos((snappedLat * Math.PI) / 180), 0.01);
  const cellLng = PRESENCE_CELL_METERS / (METERS_PER_DEG_LAT * cos);
  const snappedLng = (Math.floor(lng / cellLng - offLng) + offLng + 0.5) * cellLng;

  return {
    lat: +Math.min(90, Math.max(-90, snappedLat)).toFixed(4),
    lng: +(((snappedLng + 540) % 360) - 180).toFixed(4),
  };
}

export const ROUTE_PRIVACY_ZONE_METERS = 500;

type LngLat = [number, number];

function dropLeadingMeters(points: LngLat[], meters: number): LngLat[] {
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const [lng1, lat1] = points[i - 1]!;
    const [lng2, lat2] = points[i]!;
    travelled += haversineKm(lat1, lng1, lat2, lng2) * 1000;
    if (travelled >= meters) return points.slice(i);
  }
  return [];
}

// Journeys usually start and end at home, so viewers other than the author get the route
// without its first and last ~500 m (Strava-style privacy zones). Lines too short to keep
// anything after trimming are removed entirely.
export function trimRouteForViewer(routeGeoJson: unknown, meters = ROUTE_PRIVACY_ZONE_METERS): unknown {
  const collection = routeGeoJson as { type?: unknown; features?: unknown } | null;
  if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) return null;

  const features = collection.features.flatMap((feature: unknown) => {
    const geometry = (feature as { geometry?: { type?: unknown; coordinates?: unknown } } | null)?.geometry;
    if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return [];
    const points = (geometry.coordinates as unknown[]).filter(
      (p): p is LngLat => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number',
    );
    const trimmed = dropLeadingMeters(dropLeadingMeters(points, meters).reverse(), meters).reverse();
    if (trimmed.length < 2) return [];
    return [{ type: 'Feature', geometry: { type: 'LineString', coordinates: trimmed }, properties: null }];
  });

  return features.length > 0 ? { type: 'FeatureCollection', features } : null;
}

export function isWithinPresenceRange(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  return haversineKm(a.lat, a.lng, b.lat, b.lng) <= PRESENCE_NEARBY_KM;
}
