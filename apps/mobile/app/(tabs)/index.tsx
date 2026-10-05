import {
  View, Text, StyleSheet, Platform, Pressable, Alert,
  Modal, TextInput, KeyboardAvoidingView, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence,
  withTiming, withSpring, FadeIn, FadeOut,
} from 'react-native-reanimated';
import Supercluster from 'supercluster';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Shadow, BorderRadius } from '@travelpoint/theme';
import { NATURAL_HARMONY_STYLE } from '@/constants/mapStyle';

const TOP_BAR_HEIGHT = 56;
import { SignalButton } from '@/components/ui/SignalButton';
import { SpotPreviewSheet } from '@/components/map/SpotPreviewSheet';
import { pl } from '@/i18n/pl';
import { useNearbySpots } from '@/hooks/useSpots';
import { useAuthStore } from '@/stores/auth';
import { useRecordingStore } from '@/stores/recording';
import { useCreateJourney, useUpdateJourney } from '@/hooks/useJourneys';
import { socketManager } from '@/lib/socket';
import { api } from '@/lib/api';
import type { SpotForViewer } from '@travelpoint/types';

const ACCESS_PIN_COLORS: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

const SPOT_CATEGORIES = ['ABANDONED', 'CAFE', 'BEACH', 'ROUTE', 'UNDERGROUND', 'VIEWPOINT', 'CAMP'] as const;

const IDLE_WARN_MS      = 3  * 60 * 1000;
const IDLE_AUTO_STOP_MS = 10 * 60 * 1000;

function accuracyColor(acc: number | null): string {
  if (acc === null)  return Colors.starGhost;
  if (acc < 15)      return Colors.aurora;
  if (acc < 40)      return Colors.sand;
  return Colors.ember;
}
const CHIP_ICONS: Record<string, string> = {
  ABANDONED: '◈', CAFE: '◎', BEACH: '◎',
  ROUTE: '◉', UNDERGROUND: '◈', VIEWPOINT: '◎', CAMP: '◉',
};

// ── Category filter chips ─────────────────────────────────────────────────────
function CategoryChips({ active, onChange, top }: { active: string | null; onChange: (cat: string | null) => void; top: number }) {
  const cats = pl.spotCategories as Record<string, string>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.chipRow, { top }]}
      contentContainerStyle={styles.chipRowContent}
    >
      <Pressable
        style={[styles.chip, active === null && styles.chipActive]}
        onPress={() => onChange(null)}
        hitSlop={4}
      >
        <Text style={[styles.chipText, active === null && styles.chipTextActive]}>◉ Wszystkie</Text>
      </Pressable>
      {SPOT_CATEGORIES.map((cat) => (
        <Pressable
          key={cat}
          style={[styles.chip, active === cat && styles.chipActive]}
          onPress={() => onChange(active === cat ? null : cat)}
          hitSlop={4}
        >
          <Text style={[styles.chipText, active === cat && styles.chipTextActive]}>
            {CHIP_ICONS[cat]}{'  '}{cats[cat] ?? cat}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ── Secret drop pulsing pin ───────────────────────────────────────────────────
function SecretDropPin({ countdown }: { countdown?: string }) {
  const ring = useSharedValue(1);

  useEffect(() => {
    ring.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 700 }),
        withTiming(1,   { duration: 700 }),
      ),
      -1,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: Math.max(0, 2.5 - ring.value),
  }));

  return (
    <View style={styles.secretDropWrapper}>
      <Animated.View style={[styles.secretPulseRing, ringStyle]} />
      <View style={[styles.spotPin, { backgroundColor: Colors.ember }]} />
      {countdown ? (
        <View style={[styles.ephemeralBadge, { borderColor: Colors.ember, marginTop: 2 }]}>
          <Text style={[styles.ephemeralText, { color: Colors.ember }]}>{countdown}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Cluster count pin ─────────────────────────────────────────────────────────
function ClusterPin({ count }: { count: number }) {
  return (
    <View style={styles.clusterPin}>
      <Text style={styles.clusterCount}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}


const DEFAULT_REGION: Region = {
  latitude:      52.2297,
  longitude:     21.0122,
  latitudeDelta: 0.6,
  longitudeDelta: 0.6,
};

interface NearbyExplorer {
  explorerId: string;
  lat: number;
  lng: number;
}

function formatDropCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Presence indicator ────────────────────────────────────────────────────────
function PresenceToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.5, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [active]);

  return (
    <Pressable
      style={[styles.presenceIndicator, active && styles.presenceIndicatorActive]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={active ? pl.presence.presenceActive : pl.presence.presenceOff}
    >
      <Animated.View
        style={[
          styles.presenceDot,
          { backgroundColor: active ? Colors.aurora : Colors.starGhost },
          dotStyle,
        ]}
      />
      <Text style={[styles.presenceText, active && { color: Colors.aurora }]}>
        {active ? pl.presence.presenceActive : pl.presence.presenceOff}
      </Text>
    </Pressable>
  );
}

// ── Recording status bar (shown at top while GPS active) ──────────────────────
function RecordingBar({
  startedAt,
  pointCount,
  accuracy,
  lastPointAt,
  onStop,
  onCancel,
}: {
  startedAt: Date;
  pointCount: number;
  accuracy: number | null;
  lastPointAt: number | null;
  onStop:   () => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [idleMs, setIdleMs]   = useState(0);
  const dot = useSharedValue(1);

  const lastPointAtRef = useRef(lastPointAt);
  useEffect(() => { lastPointAtRef.current = lastPointAt; }, [lastPointAt]);

  useEffect(() => {
    dot.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
    );
    const id = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - startedAt.getTime()) / 1000));
      if (lastPointAtRef.current !== null) {
        setIdleMs(now - lastPointAtRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-stop: fires IDLE_AUTO_STOP_MS after the last received GPS point
  useEffect(() => {
    if (lastPointAt === null || pointCount < 2) return;
    const remaining = IDLE_AUTO_STOP_MS - (Date.now() - lastPointAt);
    if (remaining <= 0) { onStop(); return; }
    const id = setTimeout(onStop, remaining);
    return () => clearTimeout(id);
  }, [lastPointAt, pointCount, onStop]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  const mm  = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss  = String(elapsed % 60).padStart(2, '0');
  const acc = accuracyColor(accuracy);
  const isIdle = idleMs > IDLE_WARN_MS;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={[styles.recordingBar, isIdle && styles.recordingBarIdle]}>
      <Animated.View style={[styles.recordingDot, dotStyle]} />
      <Text style={styles.recordingTime}>{mm}:{ss}</Text>

      {/* GPS accuracy + point count */}
      <View style={styles.recordingMeta}>
        <Text style={styles.recordingPts}>{pointCount} pkt</Text>
        <View style={styles.accuracyBadge}>
          <View style={[styles.accuracyDot, { backgroundColor: acc }]} />
          <Text style={[styles.accuracyText, { color: acc }]}>
            {accuracy !== null ? `${Math.round(accuracy)}m` : '---'}
          </Text>
        </View>
      </View>

      {/* Idle warning label */}
      {isIdle && (
        <Text style={styles.idleText}>
          ⏸{Math.floor(idleMs / 60000)}m
        </Text>
      )}

      <View style={styles.recordingActions}>
        <Pressable style={styles.recordingCancelBtn} onPress={onCancel} hitSlop={8}>
          <Text style={styles.recordingCancelText}>✕</Text>
        </Pressable>
        <Pressable style={styles.recordingStopBtn} onPress={onStop}>
          <Text style={styles.recordingStopText}>{pl.recording.stopBtn}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Quick-create journey modal ────────────────────────────────────────────────
function StartJourneyModal({
  visible,
  onClose,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  onStart: (title: string) => Promise<void>;
}) {
  const modalInsets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setTitle('');
    onClose();
  }

  async function handleStart() {
    const t = title.trim();
    if (t.length < 2) return;
    setLoading(true);
    try {
      await onStart(t);
      setTitle('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.modalSheet, { paddingBottom: Math.max(modalInsets.bottom, Spacing.xl) }]}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalEyebrow}>GPS · Nagraj wyprawę</Text>
          <Text style={styles.modalTitle}>{pl.recording.startRecording}</Text>
          <Text style={styles.modalSub}>
            Twoja trasa zostanie nagrana i zapisana do journey.
            Punkty GPS co 10 m lub 5 s.
          </Text>

          <Text style={styles.modalLabel}>{pl.recording.journeyNameLabel}</Text>
          <TextInput
            style={styles.modalInput}
            placeholder={pl.recording.journeyNameHint}
            placeholderTextColor={Colors.starGhost}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleStart}
          />

          <View style={styles.modalActions}>
            <SignalButton
              label={pl.common.cancel}
              onPress={handleClose}
              variant="ghost"
              size="md"
              haptic="light"
            />
            <SignalButton
              label={pl.recording.startBtn}
              onPress={handleStart}
              variant="ember"
              size="md"
              loading={loading}
              disabled={title.trim().length < 2}
              haptic="heavy"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AtlasScreen() {
  const { explorer, setExplorer } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [region, setRegion]                 = useState<Region>(DEFAULT_REGION);
  const [presenceActive, setPresenceActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [nearbyExplorers, setNearbyExplorers] = useState<NearbyExplorer[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [previewSpot, setPreviewSpot]       = useState<SpotForViewer | null>(null);
  const [mapError, setMapError]             = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const mapReadyRef   = useRef(false);
  const mapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clusterIndex = useRef(
    new Supercluster<{ cluster: false; spotId: string; spot: SpotForViewer }>({ radius: 60, maxZoom: 16, minPoints: 3 }),
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    mapTimeoutRef.current = setTimeout(() => {
      if (!mapReadyRef.current) setMapError(true);
    }, 12000);
    return () => { if (mapTimeoutRef.current) clearTimeout(mapTimeoutRef.current); };
  }, []);

  const mapRef = useRef<MapView>(null);

  // Recording state
  const {
    isRecording, startedAt, points, accuracy, lastPointAt,
    startRecording, stopRecording, cancelRecording,
  } = useRecordingStore();

  // Fetch nearby spots only when the user has both granted device permission AND
  // explicitly consented to location usage. Toggling locationConsent in Identity
  // immediately disables/enables this query without restarting the app.
  const locationActive = locationGranted && (explorer?.locationConsent ?? false);
  const { data: spots } = useNearbySpots(
    locationActive ? region.latitude  : null,
    locationActive ? region.longitude : null,
  );

  const { mutateAsync: createJourney } = useCreateJourney();
  const { mutateAsync: updateJourney } = useUpdateJourney();

  // ── Clustering ────────────────────────────────────────────────────────────────
  const filteredSpots = useMemo(() => {
    if (!spots) return [] as SpotForViewer[];
    if (!activeCategory) return spots as SpotForViewer[];
    return (spots as SpotForViewer[]).filter((s) => {
      const cat = 'category' in s ? (s as { category: string }).category : null;
      return cat === activeCategory;
    });
  }, [spots, activeCategory]);

  const mapClusters = useMemo(() => {
    if (filteredSpots.length === 0) return [];
    clusterIndex.current.load(
      filteredSpots.map((spot) => ({
        type:       'Feature' as const,
        geometry:   { type: 'Point' as const, coordinates: [spot.lng, spot.lat] as [number, number] },
        properties: { cluster: false as const, spotId: spot.id, spot },
      })),
    );
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const bounds: [number, number, number, number] = [
      longitude - longitudeDelta / 2,
      latitude  - latitudeDelta  / 2,
      longitude + longitudeDelta / 2,
      latitude  + latitudeDelta  / 2,
    ];
    const zoom = Math.min(20, Math.max(0, Math.round(Math.log2(360 / latitudeDelta))));
    return clusterIndex.current.getClusters(bounds, zoom);
  }, [region, filteredSpots]);

  function handleClusterPress(clusterId: number, lat: number, lng: number) {
    const zoom = clusterIndex.current.getClusterExpansionZoom(clusterId);
    const delta = 360 / Math.pow(2, zoom);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
      400,
    );
  }

  // ── Socket: nearby explorers via presence ────────────────────────────────────
  useEffect(() => {
    const handler = (data: unknown) => {
      const e = data as NearbyExplorer;
      if (!e.explorerId || e.explorerId === explorer?.id) return;
      setNearbyExplorers((prev) => {
        const filtered = prev.filter((p) => p.explorerId !== e.explorerId);
        return [...filtered, e].slice(-20);
      });
    };
    socketManager.on('explorer:nearby', handler);
    return () => socketManager.off('explorer:nearby', handler);
  }, [explorer?.id]);

  // ── Location ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    void syncLocationState();
  }, [explorer?.locationConsent]);

  useEffect(() => {
    if (!locationGranted) return;
    if (presenceActive) {
      socketManager.emit('presence:enable', { lat: region.latitude, lng: region.longitude });
    } else {
      socketManager.emit('presence:disable');
      setNearbyExplorers([]);
    }
  }, [presenceActive, locationGranted]);

  async function syncLocationState() {
    const current = await Location.getForegroundPermissionsAsync();
    if (!explorer?.locationConsent) {
      setLocationGranted(current.status === 'granted');
      return;
    }
    if (current.status !== 'granted') {
      setLocationGranted(false);
      if (explorer?.locationConsent) await requestLocation();
      return;
    }
    await loadCurrentLocation();
  }

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationGranted(false);
      return;
    }
    await loadCurrentLocation();
  }

  async function loadCurrentLocation() {
    setLocationGranted(true);
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    const newRegion: Region = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1200);
  }

  async function grantLocationConsent() {
    if (!explorer) return;
    try {
      await api.patch('/api/explorers/me', { locationConsent: true });
      setExplorer({ ...explorer, locationConsent: true });
      await requestLocation();
    } catch {
      Alert.alert(pl.common.error, 'Nie udało się zapisać zgody na lokalizację.');
    }
  }

  // ── Prompt for location on first login ───────────────────────────────────────
  useEffect(() => {
    if (!explorer) return;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted' && !explorer.locationConsent) {
        await grantLocationConsent();
      } else if (status === 'undetermined') {
        Alert.alert(
          'Pokaż swoją pozycję na mapie',
          'TravelPoint użyje lokalizacji, żeby wycentrować mapę i pokazać spoty w pobliżu. Twoja pozycja publiczna jest zawsze zaokrąglana o co najmniej 500 m.',
          [
            { text: 'Teraz nie', style: 'cancel' },
            { text: 'Włącz lokalizację', onPress: () => void grantLocationConsent() },
          ],
        );
      }
    })();
  }, [explorer?.id]);

  // ── Presence consent ─────────────────────────────────────────────────────────
  async function grantPresenceConsent() {
    try {
      await api.patch('/api/explorers/me', { presenceConsent: true });
      setExplorer({ ...explorer!, presenceConsent: true });
      setPresenceActive(true);
    } catch {
      Alert.alert(pl.common.error, 'Nie udało się zapisać zgody na presence.');
    }
  }

  function togglePresence() {
    if (!locationActive) {
      if (explorer?.locationConsent) {
        void requestLocation();
      } else {
        Alert.alert(
          'Włącz lokalizację',
          'TravelPoint użyje lokalizacji do pokazania spotów w pobliżu. Presence pozostaje osobną zgodą, a Twoja pozycja publiczna jest przybliżana o co najmniej 500 m.',
          [
            { text: 'Anuluj', style: 'cancel' },
            { text: 'Zgadzam się', onPress: () => void grantLocationConsent() },
          ],
        );
      }
      return;
    }

    if (!presenceActive && !explorer?.presenceConsent) {
      // First activation — require explicit consent.
      Alert.alert(
        'Presence — bądź widoczny na mapie',
        'Inni exploratorzy zobaczą Cię jako sygnał na mapie. Twoja lokalizacja jest zawsze przybliżona (±500m). Możesz wyłączyć presence w każdej chwili.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Włącz Presence', onPress: () => void grantPresenceConsent() },
        ],
      );
      return;
    }

    if (presenceActive && explorer) {
      // Turning OFF — revoke consent in server so Identity screen reflects the real state.
      // Capture explorer in a local const so the async closure can't see a stale null.
      const snap = explorer;
      void (async () => {
        try {
          await api.patch('/api/explorers/me', { presenceConsent: false });
          setExplorer({ ...snap, presenceConsent: false });
        } catch { /* non-fatal */ }
      })();
    }

    setPresenceActive((v) => !v);
  }

  // ── GPS Recording ─────────────────────────────────────────────────────────────
  async function handleStartJourney(title: string) {
    setShowStartModal(false);

    // Create the journey in DB first so we have an ID to record to.
    let journeyId: string;
    try {
      const journey = await createJourney({ title, isPrivate: true });
      journeyId = (journey as { id: string }).id;
    } catch {
      Alert.alert(pl.common.error, 'Nie udało się utworzyć journey.');
      return;
    }

    const started = await startRecording(journeyId, title);
    if (!started) {
      Alert.alert(
        pl.recording.locationRequired,
        pl.recording.locationDeniedMsg,
      );
    }
  }

  async function handleStopRecording() {
    const result = await stopRecording();

    if (!result) {
      Alert.alert('Wyprawa', pl.recording.tooFewPoints);
      return;
    }

    try {
      await updateJourney({ id: result.journeyId, data: { routeGeoJson: result.geoJson } });
      Alert.alert(
        pl.recording.savedTitle,
        pl.recording.savedBody(result.pointCount, result.distanceKm),
        [
          { text: 'Zamknij' },
          {
            text: 'Zobacz Journey',
            onPress: () => router.push(`/journey/${result.journeyId}`),
          },
        ],
      );
    } catch {
      Alert.alert(pl.common.error, pl.recording.saveFailed);
    }
  }

  function handleCancelRecording() {
    Alert.alert(
      pl.recording.cancelTitle,
      pl.recording.cancelMsg,
      [
        { text: 'Kontynuuj nagrywanie', style: 'cancel' },
        { text: pl.recording.cancelConfirm, style: 'destructive', onPress: cancelRecording },
      ],
    );
  }

  function centerOnMe() {
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(({ coords }) => {
        const r: Region = { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 800);
      })
      .catch(() => {});
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {Platform.OS !== 'web' ? (
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          initialRegion={DEFAULT_REGION}
          showsUserLocation={locationActive}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsBuildings={false}
          mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
          customMapStyle={Platform.OS === 'android' ? NATURAL_HARMONY_STYLE : undefined}
          onRegionChangeComplete={setRegion}
          onMapReady={() => {
            mapReadyRef.current = true;
            setMapError(false);
            if (mapTimeoutRef.current) clearTimeout(mapTimeoutRef.current);
          }}
        >
          {/* Spot pins — clustered */}
          {mapClusters.map((item) => {
            const coords = item.geometry.coordinates as [number, number];
            const lng = coords[0];
            const lat = coords[1];
            const props = item.properties;

            if ('cluster' in props && props.cluster) {
              const { cluster_id, point_count } = props as { cluster: true; cluster_id: number; point_count: number };
              return (
                <Marker
                  key={`cluster-${cluster_id}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  onPress={() => handleClusterPress(cluster_id, lat, lng)}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <ClusterPin count={point_count} />
                </Marker>
              );
            }

            const { spot } = props as { cluster: false; spotId: string; spot: SpotForViewer };
            const isLocked    = 'locked' in spot ? spot.locked : false;
            const accessLevel = 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC';
            const isSecretDrop = accessLevel === 'SECRET_DROP' && !isLocked;
            const color        = isLocked ? Colors.starGhost : (ACCESS_PIN_COLORS[accessLevel] ?? Colors.aurora);
            const countdown    = 'dropExpiresAt' in spot && spot.dropExpiresAt ? formatDropCountdown(spot.dropExpiresAt) : '';

            return (
              <Marker
                key={spot.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => setPreviewSpot(spot)}
                anchor={{ x: 0.5, y: countdown ? 1 : 0.5 }}
                tracksViewChanges={isSecretDrop}
              >
                {isSecretDrop ? (
                  <SecretDropPin countdown={countdown} />
                ) : (
                  <View style={styles.pinWrapper}>
                    <View style={[styles.spotPin, { backgroundColor: color, opacity: isLocked ? 0.6 : 1 }]} />
                    {countdown !== '' && (
                      <View style={[styles.ephemeralBadge, { borderColor: color }]}>
                        <Text style={[styles.ephemeralText, { color }]}>{countdown}</Text>
                      </View>
                    )}
                  </View>
                )}
              </Marker>
            );
          })}

          {/* Presence pins */}
          {presenceActive && nearbyExplorers.map((e) => (
            <Marker key={e.explorerId} coordinate={{ latitude: e.lat, longitude: e.lng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.presenceOuter}>
                <View style={styles.presenceInner} />
              </View>
            </Marker>
          ))}

          {/* Live GPS trace while recording */}
          {isRecording && points.length > 1 && (
            <>
              <Polyline
                coordinates={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor={Colors.ember + '40'}
                strokeWidth={8}
              />
              <Polyline
                coordinates={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor={Colors.ember}
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]} />
      )}

      {/* Map error overlay — shown only after timeout if map never initialized */}
      {mapError && (
        <View style={[StyleSheet.absoluteFill, styles.mapErrorOverlay]} pointerEvents="none">
          <View style={styles.mapErrorBox}>
            <Text style={styles.mapErrorIcon}>◈</Text>
            <Text style={styles.mapErrorTitle}>Mapa niedostępna</Text>
            <Text style={styles.mapErrorDesc}>
              Mapa chwilowo niedostępna. Spróbuj ponownie za chwilę.
            </Text>
          </View>
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="contain" />
        </View>
        <Pressable
          style={styles.searchPill}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push('/modals/search' as any)}
          accessibilityLabel="Szukaj"
        >
          <Ionicons name="search" size={14} color={Colors.starFaint} />
          <Text style={styles.searchPillText}>Szukaj spotów, explo...</Text>
        </Pressable>
        <View style={styles.topRight}>
          {presenceActive && nearbyExplorers.length > 0 && (
            <View style={styles.nearbyBadge}>
              <Text style={styles.nearbyText}>{nearbyExplorers.length}</Text>
            </View>
          )}
          <PresenceToggle active={presenceActive} onToggle={togglePresence} />
        </View>
      </SafeAreaView>

      {/* Category filter chips — hidden while recording to avoid overlap */}
      {!isRecording && locationActive && (
        <CategoryChips
          active={activeCategory}
          onChange={setActiveCategory}
          top={insets.top + TOP_BAR_HEIGHT + 4}
        />
      )}

      {/* Recording status bar */}
      {isRecording && startedAt && (
        <View style={[styles.recordingBarWrapper, { top: insets.top + TOP_BAR_HEIGHT, zIndex: 15 }]}>
          <RecordingBar
            startedAt={startedAt}
            pointCount={points.length}
            accuracy={accuracy}
            lastPointAt={lastPointAt}
            onStop={handleStopRecording}
            onCancel={handleCancelRecording}
          />
        </View>
      )}

      {/* Gradient scrim — gives visual grounding to floating bottom buttons */}
      <LinearGradient
        colors={['rgba(7,10,12,0)', 'rgba(7,10,12,0.48)', 'rgba(7,10,12,0.72)']}
        style={[styles.bottomScrim, { height: insets.bottom + 220 }]}
        pointerEvents="none"
      />

      {/* Center on me — appears when location is available */}
      {locationGranted && !isRecording && (
        <Pressable
          style={[styles.centerMeBtn, { bottom: insets.bottom + 164 }]}
          onPress={centerOnMe}
          accessibilityRole="button"
          accessibilityLabel="Wyśrodkuj na mnie"
        >
          <Ionicons name="navigate" size={18} color={Colors.aurora} />
        </Pressable>
      )}

      {/* Bottom action bar — sits above floating tab bar */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 100 }]}>
        {!isRecording ? (
          <View style={styles.bottomActions}>
            <Pressable
              style={styles.dropBtn}
              onPress={() => router.push('/modals/new-spot')}
              accessibilityRole="button"
              accessibilityLabel={pl.spots.dropSpot}
            >
              <Ionicons name="flag" size={20} color={Colors.aurora} />
            </Pressable>
            <Pressable
              style={styles.recordBtn}
              onPress={() => setShowStartModal(true)}
              accessibilityRole="button"
              accessibilityLabel={pl.recording.startRecording}
            >
              <View style={styles.recordBtnDot} />
              <Text style={styles.recordBtnText}>{pl.recording.recordBtn}</Text>
            </Pressable>
          </View>
        ) : (
          <SignalButton
            label={pl.recording.stopRecording}
            onPress={handleStopRecording}
            variant="ember"
            size="md"
            fullWidth
            haptic="heavy"
          />
        )}
      </View>

      {/* Quick-create journey modal */}
      <StartJourneyModal
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={handleStartJourney}
      />

      {/* Spot preview sheet — slides up on pin tap */}
      <SpotPreviewSheet
        spot={previewSpot}
        onDismiss={() => setPreviewSpot(null)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  mapPlaceholder: { backgroundColor: Colors.abyss },
  mapErrorOverlay: {
    backgroundColor: Colors.abyss + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  mapErrorBox: {
    backgroundColor: Colors.graphite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.ember + '40',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 280,
  },
  mapErrorIcon: { fontSize: 32, color: Colors.ember },
  mapErrorTitle: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    textAlign: 'center',
  },
  mapErrorDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 200,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  logoWrap: {
    width: 38, height: 38,
    backgroundColor: 'rgba(13,18,22,0.80)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 26, height: 26 },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    backgroundColor: 'rgba(13,18,22,0.80)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 14,
  },
  searchPillText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: Colors.starGhost,
    flex: 1,
  },
  nearbyBadge: {
    backgroundColor: Colors.aurora + '20', borderRadius: 999,
    width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.aurora + '50',
  },
  nearbyText: { fontFamily: 'SpaceMono-Regular', fontSize: 9, color: Colors.aurora },

  // ── Presence toggle ──────────────────────────────────────────────────────────
  presenceIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.glass, borderRadius: 999,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  presenceIndicatorActive: {
    borderColor: Colors.aurora + '60', backgroundColor: Colors.aurora + '12',
  },
  presenceDot:  { width: 6, height: 6, borderRadius: 3 },
  presenceText: { fontFamily: 'GeneralSans-Regular', fontSize: 10, color: Colors.starFaint },

  // ── Recording bar ────────────────────────────────────────────────────────────
  recordingBarWrapper: { position: 'absolute', left: Spacing.xl, right: Spacing.xl },
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.graphite + 'F0',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.ember + '60',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  recordingBarIdle: {
    borderColor: Colors.sand + '80',
  },
  recordingDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.ember },
  recordingTime: { fontFamily: 'SpaceMono-Regular', fontSize: 13, color: Colors.ember, minWidth: 46 },
  recordingMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordingPts:  { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starFaint },
  accuracyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  accuracyDot:   { width: 5, height: 5, borderRadius: 3 },
  accuracyText:  { fontFamily: 'SpaceMono-Regular', fontSize: 9 },
  idleText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 9,
    color: Colors.sand, letterSpacing: 0.5,
  },
  recordingActions:   { flexDirection: 'row', gap: Spacing.sm },
  recordingCancelBtn: { padding: Spacing.sm },
  recordingCancelText:{ fontFamily: 'GeneralSans-Regular', fontSize: 12, color: Colors.starGhost },
  recordingStopBtn: {
    backgroundColor: Colors.ember, borderRadius: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  recordingStopText: { fontFamily: 'GeneralSans-Semibold', fontSize: 12, color: Colors.void },

  // ── Gradient scrim ───────────────────────────────────────────────────────────
  bottomScrim: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },

  // ── Center on me ─────────────────────────────────────────────────────────────
  centerMeBtn: {
    position: 'absolute',
    right: Spacing.xl,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(13,18,22,0.88)',
    borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },

  // ── Bottom action bar ────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
  },
  bottomActions: { flexDirection: 'row', gap: Spacing.sm },
  dropBtn: {
    width: 54,
    alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(13,18,22,0.82)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.aurora + '55',
    shadowColor: Colors.aurora,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 5,
  },
  recordBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(12,16,19,0.92)',
    borderRadius: 22, borderWidth: 1, borderColor: Colors.ember + '60',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    justifyContent: 'center',
    shadowColor: Colors.ember,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  recordBtnDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.ember,
  },
  recordBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: 13, color: Colors.ember },

  // ── Map pins ─────────────────────────────────────────────────────────────────
  spotPin: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFFFFF' },
  pinWrapper: { alignItems: 'center', gap: 2 },
  ephemeralBadge: {
    paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 4, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  ephemeralText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 8, fontVariant: ['tabular-nums'],
  },
  presenceOuter: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.aurora + '25', alignItems: 'center', justifyContent: 'center',
  },
  presenceInner: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.aurora, borderWidth: 2, borderColor: '#FFFFFF',
  },

  // ── Category filter chips ────────────────────────────────────────────────────
  chipRow: {
    position: 'absolute',
    left: 0, right: 0,
    zIndex: 10,
  },
  chipRowContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(13,18,22,0.72)',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(237,232,223,0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: Colors.aurora + '20',
    borderColor: Colors.aurora + '75',
  },
  chipText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: Colors.star,
  },
  chipTextActive: {
    color: Colors.aurora,
    fontFamily: 'GeneralSans-Semibold',
  },

  // ── Secret drop pin ──────────────────────────────────────────────────────────
  secretDropWrapper: { alignItems: 'center', gap: 2 },
  secretPulseRing: {
    position: 'absolute',
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.ember,
    alignSelf: 'center',
  },

  // ── Cluster pin ──────────────────────────────────────────────────────────────
  clusterPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.signal,
    borderWidth: 2, borderColor: Colors.signal + '50',
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.card,
  },
  clusterCount: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    color: Colors.void,
    fontWeight: '700',
  },

  // ── Quick-create modal ───────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(7,10,12,0.7)',
  },
  modalSheet: {
    backgroundColor: Colors.graphite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: Colors.steel,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.steel, alignSelf: 'center', marginBottom: Spacing.sm,
  },
  modalEyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: 10,
    color: Colors.ember, letterSpacing: 3, textTransform: 'uppercase',
  },
  modalTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, color: Colors.starlight },
  modalSub: {
    fontFamily: 'GeneralSans-Regular', fontSize: 13,
    color: Colors.star, lineHeight: 20,
  },
  modalLabel: {
    fontFamily: 'GeneralSans-Semibold', fontSize: 11,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.abyss, borderWidth: 1, borderColor: Colors.steel,
    borderRadius: 14, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: 15, color: Colors.starlight,
  },
  modalActions: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm,
  },
});
