import { create } from 'zustand';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '@travelpoint/theme';
import type { RouteGeoJson } from '@travelpoint/validation';

const LOCATION_TASK = 'travelpoint-background-journey';
const SESSION_FILE = `${FileSystem.documentDirectory}active-journey.json`;
let foregroundLocationSubscription: Location.LocationSubscription | null = null;

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface PersistedSession {
  journeyId: string;
  journeyTitle: string;
  startedAt: string;
  points: LocationPoint[];
}

interface RecordingResult {
  journeyId: string;
  geoJson: RouteGeoJson;
  durationMs: number;
  pointCount: number;
  distanceKm: number;
}

interface RecordingState {
  isRecording: boolean;
  journeyId: string | null;
  journeyTitle: string | null;
  startedAt: Date | null;
  points: LocationPoint[];
  startRecording: (journeyId: string, journeyTitle: string) => Promise<boolean>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;
  recoverRecording: () => Promise<void>;
  addPoint: (point: LocationPoint) => void;
}

async function readSession(): Promise<PersistedSession | null> {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(SESSION_FILE)) as PersistedSession;
  } catch {
    return null;
  }
}

async function writeSession(session: PersistedSession): Promise<void> {
  await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(session));
}

async function clearSession(): Promise<void> {
  await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
}

function haversineKm(a: LocationPoint, b: LocationPoint): number {
  const radius = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
    Math.cos(b.lat * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function buildGeoJson(points: LocationPoint[]): RouteGeoJson {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.lng, point.lat] as [number, number]),
      },
      properties: { recordedAt: new Date().toISOString(), pointCount: points.length },
    }],
  };
}

function addLocation(location: Location.LocationObject): void {
  useRecordingStore.getState().addPoint({
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    timestamp: location.timestamp,
  });
}

let taskManager: typeof import('expo-task-manager') | null = null;

try {
  // Expo Go and development clients built before expo-task-manager was added do
  // not contain its native module. Keep startup working and fall back to
  // foreground tracking until the native client is rebuilt.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  taskManager = TaskManager;
  TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
    LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data) return;
      for (const location of data.locations ?? []) addLocation(location);
    },
  );
} catch {
  taskManager = null;
}

async function canUseBackgroundTask(): Promise<boolean> {
  try {
    return taskManager ? await taskManager.isAvailableAsync() : false;
  } catch {
    return false;
  }
}

async function startForegroundTracking(): Promise<void> {
  foregroundLocationSubscription?.remove();
  foregroundLocationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5_000,
      distanceInterval: 10,
    },
    addLocation,
  );
}

async function stopTracking(): Promise<void> {
  foregroundLocationSubscription?.remove();
  foregroundLocationSubscription = null;

  if (
    await canUseBackgroundTask() &&
    await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
  ) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  journeyId: null,
  journeyTitle: null,
  startedAt: null,
  points: [],

  startRecording: async (journeyId, journeyTitle) => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') return false;
    const useBackgroundTask = await canUseBackgroundTask();

    if (useBackgroundTask) {
      const background = await Location.requestBackgroundPermissionsAsync();
      if (background.status !== 'granted') return false;
    }

    await stopTracking();
    const startedAt = new Date();
    const session = { journeyId, journeyTitle, startedAt: startedAt.toISOString(), points: [] };
    await writeSession(session);
    set({ isRecording: true, journeyId, journeyTitle, startedAt, points: [] });

    if (useBackgroundTask) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5_000,
        distanceInterval: 10,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'TravelPoint rejestruje journey',
          notificationBody: journeyTitle,
          notificationColor: Colors.aurora,
        },
      });
    } else {
      await startForegroundTracking();
    }
    return true;
  },

  stopRecording: async () => {
    const recovered = await readSession();
    const state = get();
    const journeyId = recovered?.journeyId ?? state.journeyId;
    const startedAt = recovered ? new Date(recovered.startedAt) : state.startedAt;
    const points = recovered?.points ?? state.points;
    if (!journeyId || !startedAt) return null;
    await stopTracking();
    await clearSession();
    set({ isRecording: false, journeyId: null, journeyTitle: null, startedAt: null, points: [] });
    if (points.length < 2) return null;
    let distanceKm = 0;
    for (let index = 1; index < points.length; index += 1) {
      distanceKm += haversineKm(points[index - 1]!, points[index]!);
    }
    return {
      journeyId,
      geoJson: buildGeoJson(points),
      durationMs: Date.now() - startedAt.getTime(),
      pointCount: points.length,
      distanceKm,
    };
  },

  cancelRecording: async () => {
    await stopTracking();
    await clearSession();
    set({ isRecording: false, journeyId: null, journeyTitle: null, startedAt: null, points: [] });
  },

  recoverRecording: async () => {
    const session = await readSession();
    if (!session) return;
    set({
      isRecording: true,
      journeyId: session.journeyId,
      journeyTitle: session.journeyTitle,
      startedAt: new Date(session.startedAt),
      points: session.points,
    });

    if (!await canUseBackgroundTask()) {
      const foreground = await Location.getForegroundPermissionsAsync();
      if (foreground.status === 'granted') await startForegroundTracking();
    }
  },

  addPoint: (point) => {
    set((state) => ({ points: [...state.points, point] }));
    const state = get();
    if (state.journeyId && state.journeyTitle && state.startedAt) {
      void writeSession({
        journeyId: state.journeyId,
        journeyTitle: state.journeyTitle,
        startedAt: state.startedAt.toISOString(),
        points: state.points,
      });
    }
  },
}));
