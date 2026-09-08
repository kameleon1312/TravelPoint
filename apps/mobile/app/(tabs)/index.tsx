import {
  View, Text, StyleSheet, Platform, Pressable, Alert,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence,
  withTiming, withSpring, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Colors, FontSize, Spacing, Shadow } from '@travelpoint/theme';
import { TERRA_MARE_STYLE } from '@/constants/mapStyle';

const MAPS_KEY = process.env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'];
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
  onStop,
  onCancel,
}: {
  startedAt: Date;
  pointCount: number;
  onStop:   () => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const dot = useSharedValue(1);

  useEffect(() => {
    // Pulsing red dot
    dot.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
    );
    // Elapsed time counter
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.recordingBar}>
      <Animated.View style={[styles.recordingDot, dotStyle]} />
      <Text style={styles.recordingTime}>{mm}:{ss}</Text>
      <Text style={styles.recordingPts}>{pointCount} pkt</Text>
      <View style={styles.recordingActions}>
        <Pressable style={styles.recordingCancelBtn} onPress={onCancel} hitSlop={8}>
          <Text style={styles.recordingCancelText}>✕</Text>
        </Pressable>
        <Pressable style={styles.recordingStopBtn} onPress={onStop}>
          <Text style={styles.recordingStopText}>⏹ Stop</Text>
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

          <Text style={styles.modalEyebrow}>GPS · Journey Replay</Text>
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
  const [mapReady, setMapReady]             = useState(false);
  const [mapError, setMapError]             = useState(false);
  const [mapStyle, setMapStyle]             = useState<typeof TERRA_MARE_STYLE | undefined>(undefined);
  const mapReadyRef   = useRef(false);
  const mapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!MAPS_KEY) return;
    mapTimeoutRef.current = setTimeout(() => {
      if (!mapReadyRef.current) setMapError(true);
    }, 7000);
    return () => { if (mapTimeoutRef.current) clearTimeout(mapTimeoutRef.current); };
  }, []);

  const mapRef = useRef<MapView>(null);

  // Recording state
  const {
    isRecording, startedAt, points,
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
      Alert.alert('Journey', pl.recording.tooFewPoints);
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {MAPS_KEY ? (
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
          customMapStyle={mapStyle}
          onRegionChangeComplete={setRegion}
          onMapReady={() => {
            mapReadyRef.current = true;
            setMapReady(true);
            setMapError(false);
            if (mapTimeoutRef.current) clearTimeout(mapTimeoutRef.current);
            if (Platform.OS === 'android') setMapStyle(TERRA_MARE_STYLE);
          }}
        >
          {/* Spot pins */}
          {spots?.map((spot: SpotForViewer) => {
            const isLocked    = 'locked' in spot ? spot.locked : false;
            const accessLevel = 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC';
            const color       = isLocked ? Colors.starGhost : (ACCESS_PIN_COLORS[accessLevel] ?? Colors.aurora);
            const countdown   = 'dropExpiresAt' in spot && spot.dropExpiresAt ? formatDropCountdown(spot.dropExpiresAt) : '';
            return (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                onPress={() => setPreviewSpot(spot)}
                anchor={{ x: 0.5, y: countdown ? 1 : 0.5 }}
              >
                <View style={styles.pinWrapper}>
                  <View style={[styles.spotPin, { backgroundColor: color, opacity: isLocked ? 0.6 : 1 }]} />
                  {countdown !== '' && (
                    <View style={[styles.ephemeralBadge, { borderColor: color }]}>
                      <Text style={[styles.ephemeralText, { color }]}>{countdown}</Text>
                    </View>
                  )}
                </View>
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

      {/* Map loading / error overlay */}
      {MAPS_KEY && !mapReady && !mapError && (
        <View style={[StyleSheet.absoluteFill, styles.mapLoadingOverlay]} pointerEvents="none">
          <View style={styles.mapLoadingSpinner}>
            <Text style={styles.mapLoadingDot}>◎</Text>
            <Text style={styles.mapLoadingText}>Ładowanie mapy…</Text>
          </View>
        </View>
      )}
      {mapError && (
        <View style={[StyleSheet.absoluteFill, styles.mapErrorOverlay]} pointerEvents="none">
          <View style={styles.mapErrorBox}>
            <Text style={styles.mapErrorIcon}>◈</Text>
            <Text style={styles.mapErrorTitle}>Mapa niedostępna</Text>
            <Text style={styles.mapErrorDesc}>
              Włącz "Maps SDK for Android" w Google Cloud Console dla klucza API.
            </Text>
          </View>
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Text style={styles.logo}>TravelPoint</Text>
        <View style={styles.topRight}>
          {presenceActive && nearbyExplorers.length > 0 && (
            <View style={styles.nearbyBadge}>
              <Text style={styles.nearbyText}>
                {nearbyExplorers.length} {pl.presence.nearby}
              </Text>
            </View>
          )}
          <PresenceToggle active={presenceActive} onToggle={togglePresence} />
        </View>
      </SafeAreaView>

      {/* Recording status bar */}
      {isRecording && startedAt && (
        <View style={[styles.recordingBarWrapper, { top: insets.top + TOP_BAR_HEIGHT }]}>
          <RecordingBar
            startedAt={startedAt}
            pointCount={points.length}
            onStop={handleStopRecording}
            onCancel={handleCancelRecording}
          />
        </View>
      )}

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + Spacing.md }]}>
        {!isRecording ? (
          <View style={styles.bottomActions}>
            <View style={{ flex: 1 }}>
              <SignalButton
                label={pl.spots.dropSpot}
                onPress={() => router.push('/modals/new-spot')}
                variant="aurora"
                size="md"
                haptic="medium"
                fullWidth
              />
            </View>
            <Pressable
              style={styles.recordBtn}
              onPress={() => setShowStartModal(true)}
              accessibilityRole="button"
              accessibilityLabel={pl.recording.startRecording}
            >
              <View style={styles.recordBtnDot} />
              <Text style={styles.recordBtnText}>Nagraj</Text>
            </Pressable>
          </View>
        ) : (
          // When recording — redundant stop button at bottom for thumb reach.
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
  mapLoadingOverlay: {
    backgroundColor: Colors.abyss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingSpinner: { alignItems: 'center', gap: Spacing.sm },
  mapLoadingDot: {
    fontSize: 28,
    color: Colors.signal,
  },
  mapLoadingText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.caption,
    color: Colors.starGhost,
    letterSpacing: 1,
  },
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
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topRight:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo:        { fontFamily: 'ClashDisplay-Bold', fontSize: 16, color: Colors.starlight, ...Shadow.card },
  nearbyBadge: {
    backgroundColor: Colors.aurora + '20', borderRadius: 999,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.aurora + '50',
  },
  nearbyText: { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.aurora },

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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.graphite + 'F0',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.ember + '60',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  recordingDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.ember },
  recordingTime:     { fontFamily: 'SpaceMono-Regular', fontSize: 13, color: Colors.ember, minWidth: 46 },
  recordingPts:      { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starFaint, flex: 1 },
  recordingActions:  { flexDirection: 'row', gap: Spacing.sm },
  recordingCancelBtn: { padding: Spacing.sm },
  recordingCancelText:{ fontFamily: 'GeneralSans-Regular', fontSize: 12, color: Colors.starGhost },
  recordingStopBtn:  {
    backgroundColor: Colors.ember, borderRadius: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  recordingStopText: { fontFamily: 'GeneralSans-Semibold', fontSize: 12, color: Colors.void },

  // ── Bottom action bar ────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
  },
  bottomActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'stretch' },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.graphite + 'E8',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.ember + '60',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    minWidth: 88, justifyContent: 'center',
  },
  recordBtnDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.ember,
  },
  recordBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: 13, color: Colors.ember },

  // ── Map pins ─────────────────────────────────────────────────────────────────
  spotPin: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.abyss },
  pinWrapper: { alignItems: 'center', gap: 2 },
  ephemeralBadge: {
    paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 4, borderWidth: 1,
    backgroundColor: Colors.abyss + 'CC',
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
    backgroundColor: Colors.aurora, borderWidth: 2, borderColor: Colors.abyss,
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
