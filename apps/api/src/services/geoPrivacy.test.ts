import { haversineKm } from '@travelpoint/geo';
import { describe, expect, it } from 'vitest';
import { fuzzSpotCoordinates, isWithinPresenceRange, snapPresence } from './geoPrivacy';

const spot = { id: 'spot-a', lat: 50.0614, lng: 19.9383 };

describe('fuzzSpotCoordinates', () => {
  it('returns the same point on every call, so responses cannot be averaged', () => {
    const samples = Array.from({ length: 50 }, () => fuzzSpotCoordinates(spot, 1500));
    expect(new Set(samples.map((s) => `${s.lat},${s.lng}`)).size).toBe(1);
  });

  it('stays within the radius and actually moves the point', () => {
    const fuzzed = fuzzSpotCoordinates(spot, 500);
    const meters = haversineKm(spot.lat, spot.lng, fuzzed.lat, fuzzed.lng) * 1000;
    expect(meters).toBeLessThanOrEqual(520); // radius + 4-decimal rounding
    expect(fuzzed).not.toEqual({ lat: spot.lat, lng: spot.lng });
  });

  it('uses independent offsets per spot and per radius', () => {
    expect(fuzzSpotCoordinates(spot, 500)).not.toEqual(fuzzSpotCoordinates({ ...spot, id: 'spot-b' }, 500));
    const small = fuzzSpotCoordinates(spot, 500);
    const large = fuzzSpotCoordinates(spot, 1500);
    // Same direction scaled 3x would let (3*small - large) / 2 recover the true point.
    const recoveredLat = (3 * small.lat - large.lat) / 2;
    const recoveredLng = (3 * small.lng - large.lng) / 2;
    expect(haversineKm(spot.lat, spot.lng, recoveredLat, recoveredLng) * 1000).toBeGreaterThan(50);
  });
});

describe('snapPresence', () => {
  it('maps a stationary explorer to one stable point despite GPS jitter', () => {
    const base = snapPresence('exp-1', 50.0614, 19.9383);
    expect(snapPresence('exp-1', 50.0614, 19.9383)).toEqual(base);
    const jittered = snapPresence('exp-1', 50.06142, 19.93833);
    expect(haversineKm(base.lat, base.lng, jittered.lat, jittered.lng)).toBeLessThan(1.5);
  });

  it('never reveals the position more precisely than the grid cell', () => {
    for (const [lat, lng] of [[50.0614, 19.9383], [-33.8688, 151.2093], [64.1466, -21.9426]] as const) {
      const snapped = snapPresence('exp-2', lat, lng);
      expect(haversineKm(lat, lng, snapped.lat, snapped.lng) * 1000).toBeLessThan(760);
    }
  });
});

describe('isWithinPresenceRange', () => {
  it('limits presence to explorers within 5 km', () => {
    expect(isWithinPresenceRange({ lat: 50.0614, lng: 19.9383 }, { lat: 50.07, lng: 19.95 })).toBe(true);
    expect(isWithinPresenceRange({ lat: 50.0614, lng: 19.9383 }, { lat: 52.2297, lng: 21.0122 })).toBe(false);
  });
});
