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
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { Colors, FontSize, Spacing, Shadow } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import { useNearbySpots } from '@/hooks/useSpots';
import { useAuthStore } from '@/stores/auth';
import { useRecordingStore } from '@/stores/recording';
import { useCreateJourney, useUpdateJourney } from '@/hooks/useJourneys';
import { socketManager } from '@/lib/socket';
import { api } from '@/lib/api';
import type { SpotForViewer } from '@travelpoint/types';

// ── Terra Mare map style (JSON override for Android Google Maps) ──────────────
const TERRA_MARE_STYLE = [
  { elementType: 'geometry',           stylers: [{ color: '#0C1014' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8A827A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0C1014' }] },
  { featureType: 'administrative',     elementType: 'geometry', stylers: [{ color: '#253035' }] },
  { featureType: 'road',               elementType: 'geometry', stylers: [{ color: '#1B2328' }] },
  { featureType: 'road',               elementType: 'geometry.stroke', stylers: [{ color: '#131A1F' }] },
  { featureType: 'road.highway',       elementType: 'geometry', stylers: [{ color: '#253035' }] },
  { featureType: 'water',              elementType: 'geometry', stylers: [{ color: '#0F1E2A' }] },
  { featureType: 'poi',                stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',            stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape',          elementType: 'geometry', stylers: [{ color: '#131A1F' }] },
];

const ACCESS_PIN_COLORS: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  SECRET_DROP: Colors.ember,
  CIRCLE_ONLY: Colors.violet,
};

const DEFAULT_REGION: Region = {
  latitude:      52.2297,
  longitude:     21.0122,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

interface NearbyExplorer {
  explorerId: string;
  lat: number;
  lng: number;
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
        <View style={styles.modalSheet}>
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
  useEffect(() => { void requestLocation(); }, []);

  useEffect(() => {
    if (!locationGranted) return;
    if (presenceActive) {
      socketManager.emit('presence:enable', { lat: region.latitude, lng: region.longitude });
    } else {
      socketManager.emit('presence:disable');
      setNearbyExplorers([]);
    }
  }, [presenceActive, locationGranted]);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setLocationGranted(true);

    // Sync consent to server the first time the user grants location permission.
    // Guard: explorer may still be null if called before rehydration completes.
    if (explorer && !explorer.locationConsent) {
      try {
        await api.patch('/api/explorers/me', { locationConsent: true });
        setExplorer({ ...explorer, locationConsent: true });
      } catch { /* non-fatal — consent will sync on next profile fetch */ }
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    const newRegion: Region = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1200);
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
    if (!locationActive) { void requestLocation(); return; }

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
    const result = stopRecording();

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
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={locationActive}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsBuildings={false}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={Platform.OS === 'android' ? TERRA_MARE_STYLE : undefined}
        onRegionChangeComplete={setRegion}
      >
        {/* Spot pins */}
        {spots?.map((spot: SpotForViewer) => {
          const isLocked    = 'locked' in spot ? spot.locked : false;
          const accessLevel = 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : 'PUBLIC';
          const color       = isLocked ? Colors.starGhost : (ACCESS_PIN_COLORS[accessLevel] ?? Colors.aurora);
          return (
            <Marker
              key={spot.id}
              coordinate={{ latitude: spot.lat, longitude: spot.lng }}
              onPress={() => router.push(`/spot/${spot.id}`)}
            >
              <View style={[styles.spotPin, { backgroundColor: color, opacity: isLocked ? 0.6 : 1 }]} />
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
            {/* Glow under route */}
            <Polyline
              coordinates={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={Colors.ember + '40'}
              strokeWidth={8}
            />
            {/* Route line */}
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
        <View style={[styles.recordingBarWrapper, { top: insets.top + 56 }]}>
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
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },

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
    paddingBottom: 40,
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
  modalTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: 22, color: Colors.starlight },
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
