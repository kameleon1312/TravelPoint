import { create } from 'zustand';
import * as Location from 'expo-location';
import type { RouteGeoJson } from '@travelpoint/validation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface RecordingState {
  isRecording: boolean;
  journeyId: string | null;
  journeyTitle: string | null;
  startedAt: Date | null;
  points: LocationPoint[];

  startRecording: (journeyId: string, journeyTitle: string) => Promise<boolean>;
  stopRecording: () => RecordingResult | null;
  cancelRecording: () => void;
  addPoint: (point: LocationPoint) => void;
}

interface RecordingResult {
  journeyId: string;
  geoJson: RouteGeoJson;
  durationMs: number;
  pointCount: number;
  distanceKm: number;
}

// ── Location subscription stored outside Zustand (non-serialisable) ───────────

let _subscription: Location.LocationSubscription | null = null;

// ── Haversine distance helper ─────────────────────────────────────────────────

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistanceKm(points: LocationPoint[]): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineKm(
      points[i - 1]!.lat, points[i - 1]!.lng,
      points[i]!.lat,     points[i]!.lng,
    );
  }
  return dist;
}

// ── GeoJSON builder ───────────────────────────────────────────────────────────

function buildGeoJson(points: LocationPoint[]): RouteGeoJson {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: points.map((p) => [p.lng, p.lat] as [number, number]),
        },
        properties: {
          recordedAt: new Date().toISOString(),
          pointCount: points.length,
        },
      },
    ],
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording:  false,
  journeyId:    null,
  journeyTitle: null,
  startedAt:    null,
  points:       [],

  startRecording: async (journeyId, journeyTitle) => {
    // Request foreground permission first (background not needed — explorer
    // keeps the app open during a journey, like any sports tracking app).
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    // Clean up any lingering subscription before starting a new one.
    if (_subscription) {
      _subscription.remove();
      _subscription = null;
    }

    set({
      isRecording:  true,
      journeyId,
      journeyTitle,
      startedAt:    new Date(),
      points:       [],
    });

    _subscription = await Location.watchPositionAsync(
      {
        accuracy:          Location.Accuracy.BestForNavigation,
        timeInterval:      5_000,   // at most every 5 s
        distanceInterval:  10,      // only if moved ≥10 m (saves battery)
      },
      (loc) => {
        get().addPoint({
          lat:       loc.coords.latitude,
          lng:       loc.coords.longitude,
          timestamp: loc.timestamp,
        });
      },
    );

    return true;
  },

  stopRecording: () => {
    const { isRecording, journeyId, startedAt, points } = get();
    if (!isRecording || !journeyId || !startedAt) return null;

    // Tear down the location watcher.
    if (_subscription) {
      _subscription.remove();
      _subscription = null;
    }

    set({ isRecording: false, journeyId: null, journeyTitle: null, startedAt: null, points: [] });

    if (points.length < 2) return null;

    return {
      journeyId,
      geoJson:     buildGeoJson(points),
      durationMs:  Date.now() - startedAt.getTime(),
      pointCount:  points.length,
      distanceKm:  totalDistanceKm(points),
    };
  },

  cancelRecording: () => {
    if (_subscription) {
      _subscription.remove();
      _subscription = null;
    }
    set({ isRecording: false, journeyId: null, journeyTitle: null, startedAt: null, points: [] });
  },

  addPoint: (point) =>
    set((state) => ({ points: [...state.points, point] })),
}));
