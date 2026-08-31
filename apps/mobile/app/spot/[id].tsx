import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, Dimensions, Alert, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming,
  FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import * as ImagePickerTypes from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CoordLabel } from '@/components/ui/CoordLabel';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import {
  useSpot, useSaveSpot, useUnsaveSpot,
  useSpotPhotos, useUploadSpotPhoto, useDeleteSpotPhoto, useDeleteSpot, useUpdateSpot,
} from '@/hooks/useSpots';
import {
  useSpotReactions, useToggleReaction,
  useSpotVerifications, useVerifySpot, useCanVerify,
  type ReactionType,
} from '@/hooks/useReactions';
import { useAuthStore } from '@/stores/auth';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_W  = SCREEN_W * 0.72;
const PHOTO_H  = PHOTO_W * 0.68;

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


function AddPhotoPanel({
  spotId,
  onDone,
}: { spotId: string; onDone: () => void }) {
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ uri: string; mimeType: string } | null>(null);
  const upload = useUploadSpotPhoto();

  async function pickFromSource(useCamera: boolean) {
    try {
      const perm = useCamera
        ? await ImagePickerTypes.requestCameraPermissionsAsync()
        : await ImagePickerTypes.requestMediaLibraryPermissionsAsync();

      if (perm.status !== 'granted') {
        Alert.alert(pl.common.error, pl.photos.permissionDenied);
        return;
      }

      const result = useCamera
        ? await ImagePickerTypes.launchCameraAsync({ mediaTypes: ['images'], quality: 0.82, exif: false })
        : await ImagePickerTypes.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82, exif: false, selectionLimit: 1 });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPreview(asset.uri);
      setSelected({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    } catch {
      Alert.alert(pl.common.error, pl.photos.uploadFailed);
    }
  }

  async function handleUpload() {
    if (!selected) return;
    try {
      await upload.mutateAsync({
        spotId,
        uri: selected.uri,
        mimeType: selected.mimeType,
        caption: caption.trim() || undefined,
      });
      onDone();
    } catch {
      Alert.alert(pl.common.error, pl.photos.uploadFailed);
    }
  }

  function handleCancel() {
    setPreview(null);
    setSelected(null);
    setCaption('');
    onDone();
  }

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.addPhotoPanel}>
      <Text style={styles.addPhotoTitle}>{pl.photos.addPhoto}</Text>

      {/* Source picker — camera / gallery */}
      {!preview && (
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
      {preview && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="cover" />
          <Pressable
            style={styles.previewRetakeBtn}
            onPress={() => { setPreview(null); setSelected(null); }}
            hitSlop={8}
          >
            <Text style={styles.previewRetakeText}>↺ Zmień</Text>
          </Pressable>
        </View>
      )}

      {/* Caption — only after picking */}
      {preview && (
        <TextInput
          style={styles.addPhotoInput}
          value={caption}
          onChangeText={setCaption}
          placeholder={pl.photos.captionHint}
          placeholderTextColor={Colors.starGhost}
          maxLength={300}
        />
      )}

      {/* Actions */}
      <View style={styles.addPhotoActions}>
        <Pressable style={styles.addPhotoCancelBtn} onPress={handleCancel}>
          <Text style={styles.addPhotoCancelText}>{pl.common.cancel}</Text>
        </Pressable>

        {preview && (
          <Pressable
            style={[
              styles.addPhotoConfirmBtn,
              (!selected || upload.isPending) && styles.addPhotoConfirmBtnDisabled,
            ]}
            onPress={handleUpload}
            disabled={!selected || upload.isPending}
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

// ─── Edit spot modal ──────────────────────────────────────────────────────────
const ACCESS_EDIT_OPTIONS = ['PUBLIC', 'TRUSTED', 'CIRCLE_ONLY', 'SECRET_DROP'] as const;

function EditSpotModal({
  visible, spotId, initialTitle, initialStory, initialAccess, onClose, onSaved,
}: {
  visible: boolean;
  spotId: string;
  initialTitle: string;
  initialStory: string;
  initialAccess: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle]   = useState(initialTitle);
  const [story, setStory]   = useState(initialStory);
  const [access, setAccess] = useState(initialAccess);
  const [saving, setSaving] = useState(false);
  const updateSpot = useUpdateSpot();

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setStory(initialStory);
      setAccess(initialAccess);
    }
  }, [visible]);

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Błąd', 'Tytuł nie może być pusty.'); return; }
    setSaving(true);
    try {
      await updateSpot.mutateAsync({
        id: spotId,
        title: title.trim(),
        story: story.trim() || undefined,
        accessLevel: access,
      });
      onSaved();
      onClose();
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać zmian.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={editSpotStyles.root} edges={['top', 'bottom']}>
          <View style={editSpotStyles.header}>
            <Text style={editSpotStyles.title}>Edytuj spot</Text>
            <Pressable onPress={onClose} style={editSpotStyles.closeBtn}>
              <Text style={editSpotStyles.closeBtnText}>Anuluj</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={editSpotStyles.scroll}>
            <View style={editSpotStyles.field}>
              <Text style={editSpotStyles.label}>Tytuł</Text>
              <TextInput
                style={editSpotStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Nazwa miejsca"
                placeholderTextColor={Colors.starGhost}
                maxLength={120}
              />
              <Text style={editSpotStyles.counter}>{title.length}/120</Text>
            </View>

            <View style={editSpotStyles.field}>
              <Text style={editSpotStyles.label}>Historia miejsca</Text>
              <TextInput
                style={[editSpotStyles.input, editSpotStyles.inputMultiline]}
                value={story}
                onChangeText={setStory}
                placeholder="Opowiedz o tym miejscu..."
                placeholderTextColor={Colors.starGhost}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={editSpotStyles.counter}>{story.length}/2000</Text>
            </View>

            <View style={editSpotStyles.field}>
              <Text style={editSpotStyles.label}>Poziom dostępu</Text>
              <View style={editSpotStyles.accessOptions}>
                {ACCESS_EDIT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={[editSpotStyles.accessOption, access === opt && editSpotStyles.accessOptionActive]}
                    onPress={() => setAccess(opt)}
                  >
                    <Text style={[editSpotStyles.accessOptionText, access === opt && editSpotStyles.accessOptionTextActive]}>
                      {ACCESS_LABELS[opt] ?? opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={editSpotStyles.footer}>
            <SignalButton
              label="Zapisz zmiany"
              onPress={handleSave}
              variant="aurora"
              size="lg"
              fullWidth
              loading={saving}
              haptic="medium"
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Reactions row ────────────────────────────────────────────────────────────
const REACTION_META: { type: ReactionType; icon: string; label: string }[] = [
  { type: 'LIKE',        icon: '♥', label: 'Lubię' },
  { type: 'INSIGHTFUL',  icon: '◈', label: 'Ciekawe' },
  { type: 'HIDDEN_GEM',  icon: '◉', label: 'Klejnot' },
];

function ReactionsRow({ spotId }: { spotId: string }) {
  const { data } = useSpotReactions(spotId);
  const toggle   = useToggleReaction(spotId);

  async function handleToggle(type: ReactionType) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle.mutate(type);
  }

  return (
    <View style={rxStyles.row}>
      {REACTION_META.map(({ type, icon, label }) => {
        const active = data?.myReaction === type;
        const count  = data?.counts?.[type] ?? 0;
        return (
          <Pressable
            key={type}
            style={[rxStyles.btn, active && rxStyles.btnActive]}
            onPress={() => void handleToggle(type)}
            disabled={toggle.isPending}
          >
            <Text style={[rxStyles.icon, active && rxStyles.iconActive]}>{icon}</Text>
            <Text style={[rxStyles.label, active && rxStyles.labelActive]}>{label}</Text>
            {count > 0 && (
              <View style={rxStyles.countBadge}>
                <Text style={rxStyles.countText}>{count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Verification panel ───────────────────────────────────────────────────────
function VerificationPanel({ spotId, isOwner, isLocked }: {
  spotId: string; isOwner: boolean; isLocked: boolean;
}) {
  const canVerify = useCanVerify(isOwner, isLocked);
  const { data }  = useSpotVerifications(spotId);
  const verify    = useVerifySpot(spotId);
  const [sending, setSending] = useState(false);

  if (!canVerify) return null;

  async function handleDecision(decision: 'CONFIRMED' | 'REJECTED') {
    if (data?.myDecision) return;
    setSending(true);
    try {
      await verify.mutateAsync({ decision });
      await Haptics.notificationAsync(
        decision === 'CONFIRMED'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać weryfikacji.');
    } finally {
      setSending(false);
    }
  }

  const myDecision = data?.myDecision;

  return (
    <GlassCard style={vStyles.card}>
      <Text style={vStyles.label}>Weryfikacja spotu</Text>
      <View style={vStyles.counts}>
        <Text style={vStyles.confirmed}>✓ {data?.confirmedCount ?? 0} potwierdzone</Text>
        <Text style={vStyles.rejected}>✕ {data?.rejectedCount ?? 0} odrzucone</Text>
      </View>
      {myDecision ? (
        <Text style={[
          vStyles.voted,
          myDecision === 'CONFIRMED' ? vStyles.votedConfirmed : vStyles.votedRejected,
        ]}>
          {myDecision === 'CONFIRMED' ? '✓ Potwierdziłeś ten spot' : '✕ Odrzuciłeś ten spot'}
        </Text>
      ) : (
        <View style={vStyles.actions}>
          <Pressable
            style={[vStyles.btn, vStyles.confirmBtn]}
            onPress={() => void handleDecision('CONFIRMED')}
            disabled={sending}
          >
            <Text style={vStyles.confirmText}>✓ Potwierdź</Text>
          </Pressable>
          <Pressable
            style={[vStyles.btn, vStyles.rejectBtn]}
            onPress={() => void handleDecision('REJECTED')}
            disabled={sending}
          >
            <Text style={vStyles.rejectText}>✕ Odrzuć</Text>
          </Pressable>
        </View>
      )}
    </GlassCard>
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
  const [editVisible, setEditVisible] = useState(false);

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

            {/* Reactions */}
            <ReactionsRow spotId={id ?? ''} />

            {/* Verification — TRUSTED+ non-owners only */}
            <VerificationPanel spotId={id ?? ''} isOwner={isOwner} isLocked={isLocked} />

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
                  <View style={styles.ownerActions}>
                    <Pressable
                      style={styles.editBtn}
                      onPress={() => setEditVisible(true)}
                      hitSlop={8}
                    >
                      <Text style={styles.editBtnText}>Edytuj</Text>
                    </Pressable>
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
                </View>
              </GlassCard>
            )}
          </View>
        )}
      </ScrollView>

      <EditSpotModal
        visible={editVisible}
        spotId={id ?? ''}
        initialTitle={title}
        initialStory={story ?? ''}
        initialAccess={access}
        onClose={() => setEditVisible(false)}
        onSaved={() => setEditVisible(false)}
      />
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
  ownerActions: { flexDirection: 'row', gap: Spacing.sm },
  editBtn:    { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.signal + '60' },
  editBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.signal },
  deleteBtn:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.ember + '60' },
  deleteBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.ember },
  errorText:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.ember },
});

const rxStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  btnActive: { borderColor: Colors.aurora + '60', backgroundColor: Colors.aurora + '12' },
  icon:       { fontFamily: 'GeneralSans-Regular', fontSize: 16, color: Colors.starGhost },
  iconActive: { color: Colors.aurora },
  label:      { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint },
  labelActive: { color: Colors.aurora },
  countBadge: {
    backgroundColor: Colors.aurora + '30', borderRadius: 999,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  countText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.aurora },
});

const vStyles = StyleSheet.create({
  card:    { gap: Spacing.sm },
  label:   { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  counts:  { flexDirection: 'row', gap: Spacing.lg },
  confirmed: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },
  rejected:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.ember },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl,
    borderWidth: 1, alignItems: 'center',
  },
  confirmBtn:    { borderColor: Colors.aurora + '60', backgroundColor: Colors.aurora + '10' },
  confirmText:   { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
  rejectBtn:     { borderColor: Colors.ember + '60', backgroundColor: Colors.ember + '10' },
  rejectText:    { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.ember },
  voted:         { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, textAlign: 'center' },
  votedConfirmed: { color: Colors.aurora },
  votedRejected:  { color: Colors.ember },
});

const editSpotStyles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.steel,
  },
  title:        { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  closeBtn:     { padding: Spacing.sm },
  closeBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starFaint },
  scroll:  { padding: Spacing.xl, gap: Spacing.xl },
  field:   { gap: Spacing.sm },
  label:   { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: Colors.graphite, borderWidth: 1, borderColor: Colors.steel,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
  },
  inputMultiline: { height: 140, paddingTop: Spacing.md },
  counter: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, textAlign: 'right' },
  accessOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  accessOption: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.steel,
  },
  accessOptionActive: { borderColor: Colors.aurora, backgroundColor: Colors.aurora + '15' },
  accessOptionText:   { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase' },
  accessOptionTextActive: { color: Colors.aurora },
  footer: { padding: Spacing.xl },
});
