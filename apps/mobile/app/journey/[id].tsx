import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform, Alert, TextInput,
  Modal, KeyboardAvoidingView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { TERRA_MARE_STYLE } from '@/constants/mapStyle';
import { useJourney, useDeleteJourney, useLikeJourney, useUnlikeJourney, useUpdateJourney } from '@/hooks/useJourneys';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { formatRelative } from '@travelpoint/utils';
import { useAuthStore } from '@/stores/auth';

// ─── Geo helpers ──────────────────────────────────────────────────────────────

function extractPolylineCoords(geoJson: unknown): { latitude: number; longitude: number }[] {
  const features =
    (geoJson as { features?: { geometry?: { type?: string; coordinates?: number[][] } }[] })
      ?.features ?? [];
  const coords: { latitude: number; longitude: number }[] = [];
  for (const f of features) {
    if (f.geometry?.type === 'LineString') {
      for (const pair of (f.geometry.coordinates ?? [])) {
        coords.push({ latitude: pair[1] ?? 0, longitude: pair[0] ?? 0 });
      }
    }
  }
  return coords;
}

function computeRegion(geoJson: unknown): Region {
  const features =
    (geoJson as { features?: { geometry?: { type?: string; coordinates?: number[][] } }[] })
      ?.features ?? [];
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  let hasPoints = false;
  for (const f of features) {
    if (f.geometry?.type === 'LineString') {
      for (const pair of (f.geometry.coordinates ?? [])) {
        const lng = pair[0] ?? 0; const lat = pair[1] ?? 0;
        if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
        hasPoints = true;
      }
    }
  }
  if (!hasPoints) return { latitude: 52.2297, longitude: 21.0122, latitudeDelta: 10, longitudeDelta: 10 };
  const latDelta = Math.max(Math.abs(maxLat - minLat) * 1.6, 0.005);
  const lngDelta = Math.max(Math.abs(maxLng - minLng) * 1.6, 0.005);
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
    Math.cos((b.latitude * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function totalDistanceKm(coords: { latitude: number; longitude: number }[]): number {
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    dist += haversineKm(coords[i - 1]!, coords[i]!);
  }
  return dist;
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  visible: boolean;
  initial: { title: string; mood: string; soundtrack: string; isPrivate: boolean };
  onClose: () => void;
  onSave: (data: { title: string; mood?: string; soundtrack?: string; isPrivate: boolean }) => void;
  saving: boolean;
}

function EditJourneyModal({ visible, initial, onClose, onSave, saving }: EditModalProps) {
  const [title, setTitle]           = useState(initial.title);
  const [mood, setMood]             = useState(initial.mood);
  const [soundtrack, setSoundtrack] = useState(initial.soundtrack);
  const [isPrivate, setIsPrivate]   = useState(initial.isPrivate);

  function handleSave() {
    if (!title.trim() || title.trim().length < 2) {
      Alert.alert('Błąd', 'Tytuł musi mieć co najmniej 2 znaki.');
      return;
    }
    onSave({
      title: title.trim(),
      mood: mood.trim() || undefined,
      soundtrack: soundtrack.trim() || undefined,
      isPrivate,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}><Text style={styles.modalCancel}>Anuluj</Text></Pressable>
          <Text style={styles.modalTitle}>Edytuj Journey</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalLabel}>Tytuł *</Text>
          <TextInput
            style={styles.modalInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Nadaj nazwę tej ekspedycji"
            placeholderTextColor={Colors.starGhost}
            maxLength={120}
          />

          <Text style={styles.modalLabel}>Nastrój / Cytat</Text>
          <TextInput
            style={styles.modalInput}
            value={mood}
            onChangeText={setMood}
            placeholder="Jedno zdanie o tej podróży…"
            placeholderTextColor={Colors.starGhost}
            maxLength={60}
          />

          <Text style={styles.modalLabel}>Soundtrack (URL)</Text>
          <TextInput
            style={styles.modalInput}
            value={soundtrack}
            onChangeText={setSoundtrack}
            placeholder="https://open.spotify.com/…"
            placeholderTextColor={Colors.starGhost}
            keyboardType="url"
            autoCapitalize="none"
            maxLength={500}
          />

          <View style={styles.modalToggleRow}>
            <View>
              <Text style={styles.modalToggleLabel}>Prywatna journey</Text>
              <Text style={styles.modalToggleSub}>Widoczna tylko dla Ciebie</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: Colors.steel, true: Colors.aurora + '80' }}
              thumbColor={isPrivate ? Colors.aurora : Colors.starFaint}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { explorer } = useAuthStore();
  const { data: journey, isLoading } = useJourney(id ?? '');
  const { mutateAsync: deleteJourney, isPending: isDeleting } = useDeleteJourney();
  const { mutateAsync: updateJourney, isPending: isUpdating } = useUpdateJourney();
  const likeJourney   = useLikeJourney();
  const unlikeJourney = useUnlikeJourney();
  const [editVisible, setEditVisible] = useState(false);
  const [routeMapReady, setRouteMapReady] = useState(false);

  const isOwner = !!journey && journey.explorerId === explorer?.id;

  async function handleLikeToggle() {
    if (!journey) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (journey.liked) { unlikeJourney.mutate(journey.id); }
    else { likeJourney.mutate(journey.id); }
  }

  async function handleSaveEdit(data: { title: string; mood?: string; soundtrack?: string; isPrivate: boolean }) {
    try {
      await updateJourney({ id: id ?? '', data });
      setEditVisible(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać zmian.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      `Usuń "${journey?.title}"?`,
      'Tej operacji nie można cofnąć. Trasa zostanie trwale usunięta.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń', style: 'destructive',
          onPress: async () => {
            try {
              await deleteJourney(id ?? '');
              router.back();
            } catch (e: unknown) {
              Alert.alert('Błąd', e instanceof Error ? e.message : 'Nie udało się usunąć.');
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!journey) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Journey nie znalezione.</Text>
          <SignalButton label="Wróć" onPress={() => router.back()} variant="ghost" size="sm" />
        </View>
      </SafeAreaView>
    );
  }

  const routeCoords = journey.routeGeoJson ? extractPolylineCoords(journey.routeGeoJson) : [];
  const routeRegion = journey.routeGeoJson ? computeRegion(journey.routeGeoJson) : undefined;
  const distanceKm  = routeCoords.length > 1 ? totalDistanceKm(routeCoords) : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Back + owner actions */}
        <View style={styles.topBar}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Trasy</Text>
          </Pressable>
          {isOwner && (
            <Pressable style={styles.editBtn} onPress={() => setEditVisible(true)}>
              <Text style={styles.editBtnText}>Edytuj</Text>
            </Pressable>
          )}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.eyebrow}>Odtwarzanie trasy</Text>
            {journey.isPrivate && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>◑ Prywatne</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{journey.title}</Text>
          {journey.mood && <Text style={styles.mood}>"{journey.mood}"</Text>}
          <Text style={styles.date}>{formatRelative(journey.createdAt)}</Text>
        </View>

        {/* Route map */}
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>Trasa ekspedycji</Text>
          {routeCoords.length > 0 && routeRegion && Platform.OS !== 'web' ? (
            <View style={styles.routeMapContainer}>
              <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.routeMap}
                initialRegion={routeRegion}
                scrollEnabled={false}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
                showsCompass={true}
                showsScale={true}
                showsUserLocation={false}
                mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                customMapStyle={Platform.OS === 'android' ? TERRA_MARE_STYLE : undefined}
                onMapReady={() => setRouteMapReady(true)}
              >
                {/* Glow layer */}
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={Colors.aurora + '28'}
                  strokeWidth={12}
                  lineCap="round"
                  lineJoin="round"
                />
                {/* Main route line */}
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={Colors.aurora}
                  strokeWidth={3.5}
                  lineCap="round"
                  lineJoin="round"
                />
              </MapView>
              {!routeMapReady && (
                <View style={styles.routeMapLoading}>
                  <Text style={styles.routeMapLoadingText}>◎</Text>
                </View>
              )}
              <View style={styles.routeStats}>
                <View style={styles.routeStatItem}>
                  <Text style={styles.routeStatValue}>
                    {distanceKm >= 1 ? `${distanceKm.toFixed(2)} km` : `${(distanceKm * 1000).toFixed(0)} m`}
                  </Text>
                  <Text style={styles.routeStatKey}>Dystans</Text>
                </View>
                <View style={styles.routeStatDivider} />
                <View style={styles.routeStatItem}>
                  <Text style={styles.routeStatValue}>{routeCoords.length}</Text>
                  <Text style={styles.routeStatKey}>Punkty GPS</Text>
                </View>
                <View style={styles.routeStatDivider} />
                <View style={styles.routeStatItem}>
                  <Text style={styles.routeStatValue}>
                    {new Date(journey.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.routeStatKey}>Data</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.routeEmpty}>
              <Text style={styles.routeEmptyIcon}>◌</Text>
              <Text style={styles.routeEmptyText}>Brak zapisanej trasy GPS</Text>
            </View>
          )}
        </View>

        {/* Soundtrack */}
        {journey.soundtrack && (
          <GlassCard style={styles.soundtrackCard}>
            <Text style={styles.soundtrackIcon}>♪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.soundtrackLabel}>Ścieżka dźwiękowa</Text>
              <Text style={styles.soundtrackUrl} numberOfLines={1}>{journey.soundtrack}</Text>
            </View>
          </GlassCard>
        )}

        {/* Meta */}
        <GlassCard style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Widoczność</Text>
            <View style={[styles.metaValueBadge, { borderColor: journey.isPrivate ? Colors.ember + '50' : Colors.aurora + '50' }]}>
              <Text style={[styles.metaValueText, { color: journey.isPrivate ? Colors.ember : Colors.aurora }]}>
                {journey.isPrivate ? '◑ Prywatne' : '◎ Publiczne'}
              </Text>
            </View>
          </View>
          {distanceKm > 0 && (
            <View style={[styles.metaRow, { marginTop: Spacing.sm }]}>
              <Text style={styles.metaLabel}>Całkowity dystans</Text>
              <Text style={styles.metaDate}>
                {distanceKm >= 1 ? `${distanceKm.toFixed(2)} km` : `${(distanceKm * 1000).toFixed(0)} m`}
              </Text>
            </View>
          )}
          {journey.updatedAt && journey.updatedAt !== journey.createdAt && (
            <View style={[styles.metaRow, { marginTop: Spacing.sm }]}>
              <Text style={styles.metaLabel}>Ostatnia edycja</Text>
              <Text style={styles.metaDate}>{formatRelative(journey.updatedAt)}</Text>
            </View>
          )}
        </GlassCard>

        {/* Like — non-owners */}
        {!isOwner && (
          <Pressable
            style={[styles.likeBtn, journey.liked && styles.likeBtnActive]}
            onPress={() => void handleLikeToggle()}
            disabled={likeJourney.isPending || unlikeJourney.isPending}
          >
            <Text style={[styles.likeIcon, journey.liked && styles.likeIconActive]}>♥</Text>
            <Text style={[styles.likeLabel, journey.liked && styles.likeLabelActive]}>
              {journey.liked ? 'Lubisz tę trasę' : 'Polub tę trasę'}
            </Text>
            {(journey.likeCount ?? 0) > 0 && (
              <Text style={styles.likeCount}>{journey.likeCount}</Text>
            )}
          </Pressable>
        )}

        {/* Like count for owners */}
        {isOwner && (journey.likeCount ?? 0) > 0 && (
          <View style={styles.ownerLikeRow}>
            <Text style={styles.ownerLikeText}>♥ {journey.likeCount} odkrywców polubiło tę trasę</Text>
          </View>
        )}

        {/* Owner actions */}
        {isOwner && (
          <View style={styles.ownerActions}>
            <SignalButton
              label="Edytuj trasę"
              onPress={() => setEditVisible(true)}
              variant="ghost"
              size="md"
              fullWidth
              haptic="light"
            />
            <SignalButton
              label="Usuń journey"
              onPress={confirmDelete}
              variant="ember"
              size="md"
              fullWidth
              loading={isDeleting}
              haptic="medium"
            />
          </View>
        )}

      </ScrollView>

      {/* Edit modal */}
      {isOwner && (
        <EditJourneyModal
          visible={editVisible}
          initial={{
            title:      journey.title ?? '',
            mood:       journey.mood ?? '',
            soundtrack: journey.soundtrack ?? '',
            isPrivate:  journey.isPrivate ?? true,
          }}
          onClose={() => setEditVisible(false)}
          onSave={handleSaveEdit}
          saving={isUpdating}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 60 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:     { alignSelf: 'flex-start' },
  backText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  editBtnText: { fontFamily: 'GeneralSans-Medium', fontSize: FontSize.caption, color: Colors.star },

  header:   { gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  privateBadge: { borderWidth: 1, borderColor: Colors.ember + '40', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  privateBadgeText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.ember },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight, letterSpacing: -0.5 },
  mood:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.star, fontStyle: 'italic' },
  date:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },

  routeCard: { backgroundColor: Colors.graphite, borderWidth: 1, borderColor: Colors.steel, borderRadius: 16, overflow: 'hidden' },
  routeLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1, padding: Spacing.lg, paddingBottom: Spacing.sm },
  routeMapContainer: { overflow: 'hidden' },
  routeMap: { height: 320 },
  routeMapLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 320,
    backgroundColor: Colors.graphite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeMapLoadingText: { fontSize: 28, color: Colors.signal },
  routeStats: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.steel, gap: 0 },
  routeStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  routeStatValue: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body, color: Colors.starlight },
  routeStatKey: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, textTransform: 'uppercase', letterSpacing: 1 },
  routeStatDivider: { width: 1, backgroundColor: Colors.steel, marginVertical: 4 },
  routeEmpty: { height: 100, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm },
  routeEmptyIcon: { fontFamily: 'GeneralSans-Regular', fontSize: 28, color: Colors.starGhost },
  routeEmptyText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starGhost },

  soundtrackCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  soundtrackIcon:  { fontFamily: 'GeneralSans-Regular', fontSize: 24, color: Colors.aurora },
  soundtrackLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  soundtrackUrl:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.signal },

  metaCard:  { gap: Spacing.xs },
  metaRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  metaValueBadge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  metaValueText:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase' },
  metaDate: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },

  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.ember },

  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, backgroundColor: Colors.graphite },
  likeBtnActive: { borderColor: Colors.aurora + '60', backgroundColor: Colors.aurora + '12' },
  likeIcon: { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.starGhost },
  likeIconActive: { color: Colors.aurora },
  likeLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starFaint },
  likeLabelActive: { color: Colors.aurora },
  likeCount: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },

  ownerLikeRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  ownerLikeText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },

  ownerActions: { gap: Spacing.md },

  // Modal
  modalRoot:   { flex: 1, backgroundColor: Colors.abyss },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.steel },
  modalCancel: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  modalTitle:  { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body, color: Colors.starlight },
  modalSave:   { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
  modalScroll: { padding: Spacing.xl, gap: Spacing.lg },
  modalLabel:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  modalInput:  { backgroundColor: Colors.graphite, borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starlight },
  modalToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.graphite, borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.md, padding: Spacing.lg },
  modalToggleLabel: { fontFamily: 'GeneralSans-Medium', fontSize: FontSize.bodySm, color: Colors.starlight, marginBottom: 2 },
  modalToggleSub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
});
