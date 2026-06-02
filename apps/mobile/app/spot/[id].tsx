import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, Dimensions, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming,
  FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
// expo-image-picker uses a native module that requires a custom dev-client build.
// We load it dynamically so the module never crashes on load when the native
// module is absent (e.g. Expo Go or an old dev-client build).
import type * as ImagePickerTypes from 'expo-image-picker';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import {
  useSpot, useSaveSpot, useUnsaveSpot,
  useSpotPhotos, useUploadSpotPhoto, useDeleteSpotPhoto, useDeleteSpot,
} from '@/hooks/useSpots';
import { useAuthStore } from '@/stores/auth';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_W  = SCREEN_W * 0.72;
const PHOTO_H  = PHOTO_W * 0.68;

// Max base64 size we'll attempt to upload (~3.5 MB decoded ≈ ~4.7 MB base64).
// The API bodyLimit is 6 MB so this leaves headroom.
const MAX_B64_LEN = 4_700_000;

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED: '◈', CAFE: '◎', BEACH: '◎',
  ROUTE: '◉', UNDERGROUND: '◈', VIEWPOINT: '◎', CAMP: '◉',
};

const CATEGORY_LABELS: Record<string, string> = {
  ABANDONED: 'Opuszczone', CAFE: 'Kawiarnia', BEACH: 'Plaża',
  ROUTE: 'Trasa', UNDERGROUND: 'Podziemia', VIEWPOINT: 'Widok', CAMP: 'Baza',
};

const ACCESS_LABELS: Record<string, string> = {
  PUBLIC:      'Publiczne',
  TRUSTED:     'Wymaga ranku TRUSTED',
  CIRCLE_ONLY: 'Tylko dla circle',
  SECRET_DROP: 'Secret Drop',
};

// ─── Locked overlay ───────────────────────────────────────────────────────────
function LockedOverlay({ requiredAccess }: { requiredAccess: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <GlassCard style={styles.lockedCard}>
      <Animated.Text style={[styles.lockIcon, style]}>◈</Animated.Text>
      <Text style={styles.lockTitle}>Zablokowane</Text>
      <Text style={styles.lockDesc}>{ACCESS_LABELS[requiredAccess] ?? requiredAccess}</Text>
      <Text style={styles.lockHint}>
        Zwiększ swój rank lub dołącz do odpowiedniego circle żeby odblokować ten spot.
      </Text>
    </GlassCard>
  );
}

// ─── Photo item ───────────────────────────────────────────────────────────────
function PhotoItem({
  url, caption, photoId, spotId, isOwn,
}: {
  url: string; caption?: string | null;
  photoId: string; spotId: string; isOwn: boolean;
}) {
  const deletePhoto = useDeleteSpotPhoto();

  function confirmDelete() {
    Alert.alert('Usuń zdjęcie', 'Czy na pewno chcesz usunąć to zdjęcie?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń', style: 'destructive',
        onPress: () => deletePhoto.mutate({ photoId, spotId }),
      },
    ]);
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.photoItem}>
      <Image source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
      {caption ? (
        <Text style={styles.photoCaption} numberOfLines={2}>{caption}</Text>
      ) : null}
      {isOwn && (
        <Pressable style={styles.photoDeleteBtn} onPress={confirmDelete} hitSlop={8}>
          <Text style={styles.photoDeleteText}>✕</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── ImagePicker panel ────────────────────────────────────────────────────────
// expo-image-picker requires a native dev-client build. When the native module
// is absent (Expo Go / old build), we fall back to a URL text input so the
// screen still loads and photos can still be added.

type IpModule = typeof ImagePickerTypes;

async function tryLoadImagePicker(): Promise<IpModule | null> {
  try {
    // Dynamic import — evaluated lazily, so a missing native module only
    // throws when the user tries to use the picker, not on screen load.
    const mod = await import('expo-image-picker');
    // Confirm the native module is actually present before returning.
    await (mod as IpModule).requestMediaLibraryPermissionsAsync();
    return mod as IpModule;
  } catch {
    return null;
  }
}

function AddPhotoPanel({
  spotId,
  onDone,
}: { spotId: string; onDone: () => void }) {
  const [caption, setCaption]         = useState('');
  const [preview, setPreview]         = useState<string | null>(null);
  const [base64,  setBase64]          = useState<string | null>(null);
  const [urlInput, setUrlInput]       = useState('');
  const [pickerAvailable, setPickerAvailable] = useState<boolean | null>(null);
  const upload = useUploadSpotPhoto();

  // Probe for native module availability once on mount.
  useEffect(() => {
    void (async () => {
      try {
        await import('expo-image-picker');
        setPickerAvailable(true);
      } catch {
        setPickerAvailable(false);
      }
    })();
  }, []);

  async function pickFromSource(useCamera: boolean) {
    const picker = await tryLoadImagePicker();
    if (!picker) {
      Alert.alert('Brak obsługi', 'Picker niedostępny w tej wersji build. Użyj URL.');
      setPickerAvailable(false);
      return;
    }

    const perm = useCamera
      ? await picker.requestCameraPermissionsAsync()
      : await picker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== 'granted') {
      Alert.alert(pl.common.error, pl.photos.permissionDenied);
      return;
    }

    const result = useCamera
      ? await picker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, exif: false })
      : await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, exif: false, selectionLimit: 1 });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert(pl.common.error, pl.photos.uploadFailed); return; }
    if (asset.base64.length > MAX_B64_LEN) { Alert.alert(pl.common.error, pl.photos.tooLarge); return; }

    const mime    = asset.mimeType ?? 'image/jpeg';
    const dataUri = `data:${mime};base64,${asset.base64}`;
    setPreview(asset.uri);
    setBase64(dataUri);
  }

  async function handleUploadBase64() {
    if (!base64) return;
    try {
      await upload.mutateAsync({ spotId, url: base64, caption: caption.trim() || undefined });
      onDone();
    } catch { Alert.alert(pl.common.error, pl.photos.uploadFailed); }
  }

  async function handleUploadUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (url.length > MAX_B64_LEN) { Alert.alert(pl.common.error, pl.photos.tooLarge); return; }
    try {
      await upload.mutateAsync({ spotId, url, caption: caption.trim() || undefined });
      onDone();
    } catch { Alert.alert(pl.common.error, pl.photos.uploadFailed); }
  }

  function handleCancel() {
    setPreview(null);
    setBase64(null);
    setCaption('');
    setUrlInput('');
    onDone();
  }

  // pickerAvailable === null means we're still probing.
  const useNativePicker = pickerAvailable === true;
  const useUrlFallback  = pickerAvailable === false;

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.addPhotoPanel}>
      <Text style={styles.addPhotoTitle}>{pl.photos.addPhoto}</Text>

      {/* ── Native picker mode (expo-image-picker available) ── */}
      {useNativePicker && !preview && (
        <View style={styles.addPhotoSourceRow}>
          <Pressable style={styles.addPhotoSourceBtn} onPress={() => void pickFromSource(true)}>
            <Text style={styles.addPhotoSourceIcon}>📷</Text>
            <Text style={styles.addPhotoSourceLabel}>{pl.photos.camera}</Text>
          </Pressable>
          <Pressable style={styles.addPhotoSourceBtn} onPress={() => void pickFromSource(false)}>
            <Text style={styles.addPhotoSourceIcon}>🖼</Text>
            <Text style={styles.addPhotoSourceLabel}>{pl.photos.gallery}</Text>
          </Pressable>
        </View>
      )}

      {/* Preview after picking */}
      {useNativePicker && preview && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="cover" />
          <Pressable
            style={styles.previewRetakeBtn}
            onPress={() => { setPreview(null); setBase64(null); }}
            hitSlop={8}
          >
            <Text style={styles.previewRetakeText}>↺ Zmień</Text>
          </Pressable>
        </View>
      )}

      {/* ── URL fallback mode (native module absent) ── */}
      {useUrlFallback && (
        <TextInput
          style={styles.addPhotoInput}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://... (URL zdjęcia)"
          placeholderTextColor={Colors.starGhost}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoFocus
        />
      )}

      {/* Caption — shown in both modes when image/URL is ready */}
      {((useNativePicker && preview) || (useUrlFallback && urlInput.trim())) && (
        <TextInput
          style={styles.addPhotoInput}
          value={caption}
          onChangeText={setCaption}
          placeholder={pl.photos.captionHint}
          placeholderTextColor={Colors.starGhost}
          maxLength={300}
        />
      )}

      {/* Probing spinner */}
      {pickerAvailable === null && (
        <ActivityIndicator color={Colors.aurora} style={{ marginVertical: 8 }} />
      )}

      {/* Action buttons */}
      <View style={styles.addPhotoActions}>
        <Pressable style={styles.addPhotoCancelBtn} onPress={handleCancel}>
          <Text style={styles.addPhotoCancelText}>{pl.common.cancel}</Text>
        </Pressable>

        {/* Native upload button */}
        {useNativePicker && preview && (
          <Pressable
            style={[
              styles.addPhotoConfirmBtn,
              (!base64 || upload.isPending) && styles.addPhotoConfirmBtnDisabled,
            ]}
            onPress={handleUploadBase64}
            disabled={!base64 || upload.isPending}
          >
            {upload.isPending
              ? <ActivityIndicator size="small" color={Colors.void} />
              : <Text style={styles.addPhotoConfirmText}>{pl.photos.addBtn}</Text>
            }
          </Pressable>
        )}

        {/* URL fallback upload button */}
        {useUrlFallback && urlInput.trim().length > 0 && (
          <Pressable
            style={[
              styles.addPhotoConfirmBtn,
              upload.isPending && styles.addPhotoConfirmBtnDisabled,
            ]}
            onPress={handleUploadUrl}
            disabled={upload.isPending}
          >
            {upload.isPending
              ? <ActivityIndicator size="small" color={Colors.void} />
              : <Text style={styles.addPhotoConfirmText}>{pl.photos.addBtn}</Text>
            }
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { explorer } = useAuthStore();
  const { data: spot, isLoading, error } = useSpot(id ?? '');
  const { data: photos, isLoading: photosLoading } = useSpotPhotos(id ?? '');
  const saveSpot   = useSaveSpot();
  const unsaveSpot = useUnsaveSpot();
  const deleteSpot = useDeleteSpot();
  const [saved, setSaved]             = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);

  function handleDelete() {
    Alert.alert(
      'Usuń spot',
      `Czy na pewno chcesz usunąć "${title}"? Tej operacji nie można cofnąć.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń spot', style: 'destructive',
          onPress: async () => {
            try {
              await deleteSpot.mutateAsync(id ?? '');
              router.back();
            } catch {
              Alert.alert('Błąd', 'Nie udało się usunąć spotu.');
            }
          },
        },
      ],
    );
  }

  async function handleSave() {
    try {
      if (saved) {
        await unsaveSpot.mutateAsync(id ?? '');
        setSaved(false);
      } else {
        await saveSpot.mutateAsync(id ?? '');
        setSaved(true);
      }
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać spotu.');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </View>
    );
  }

  if (error || !spot) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nie znaleziono spotu.</Text>
        <SignalButton label="Wróć" onPress={() => router.back()} variant="ghost" size="sm" />
      </View>
    );
  }

  const isLocked  = 'locked' in spot && spot.locked;
  const category  = 'category' in spot ? (spot as { category: string }).category : 'ABANDONED';
  const title     = 'title' in spot ? (spot as { title: string }).title : '???';
  const story     = 'story' in spot ? (spot as { story?: string }).story : undefined;
  const access    = 'accessLevel' in spot ? (spot as { accessLevel: string }).accessLevel : '';
  const dropExp   = 'dropExpiresAt' in spot ? (spot as { dropExpiresAt?: string }).dropExpiresAt : undefined;
  const isOwner   = 'ownerId' in spot && (spot as { ownerId: string }).ownerId === explorer?.id;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>← Wróć</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.category}>
            {CATEGORY_ICONS[category] ?? '◎'}{'  '}{CATEGORY_LABELS[category] ?? category}
          </Text>
          <Text style={[styles.title, isLocked && styles.titleLocked]}>{title}</Text>
          <CoordLabel lat={spot.lat} lng={spot.lng} locked={isLocked} />

          <View style={styles.accessRow}>
            <View style={[
              styles.accessBadge,
              access === 'SECRET_DROP' && styles.accessBadgeEmber,
              access === 'CIRCLE_ONLY' && styles.accessBadgeViolet,
            ]}>
              <Text style={[
                styles.accessBadgeText,
                access === 'SECRET_DROP' && { color: Colors.ember },
                access === 'CIRCLE_ONLY' && { color: Colors.violet },
              ]}>
                {ACCESS_LABELS[access] ?? access}
              </Text>
            </View>
            {dropExp && (
              <Text style={styles.dropExpiry}>
                ⬡ {new Date(dropExp).toLocaleString('pl-PL', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
          </View>
        </View>

        {isLocked ? (
          <LockedOverlay requiredAccess={(spot as { requiredAccess: string }).requiredAccess} />
        ) : (
          <View style={styles.content}>
            {/* Story */}
            {story && (
              <GlassCard style={styles.storyCard}>
                <Text style={styles.storyLabel}>Historia miejsca</Text>
                <Text style={styles.storyText}>{story}</Text>
              </GlassCard>
            )}

            {/* Photos section */}
            <View style={styles.photosSection}>
              <View style={styles.photosSectionHeader}>
                <Text style={styles.sectionLabel}>
                  Zdjęcia{photos && photos.length > 0 ? ` (${photos.length})` : ''}
                </Text>
                {!addingPhoto && (
                  <Pressable
                    style={styles.addPhotoBtn}
                    onPress={() => setAddingPhoto(true)}
                    hitSlop={8}
                  >
                    <Text style={styles.addPhotoBtnText}>+ {pl.photos.addPhoto}</Text>
                  </Pressable>
                )}
              </View>

              {addingPhoto && (
                <AddPhotoPanel
                  spotId={id ?? ''}
                  onDone={() => setAddingPhoto(false)}
                />
              )}

              {photosLoading ? (
                <ActivityIndicator color={Colors.aurora} style={{ marginVertical: Spacing.lg }} />
              ) : !photos || photos.length === 0 ? (
                <GlassCard style={styles.noPhotosCard}>
                  <Text style={styles.noPhotosIcon}>◈</Text>
                  <Text style={styles.noPhotosText}>
                    Brak zdjęć. Bądź pierwszym który udokumentuje to miejsce.
                  </Text>
                </GlassCard>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoScroll}
                  decelerationRate="fast"
                  snapToInterval={PHOTO_W + Spacing.md}
                >
                  {photos.map((photo) => (
                    <PhotoItem
                      key={photo.id}
                      url={photo.url}
                      caption={photo.caption}
                      photoId={photo.id}
                      spotId={id ?? ''}
                      isOwn={photo.uploaderId === explorer?.id}
                    />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Save action */}
            <SignalButton
              label={saved ? '◈ Zapisano w Saved Worlds' : '◎ Zapisz w Saved Worlds'}
              onPress={handleSave}
              variant={saved ? 'aurora' : 'signal'}
              size="md"
              fullWidth
              haptic="medium"
              loading={saveSpot.isPending || unsaveSpot.isPending}
            />

            {isOwner && (
              <GlassCard style={styles.ownerCard}>
                <View style={styles.ownerRow}>
                  <View>
                    <Text style={styles.ownerLabel}>Twój spot</Text>
                    <Text style={styles.ownerSub}>Jesteś autorem tego miejsca.</Text>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={handleDelete}
                    disabled={deleteSpot.isPending}
                    hitSlop={8}
                  >
                    {deleteSpot.isPending
                      ? <ActivityIndicator size="small" color={Colors.ember} />
                      : <Text style={styles.deleteBtnText}>Usuń</Text>
                    }
                  </Pressable>
                </View>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.huge },

  back:     { alignSelf: 'flex-start' },
  backText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },

  header:   { gap: Spacing.sm },
  category: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  title:    { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight, letterSpacing: -0.5 },
  titleLocked: { color: Colors.starGhost },

  accessRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  accessBadge:       { borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  accessBadgeEmber:  { borderColor: Colors.ember + '50' },
  accessBadgeViolet: { borderColor: Colors.violet + '50' },
  accessBadgeText:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase' },
  dropExpiry:        { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.ember },

  lockedCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl },
  lockIcon:   { fontSize: 48 },
  lockTitle:  { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, color: Colors.starlight },
  lockDesc:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.ember, textTransform: 'uppercase', letterSpacing: 1 },
  lockHint:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },

  content:    { gap: Spacing.lg },
  storyCard:  { gap: Spacing.sm },
  storyLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  storyText:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.star, lineHeight: 26 },

  // Photos
  photosSection:       { gap: Spacing.md },
  photosSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel:        { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  addPhotoBtn:         { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.aurora + '60' },
  addPhotoBtnText:     { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.aurora },

  // Add photo panel (ImagePicker)
  addPhotoPanel: {
    backgroundColor: Colors.graphite, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.steel,
    padding: Spacing.lg, gap: Spacing.md,
  },
  addPhotoTitle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },

  // Source picker row (camera / gallery)
  addPhotoSourceRow: { flexDirection: 'row', gap: Spacing.md },
  addPhotoSourceBtn: {
    flex: 1, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.abyss, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.steel,
    paddingVertical: Spacing.lg,
  },
  addPhotoSourceIcon:  { fontSize: 28 },
  addPhotoSourceLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.star },

  // Preview after picking
  previewContainer: { position: 'relative', borderRadius: BorderRadius.lg, overflow: 'hidden' },
  previewImg:       { width: '100%', height: 180, borderRadius: BorderRadius.lg },
  previewRetakeBtn: {
    position: 'absolute', bottom: Spacing.sm, right: Spacing.sm,
    backgroundColor: Colors.void + 'CC', borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  previewRetakeText: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint },

  addPhotoInput: {
    height: 44, borderRadius: BorderRadius.lg, backgroundColor: Colors.abyss,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starlight,
  },
  addPhotoActions:            { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  addPhotoCancelBtn:          { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  addPhotoCancelText:         { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  addPhotoConfirmBtn:         { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.aurora },
  addPhotoConfirmBtnDisabled: { opacity: 0.4 },
  addPhotoConfirmText:        { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.void },

  photoScroll: { paddingVertical: Spacing.xs, paddingRight: Spacing.xl, gap: Spacing.md },
  photoItem: {
    width: PHOTO_W, borderRadius: BorderRadius.xl,
    overflow: 'hidden', backgroundColor: Colors.graphite,
    ...Shadow.card,
  },
  photoImg:        { width: PHOTO_W, height: PHOTO_H },
  photoCaption:    { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.star, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, lineHeight: 18 },
  photoDeleteBtn:  { position: 'absolute', top: Spacing.sm, right: Spacing.sm, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.void + 'CC', alignItems: 'center', justifyContent: 'center' },
  photoDeleteText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },

  noPhotosCard: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  noPhotosIcon: { fontSize: 32, color: Colors.starGhost },
  noPhotosText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starGhost, textAlign: 'center', lineHeight: 20 },

  ownerCard:  { gap: Spacing.xs },
  ownerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ownerLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.aurora, textTransform: 'uppercase', letterSpacing: 1 },
  ownerSub:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  deleteBtn:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.ember + '60' },
  deleteBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.ember },
  errorText:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.ember },
});
