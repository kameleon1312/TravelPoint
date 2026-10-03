import { View, Text, ScrollView, StyleSheet, Modal, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, Clipboard, Switch, ActivityIndicator, Image } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence,
} from 'react-native-reanimated';
import * as ImagePickerTypes from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';
import { SignalButton } from '@/components/ui/SignalButton';
import { useMarkSignalsSeen, useInfiniteSignals, SIGNAL_LABELS, SIGNAL_ICONS } from '@/hooks/useSignals';
import { formatRelative } from '@travelpoint/utils';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { supabase } from '@/lib/supabase';
import type { Signal } from '@travelpoint/types';
import { RANK_THRESHOLDS, RANK_LABELS, RANK_START } from '@travelpoint/types';
import type { Rank, Archetype } from '@travelpoint/types';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';

const RANK_COLORS: Record<string, string> = {
  NEWCOMER: Colors.starGhost,
  EXPLORER: Colors.star,
  TRUSTED:  Colors.signal,
  INSIDER:  Colors.aurora,
  LEGEND:   Colors.ember,
};

const TIER_BADGE_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  FREE:       { border: Colors.starGhost + '60', bg: 'transparent',        text: Colors.starFaint, label: 'Explorer' },
  PRO:        { border: Colors.signal + '60',    bg: Colors.signal + '18', text: Colors.signal,    label: 'Explorer PRO' },
  EXPEDITION: { border: Colors.ember + '60',     bg: Colors.ember + '18',  text: Colors.ember,     label: 'Expedition' },
};

const ARCHETYPES: Archetype[] = ['WANDERER', 'URBEXER', 'NOMAD', 'HUNTER', 'PILGRIM'];
const ARCHETYPE_LABELS: Record<string, string> = {
  WANDERER: 'Wędrowiec',
  URBEXER:  'Urbex',
  NOMAD:    'Nomada',
  HUNTER:   'Łowca',
  PILGRIM:  'Pielgrzym',
};
const ARCHETYPE_ICONS: Record<string, string> = {
  WANDERER: '◉', URBEXER: '◈', NOMAD: '◎', HUNTER: '◈', PILGRIM: '◉',
};
const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  WANDERER: 'Poszukujesz nowych ścieżek bez konkretnego celu. Impuls i ciekawość prowadzą.',
  URBEXER:  'Odkrywasz opuszczone miejsca i ukrytą historię miast.',
  NOMAD:    'Żadnego stałego miejsca. Każde miasto to nowy dom i nowe możliwości.',
  HUNTER:   'Tropiący rzadkich miejsc i tajemnych dropów. Zawsze w pogoni.',
  PILGRIM:  'Podróże z głębszym znaczeniem — miejsca, które zmieniają perspektywę.',
};
const RANK_UP_DESCRIPTIONS: Record<string, string> = {
  EXPLORER: 'Twoja sieć połączeń rośnie. Dostęp do ukrytych spotów się poszerzył.',
  TRUSTED:  'Inni exploratorzy Ci ufają. Odkrywasz to, czego inni nie widzą.',
  INSIDER:  'Należysz do elity. Tajne dropy i specjalne zaproszenia czekają.',
  LEGEND:   'Twoja legenda jest zapisana w annałach TravelPoint.',
};

const NAVIGABLE_SIGNAL_TYPES = new Set([
  'SPOT_UNLOCKED', 'SECRET_DROP', 'JOURNEY_LIKE', 'TRANSMISSION', 'CIRCLE_INVITE', 'SPOT_COMMENT', 'NEARBY_SPOT',
]);

function SignalRow({ sig }: { sig: Signal }) {
  function handlePress() {
    const p = sig.payload as Record<string, unknown>;
    switch (sig.type) {
      case 'SPOT_UNLOCKED':
      case 'SECRET_DROP':
      case 'NEARBY_SPOT':
      case 'SPOT_COMMENT':
        router.push(`/spot/${String(p['spotId'] ?? p['id'] ?? '')}`);
        break;
      case 'JOURNEY_LIKE':
        router.push(`/journey/${String(p['journeyId'] ?? p['id'] ?? '')}`);
        break;
      case 'TRANSMISSION':
        router.push('/modals/transmissions');
        break;
      case 'CIRCLE_INVITE':
        router.push('/(tabs)/circles');
        break;
      default:
        break;
    }
  }

  const navigable = NAVIGABLE_SIGNAL_TYPES.has(sig.type);

  return (
    <Pressable
      onPress={navigable ? handlePress : undefined}
      style={[styles.signalRow, !sig.seenAt && styles.signalRowUnseen]}
    >
      <Text style={[styles.signalIcon, !sig.seenAt && { color: Colors.aurora }]}>
        {SIGNAL_ICONS[sig.type] ?? '◎'}
      </Text>
      <View style={styles.signalBody}>
        <Text style={[styles.signalLabel, !sig.seenAt && { color: Colors.starlight }]}>
          {SIGNAL_LABELS[sig.type] ?? sig.type}
        </Text>
        <Text style={styles.signalTime}>{formatRelative(sig.createdAt)}</Text>
      </View>
      {!sig.seenAt && <View style={styles.signalDot} />}
      {navigable && <Text style={styles.signalChevron}>›</Text>}
    </Pressable>
  );
}

function EditProfileModal({
  visible,
  displayName,
  bio,
  onClose,
  onSave,
}: {
  visible: boolean;
  displayName: string;
  bio: string;
  onClose: () => void;
  onSave: (displayName: string, bio: string) => Promise<void>;
}) {
  const [name, setName] = useState(displayName);
  const [bioText, setBioText] = useState(bio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(displayName);
      setBioText(bio);
    }
  }, [visible]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(name, bioText);
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
        <SafeAreaView style={editStyles.root} edges={['top', 'bottom']}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>Edytuj tożsamość</Text>
            <Pressable onPress={onClose} style={editStyles.closeBtn}>
              <Text style={editStyles.closeBtnText}>Anuluj</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={editStyles.scroll}>
            <View style={editStyles.field}>
              <Text style={editStyles.label}>Imię wyświetlane</Text>
              <TextInput
                style={editStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Jak mają Cię widzieć inni?"
                placeholderTextColor={Colors.starGhost}
                maxLength={50}
              />
            </View>

            <View style={editStyles.field}>
              <Text style={editStyles.label}>Bio</Text>
              <TextInput
                style={[editStyles.input, editStyles.inputMultiline]}
                value={bioText}
                onChangeText={setBioText}
                placeholder="Kilka słów o sobie..."
                placeholderTextColor={Colors.starGhost}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={editStyles.counter}>{bioText.length}/200</Text>
            </View>
          </ScrollView>

          <View style={editStyles.footer}>
            <SignalButton
              label="Zapisz"
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

// ── Rank-up celebratory modal ─────────────────────────────────────────────────
function RankUpModal({ rank, onDismiss }: { rank: Rank; onDismiss: () => void }) {
  const cardScale   = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);
  const ringScale   = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.8);
  const rankColor   = RANK_COLORS[rank] ?? Colors.aurora;

  useEffect(() => {
    cardScale.value   = withSpring(1, { damping: 12, stiffness: 180 });
    cardOpacity.value = withTiming(1, { duration: 350 });
    ringScale.value   = withRepeat(
      withSequence(withTiming(1.6, { duration: 1400 }), withTiming(0.9, { duration: 900 })),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0.12, { duration: 1400 }), withTiming(0.5, { duration: 900 })),
      -1,
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={rankUpStyles.overlay}>
        <Animated.View style={[rankUpStyles.glowRing, { borderColor: rankColor }, ringStyle]} />
        <Animated.View style={[rankUpStyles.card, cardStyle]}>
          <Text style={rankUpStyles.eyebrow}>Nowa ranga odblokowana</Text>
          <View style={[rankUpStyles.rankBadge, { borderColor: rankColor }]}>
            <Text style={[rankUpStyles.rankBadgeText, { color: rankColor }]}>
              {RANK_LABELS[rank]}
            </Text>
          </View>
          <Text style={rankUpStyles.desc}>{RANK_UP_DESCRIPTIONS[rank] ?? ''}</Text>
          <SignalButton label="Dalej" onPress={onDismiss} variant="aurora" size="md" haptic="heavy" />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Archetype picker modal ────────────────────────────────────────────────────
function ArchetypePickerModal({
  visible, current, onClose, onSave,
}: {
  visible: boolean;
  current: Archetype;
  onClose: () => void;
  onSave: (arch: Archetype) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Archetype>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) setSelected(current); }, [visible]);

  async function handleSave() {
    setSaving(true);
    try { await onSave(selected); onClose(); }
    catch { Alert.alert('Błąd', 'Nie udało się zapisać archetypu.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={editStyles.root} edges={['top', 'bottom']}>
        <View style={editStyles.header}>
          <Text style={editStyles.title}>Twój archetyp</Text>
          <Pressable onPress={onClose} style={editStyles.closeBtn}>
            <Text style={editStyles.closeBtnText}>Anuluj</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={archStyles.scroll}>
          <Text style={archStyles.subtitle}>
            Archetyp kształtuje Twoją tożsamość w sieciach TravelPoint.
          </Text>
          {ARCHETYPES.map((arch) => {
            const isActive = selected === arch;
            return (
              <Pressable
                key={arch}
                style={[archStyles.card, isActive && archStyles.cardActive]}
                onPress={() => setSelected(arch)}
              >
                <Text style={[archStyles.cardIcon, isActive && { color: Colors.aurora }]}>
                  {ARCHETYPE_ICONS[arch]}
                </Text>
                <View style={archStyles.cardBody}>
                  <Text style={[archStyles.cardTitle, isActive && { color: Colors.aurora }]}>
                    {ARCHETYPE_LABELS[arch]}
                  </Text>
                  <Text style={archStyles.cardDesc}>{ARCHETYPE_DESCRIPTIONS[arch]}</Text>
                </View>
                {isActive && <Text style={archStyles.cardCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={editStyles.footer}>
          <SignalButton
            label="Zapisz archetyp"
            onPress={handleSave}
            variant="aurora"
            size="lg"
            fullWidth
            loading={saving}
            disabled={selected === current}
            haptic="medium"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Obsessions editor modal ───────────────────────────────────────────────────
const MAX_OBSESSIONS = 10;

function ObsessionsModal({
  visible, current, onClose, onSave,
}: {
  visible: boolean;
  current: string[];
  onClose: () => void;
  onSave: (tags: string[]) => Promise<void>;
}) {
  const [tags, setTags] = useState<string[]>([...current]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setTags([...current]); setInput(''); }
  }, [visible]);

  function handleAdd() {
    const tag = input.trim().toLowerCase();
    if (!tag || tag.length > 30 || tags.includes(tag) || tags.length >= MAX_OBSESSIONS) return;
    setTags([...tags, tag]);
    setInput('');
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave(tags); onClose(); }
    catch { Alert.alert('Błąd', 'Nie udało się zapisać obsesji.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={editStyles.root} edges={['top', 'bottom']}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>Obsesje</Text>
            <Pressable onPress={onClose} style={editStyles.closeBtn}>
              <Text style={editStyles.closeBtnText}>Anuluj</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={obsStyles.scroll}>
            <Text style={obsStyles.subtitle}>
              Twoje obsesje pojawiają się na profilu. Maks {MAX_OBSESSIONS} tagów, każdy do 30 znaków.
            </Text>
            {tags.length > 0 ? (
              <View style={obsStyles.tagsWrap}>
                {tags.map((tag) => (
                  <View key={tag} style={obsStyles.tagItem}>
                    <Text style={obsStyles.tagItemText}>{tag}</Text>
                    <Pressable onPress={() => setTags(tags.filter((t) => t !== tag))} hitSlop={6}>
                      <Text style={obsStyles.tagRemove}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={obsStyles.emptyNote}>Brak obsesji. Dodaj pierwsze słowo-klucz.</Text>
            )}
            {tags.length < MAX_OBSESSIONS && (
              <View style={obsStyles.addRow}>
                <TextInput
                  style={obsStyles.addInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="urbex, góry, opuszczone..."
                  placeholderTextColor={Colors.starGhost}
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  autoCapitalize="none"
                />
                <Pressable
                  style={[obsStyles.addBtn, !input.trim() && obsStyles.addBtnDisabled]}
                  onPress={handleAdd}
                  disabled={!input.trim()}
                >
                  <Text style={obsStyles.addBtnText}>+</Text>
                </Pressable>
              </View>
            )}
            <Text style={obsStyles.counter}>{tags.length}/{MAX_OBSESSIONS}</Text>
          </ScrollView>
          <View style={editStyles.footer}>
            <SignalButton
              label="Zapisz"
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

// ── Change Password Modal ──────────────────────────────────────────────────────
function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  function reset() {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    setError('');
    if (newPassword.length < 12) {
      setError('Hasło musi mieć minimum 12 znaków.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }
    setSaving(true);
    try {
      const { error: supabaseError } = await supabase.auth.updateUser({ password: newPassword });
      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }
      reset();
      onClose();
      Alert.alert('Hasło zmienione', 'Twoje nowe hasło zostało zapisane.');
    } catch {
      setError('Nie udało się zmienić hasła. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={editStyles.root} edges={['top', 'bottom']}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>Zmień hasło</Text>
            <Pressable onPress={handleClose} style={editStyles.closeBtn}>
              <Text style={editStyles.closeBtnText}>Anuluj</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={editStyles.scroll}>
            <View style={editStyles.field}>
              <Text style={editStyles.label}>Nowe hasło</Text>
              <TextInput
                style={editStyles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 12 znaków"
                placeholderTextColor={Colors.starGhost}
                secureTextEntry
                autoComplete="new-password"
                maxLength={128}
              />
            </View>

            <View style={editStyles.field}>
              <Text style={editStyles.label}>Powtórz hasło</Text>
              <TextInput
                style={editStyles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Wpisz ponownie"
                placeholderTextColor={Colors.starGhost}
                secureTextEntry
                autoComplete="new-password"
                maxLength={128}
              />
            </View>

            {error ? (
              <View style={pwStyles.errorBox}>
                <Text style={pwStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={pwStyles.hint}>
              Hasło musi mieć co najmniej 12 znaków. Po zmianie zostaniesz zalogowany automatycznie.
            </Text>
          </ScrollView>

          <View style={editStyles.footer}>
            <SignalButton
              label="Zmień hasło"
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

type ExportContent = {
  spots: unknown[];
  journeys: unknown[];
  circles: unknown[];
  signals: unknown[];
};

type ExportPayload = {
  exportedAt: string;
  exportVersion: string;
  privacyNote: string[];
  explorer: Record<string, unknown>;
  content: ExportContent;
};

export default function IdentityScreen() {
  const { explorer, logout, setExplorer, deleteAccount, pendingRankUp, clearPendingRankUp } = useAuthStore();
  const { mutate: markSeen, isPending: markingAllSeen } = useMarkSignalsSeen();
  const signalsQuery = useInfiniteSignals();
  const allSignals = signalsQuery.data?.pages.flatMap((p) => p.signals) ?? [];
  const avatarUpload = useAvatarUpload();
  const [editVisible, setEditVisible]                     = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [archPickerVisible, setArchPickerVisible]         = useState(false);
  const [obsModalVisible, setObsModalVisible]             = useState(false);
  const [isExporting, setIsExporting]               = useState(false);
  const [isDeleting, setIsDeleting]             = useState(false);
  const [presenceToggling, setPresenceToggling] = useState(false);
  const [locationToggling, setLocationToggling] = useState(false);
  const [homeBaseSaving, setHomeBaseSaving] = useState(false);
  // Real device-level location permission status (checked on mount).
  const [deviceLocationGranted, setDeviceLocationGranted] = useState(false);

  useEffect(() => { markSeen(); }, []);

  // Check actual device permission on every visit so display stays accurate.
  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then(({ status }) => {
      setDeviceLocationGranted(status === 'granted');
    });
  }, []);

  if (!explorer) {
    return (
      <SafeAreaView style={styles.loadingRoot} edges={['top']}>
        <ActivityIndicator color={Colors.aurora} size="large" />
      </SafeAreaView>
    );
  }

  const rankColor = RANK_COLORS[explorer.rank] ?? Colors.starGhost;

  async function handleSaveProfile(displayName: string, bio: string) {
    const updated = await api.patch<typeof explorer>('/api/explorers/me', { displayName, bio });
    setExplorer(updated);
  }

  async function handleSaveArchetype(arch: Archetype) {
    const updated = await api.patch<typeof explorer>('/api/explorers/me', { archetype: arch });
    setExplorer(updated);
  }

  async function handleSaveObsessions(obsessions: string[]) {
    const updated = await api.patch<typeof explorer>('/api/explorers/me', { obsessions });
    setExplorer(updated);
  }

  async function handleAvatarPick() {
    try {
      const perm = await ImagePickerTypes.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Uprawnienie wymagane', 'Zezwól na dostęp do galerii zdjęć.');
        return;
      }
      const result = await ImagePickerTypes.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.82,
        exif: false,
        selectionLimit: 1,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await avatarUpload.mutateAsync({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    } catch {
      Alert.alert('Błąd', 'Nie udało się zaktualizować awatara.');
    }
  }

  function handleExportData() {
    Alert.alert(
      'Eksport danych',
      'Pobierzesz kopię wszystkich swoich danych zgodnie z RODO (Art. 20). Dane zostaną skopiowane do schowka w formacie JSON.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Eksportuj',
          onPress: async () => {
            setIsExporting(true);
            try {
              const data = await api.get<ExportPayload>('/api/explorers/me/export');
              const json = JSON.stringify(data, null, 2);
              Clipboard.setString(json);

              const c = data.content;
              Alert.alert(
                'Eksport gotowy',
                `Dane skopiowane do schowka.\n\n` +
                `◉ ${c.spots.length} spotów\n` +
                `◎ ${c.journeys.length} journeys\n` +
                `◑ ${c.circles.length} circles\n` +
                `◈ ${c.signals.length} sygnałów\n\n` +
                `Data: ${new Date(data.exportedAt).toLocaleDateString('pl-PL')}`,
                [{ text: 'OK' }],
              );
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Nie udało się pobrać danych.';
              Alert.alert('Błąd eksportu', msg);
            } finally {
              setIsExporting(false);
            }
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Usuń konto — krok 1/2',
      'Twoje konto zostanie trwale usunięte. Dane zostaną zanonimizowane zgodnie z RODO.\n\nTej operacji nie można cofnąć.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Rozumiem, kontynuuj',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ],
    );
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Usuń konto — krok 2/2',
      `Czy na pewno chcesz usunąć konto @${explorer?.handle}?\n\nUsunięte zostaną:\n• Twój profil i dane\n• Spooty, journeys, transmisje\n• Dostęp do wszystkich circles`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: '🗑 Usuń konto',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Nie udało się usunąć konta.';
              Alert.alert('Błąd', msg);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  // ── Consent toggles ──────────────────────────────────────────────────────────

  async function handlePresenceToggle(value: boolean) {
    setPresenceToggling(true);
    try {
      await api.patch('/api/explorers/me', { presenceConsent: value });
      setExplorer({ ...explorer!, presenceConsent: value });
      // Immediately disable socket presence broadcast when user revokes consent.
      if (!value) socketManager.emit('presence:disable');
    } catch {
      Alert.alert('Błąd', 'Nie udało się zmienić ustawienia presence.');
    } finally {
      setPresenceToggling(false);
    }
  }

  async function handleLocationToggle(value: boolean) {
    if (value) {
      // Turning ON: request device permission first.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Uprawnienie wymagane',
          'Zezwól na dostęp do lokalizacji w ustawieniach systemowych, a następnie wróć tu.',
        );
        return;
      }
      setDeviceLocationGranted(true);
    }
    setLocationToggling(true);
    try {
      await api.patch('/api/explorers/me', { locationConsent: value });
      setExplorer({ ...explorer!, locationConsent: value });
    } catch {
      Alert.alert('Błąd', 'Nie udało się zmienić ustawienia lokalizacji.');
    } finally {
      setLocationToggling(false);
    }
  }

  async function setHomeBaseFromLocation() {
    setHomeBaseSaving(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Uprawnienie wymagane', 'Zezwól na lokalizację, aby ustawić bazę domową.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const homeBase = await api.put<{ lat: number; lng: number }>(
        '/api/explorers/me/home-base',
        {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
      );
      setExplorer({ ...explorer!, homeBase });
      Alert.alert('Baza domowa zapisana', 'Koordynaty są przechowywane w formie zaszyfrowanej.');
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać bazy domowej.');
    } finally {
      setHomeBaseSaving(false);
    }
  }

  async function removeHomeBase() {
    setHomeBaseSaving(true);
    try {
      await api.delete('/api/explorers/me/home-base');
      setExplorer({ ...explorer!, homeBase: undefined });
    } catch {
      Alert.alert('Błąd', 'Nie udało się usunąć bazy domowej.');
    } finally {
      setHomeBaseSaving(false);
    }
  }


  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Twoja tożsamość</Text>

          <View style={styles.avatarWrapper}>
            <Pressable
              onPress={() => void handleAvatarPick()}
              style={[styles.avatarRing, { borderColor: rankColor, shadowColor: rankColor }]}
              disabled={avatarUpload.isPending}
            >
              {explorer.avatarUrl ? (
                <Image source={{ uri: explorer.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>
                    {explorer.handle[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => void handleAvatarPick()}
              disabled={avatarUpload.isPending}
              style={styles.avatarEditBadge}
              hitSlop={6}
            >
              <Text style={styles.avatarEditIcon}>{avatarUpload.isPending ? '…' : '+'}</Text>
            </Pressable>
          </View>

          <Text style={styles.handle}>@{explorer.handle}</Text>
          {explorer.displayName && (
            <Text style={styles.displayName}>{explorer.displayName}</Text>
          )}

          <View style={[styles.rankBadge, { borderColor: rankColor }]}>
            <Text style={[styles.rankText, { color: rankColor }]}>{RANK_LABELS[explorer.rank] ?? explorer.rank}</Text>
          </View>

          {/* Rank progress bar */}
          {RANK_THRESHOLDS[explorer.rank]?.next && (() => {
            const threshold = RANK_THRESHOLDS[explorer.rank]!;
            const start   = RANK_START[explorer.rank] ?? 0;
            const end     = threshold.required;
            const progress = Math.min(1, Math.max(0, (explorer.trustScore - start) / (end - start)));
            const remaining = Math.max(0, end - explorer.trustScore);
            return (
              <View style={styles.rankProgress}>
                <View style={styles.rankProgressBar}>
                  <View style={[styles.rankProgressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: rankColor }]} />
                </View>
                <Text style={styles.rankProgressLabel}>
                  {remaining} pkt do {threshold.next}
                </Text>
              </View>
            );
          })()}

          <SignalButton
            label="Edytuj tożsamość"
            onPress={() => setEditVisible(true)}
            variant="ghost"
            size="sm"
            haptic="light"
          />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{String(explorer.trustScore)}</Text>
            <Text style={styles.statLabel}>Reputacja</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: TIER_BADGE_COLORS[explorer.tier]?.text ?? Colors.starlight }]}>
              {TIER_BADGE_COLORS[explorer.tier]?.label ?? explorer.tier}
            </Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
          <Pressable style={styles.statCell} onPress={() => setArchPickerVisible(true)}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {ARCHETYPE_LABELS[explorer.archetype] ?? explorer.archetype}
            </Text>
            <Text style={[styles.statLabel, { color: Colors.aurora + 'A0' }]}>Archetyp ›</Text>
          </Pressable>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: rankColor }]}>
              {RANK_LABELS[explorer.rank] ?? explorer.rank}
            </Text>
            <Text style={styles.statLabel}>Ranga</Text>
          </View>
        </View>

        {/* Quick access links */}
        <View style={styles.quickLinks}>
          <Pressable style={styles.quickLink} onPress={() => router.push('/saved')}>
            <Text style={styles.quickLinkIcon}>◎</Text>
            <Text style={styles.quickLinkLabel}>Saved Worlds</Text>
            <Text style={styles.quickLinkChevron}>›</Text>
          </Pressable>
        </View>

        {explorer.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Bio</Text>
            <Text style={styles.bioText}>{explorer.bio}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.signalsSectionHeader}>
            <Text style={styles.sectionLabel}>Obsesje</Text>
            <Pressable onPress={() => setObsModalVisible(true)} hitSlop={8}>
              <Text style={styles.markSeenBtn}>Edytuj</Text>
            </Pressable>
          </View>
          {(explorer.obsessions?.length ?? 0) > 0 ? (
            <View style={styles.tags}>
              {explorer.obsessions.map((obs) => (
                <View key={obs} style={styles.tag}>
                  <Text style={styles.tagText}>{obs}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.obsEmptyNote}>
              Dodaj swoje obsesje — miejsca, klimaty, styl odkrywania.
            </Text>
          )}
        </View>

        {allSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.signalsSectionHeader}>
              <Text style={styles.sectionLabel}>Sygnały</Text>
              {allSignals.some((s) => !s.seenAt) && (
                <Pressable
                  onPress={() => markSeen()}
                  disabled={markingAllSeen}
                  hitSlop={8}
                >
                  <Text style={styles.markSeenBtn}>
                    {markingAllSeen ? '…' : 'Oznacz wszystkie'}
                  </Text>
                </Pressable>
              )}
            </View>
            {allSignals.map((sig) => (
              <SignalRow key={sig.id} sig={sig} />
            ))}
            {signalsQuery.hasNextPage && (
              <Pressable
                style={styles.loadMoreBtn}
                onPress={() => void signalsQuery.fetchNextPage()}
                disabled={signalsQuery.isFetchingNextPage}
              >
                <Text style={styles.loadMoreText}>
                  {signalsQuery.isFetchingNextPage ? '…' : '↓ Więcej sygnałów'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Billing / Tier section */}
        <Pressable style={styles.planCard} onPress={() => router.push('/plans')}>
          <View style={styles.planCardLeft}>
            <Text style={styles.sectionLabel}>Plan Explorer</Text>
            <View style={styles.billingRow}>
              {(() => {
                const tb = TIER_BADGE_COLORS[explorer.tier] ?? TIER_BADGE_COLORS['FREE']!;
                return (
                  <View style={[styles.planBadge, { borderColor: tb.border, backgroundColor: tb.bg }]}>
                    <Text style={[styles.planBadgeText, { color: tb.text }]}>{tb.label}</Text>
                  </View>
                );
              })()}
              {explorer.tierExpiresAt && (
                <Text style={styles.billingSub}>
                  Wygasa {new Date(explorer.tierExpiresAt).toLocaleDateString('pl-PL')}
                </Text>
              )}
              {explorer.tier === 'FREE' && (
                <Text style={styles.billingSub}>Odblokuj ukryte spoty i tajne dropy</Text>
              )}
            </View>
          </View>
          <Text style={styles.planChevron}>›</Text>
        </Pressable>

        {/* Privacy & Data — GDPR */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Prywatność i dane</Text>

          {/* Presence toggle */}
          <View style={styles.consentRow}>
            <View style={styles.consentInfo}>
              <Text style={styles.consentTitle}>Presence</Text>
              <Text style={styles.consentSub}>
                {explorer.presenceConsent
                  ? 'Widoczny na mapie innych exploratorów (±500m)'
                  : 'Niewidoczny na mapie — lokalizacja nie jest udostępniana'}
              </Text>
            </View>
            <Switch
              value={explorer.presenceConsent}
              onValueChange={(v) => void handlePresenceToggle(v)}
              disabled={presenceToggling}
              trackColor={{ false: Colors.steel, true: Colors.aurora + '70' }}
              thumbColor={explorer.presenceConsent ? Colors.aurora : Colors.starGhost}
            />
          </View>

          {/* Location toggle */}
          <View style={[styles.consentRow, { borderTopWidth: 1, borderTopColor: Colors.steel, paddingTop: Spacing.md }]}>
            <View style={styles.consentInfo}>
              <Text style={styles.consentTitle}>Lokalizacja</Text>
              <Text style={styles.consentSub}>
                {deviceLocationGranted && explorer.locationConsent
                  ? 'GPS aktywny — odkrywasz spoty w pobliżu'
                  : !deviceLocationGranted
                    ? 'Uprawnienie systemowe wymagane — zmień w ustawieniach'
                    : 'GPS wyłączony — brak dostępu do spotów w pobliżu'}
              </Text>
            </View>
            <Switch
              value={deviceLocationGranted && explorer.locationConsent}
              onValueChange={(v) => void handleLocationToggle(v)}
              disabled={locationToggling}
              trackColor={{ false: Colors.steel, true: Colors.signal + '70' }}
              thumbColor={
                deviceLocationGranted && explorer.locationConsent
                  ? Colors.signal
                  : Colors.starGhost
              }
            />
          </View>

          <Text style={styles.consentNote}>
            Zgody regulaminowe udzielone: {explorer.consentTerms ? new Date(explorer.consentTerms).toLocaleDateString('pl-PL') : '—'}
          </Text>

          <View style={styles.homeBaseBlock}>
            <View style={styles.consentInfo}>
              <Text style={styles.consentTitle}>Baza domowa</Text>
              <Text style={styles.consentSub}>
                {explorer.homeBase
                  ? 'Zapisana i zaszyfrowana. Nie jest widoczna publicznie.'
                  : 'Opcjonalna. Pomaga personalizować odkrywanie miejsc.'}
              </Text>
            </View>
            <View style={styles.homeBaseActions}>
              <SignalButton
                label={explorer.homeBase ? 'Aktualizuj' : 'Ustaw z GPS'}
                onPress={setHomeBaseFromLocation}
                variant="ghost"
                size="sm"
                loading={homeBaseSaving}
              />
              {explorer.homeBase && (
                <SignalButton
                  label="Usuń"
                  onPress={removeHomeBase}
                  variant="ghost"
                  size="sm"
                  disabled={homeBaseSaving}
                />
              )}
            </View>
          </View>
        </View>

        <SignalButton
          label={isExporting ? 'Eksportowanie...' : '⬇ Pobierz moje dane (RODO)'}
          onPress={handleExportData}
          variant="ghost"
          size="md"
          fullWidth
          loading={isExporting}
          haptic="light"
        />

        <SignalButton
          label="Zmień hasło"
          onPress={() => setChangePasswordVisible(true)}
          variant="ghost"
          size="md"
          fullWidth
          haptic="light"
        />

        <SignalButton label="Wyloguj" onPress={logout} variant="ghost" size="md" fullWidth />

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerLine} />
            <Text style={styles.dangerLabel}>Strefa niebezpieczna</Text>
            <View style={styles.dangerLine} />
          </View>
          <SignalButton
            label={isDeleting ? 'Usuwanie...' : 'Usuń konto'}
            onPress={handleDeleteAccount}
            variant="ember"
            size="md"
            fullWidth
            loading={isDeleting}
            haptic="heavy"
          />
          <Text style={styles.dangerNote}>
            Konto zostanie zanonimizowane. Operacja jest nieodwracalna.
          </Text>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        displayName={explorer.displayName ?? ''}
        bio={explorer.bio ?? ''}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveProfile}
      />

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />

      <ArchetypePickerModal
        visible={archPickerVisible}
        current={explorer.archetype}
        onClose={() => setArchPickerVisible(false)}
        onSave={handleSaveArchetype}
      />

      <ObsessionsModal
        visible={obsModalVisible}
        current={explorer.obsessions ?? []}
        onClose={() => setObsModalVisible(false)}
        onSave={handleSaveObsessions}
      />

      {pendingRankUp !== null && (
        <RankUpModal rank={pendingRankUp} onDismiss={clearPendingRankUp} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.abyss },
  loadingRoot: { flex: 1, backgroundColor: Colors.abyss, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  avatarWrapper: {
    width: 112, height: 112,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  avatar: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: Colors.cosmicBlue, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h1, color: Colors.aurora },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.aurora,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100, elevation: 10,
  },
  avatarEditIcon: { fontFamily: 'GeneralSans-Bold', fontSize: 16, color: Colors.abyss, lineHeight: 18 },
  rankProgress: { width: '80%', gap: 4, alignItems: 'center' },
  rankProgressBar: {
    width: '100%', height: 3, borderRadius: 2,
    backgroundColor: Colors.steel, overflow: 'hidden',
  },
  rankProgressFill: { height: '100%', borderRadius: 2 },
  rankProgressLabel: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starGhost, letterSpacing: 0.5,
  },
  handle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodyLg, color: Colors.starlight },
  displayName: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  rankBadge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  rankText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, letterSpacing: 2, textTransform: 'uppercase' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  statCell: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.graphite,
    borderRadius: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 4,
  },
  statValue: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  statLabel: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  obsEmptyNote: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.starGhost, fontStyle: 'italic', lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.graphite,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
  },
  sectionLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  bioText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  tagText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.steel },
  signalRowUnseen: { borderTopColor: Colors.aurora + '20' },
  signalIcon: { fontSize: 16, color: Colors.starFaint, width: 20, textAlign: 'center' },
  signalBody: { flex: 1, gap: 2 },
  signalLabel: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  signalTime: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.aurora },
  signalChevron: { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.starGhost },
  signalsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markSeenBtn: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.signal },
  loadMoreBtn: {
    paddingVertical: Spacing.sm, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.steel, marginTop: Spacing.xs,
  },
  loadMoreText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.signal, letterSpacing: 0.5 },

  // Billing
  billingRow: { gap: Spacing.xs },
  billingSub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.steel,
    padding: Spacing.xl, gap: Spacing.md,
  },
  planCardLeft: { flex: 1, gap: Spacing.sm },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.pill, borderWidth: 1,
  },
  planBadgeText: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  planChevron: {
    fontFamily: 'GeneralSans-Regular', fontSize: 22,
    color: Colors.starGhost,
  },

  // Consent & GDPR
  consentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  consentInfo: { flex: 1, gap: 2 },
  consentTitle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  consentSub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  consentNote: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption,
    color: Colors.starGhost, marginTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.steel, paddingTop: Spacing.md,
  },
  homeBaseBlock: {
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.steel,
    paddingTop: Spacing.md,
  },
  homeBaseActions: { flexDirection: 'row', gap: Spacing.sm },

  // Danger zone
  dangerZone: { gap: Spacing.md, paddingTop: Spacing.md },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dangerLine: { flex: 1, height: 1, backgroundColor: Colors.ember + '30' },
  dangerLabel: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.ember + '80', letterSpacing: 1, textTransform: 'uppercase',
  },
  dangerNote: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption,
    color: Colors.starGhost, textAlign: 'center', lineHeight: 18,
  },
  quickLinks: {
    backgroundColor: Colors.graphite,
    borderRadius: 14, overflow: 'hidden',
    marginHorizontal: Spacing.xl,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderBottomWidth: 0,
  },
  quickLinkIcon:    { fontSize: 16, color: Colors.aurora },
  quickLinkLabel:   { flex: 1, fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  quickLinkChevron: { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.starGhost },
});

const editStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.steel,
  },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  closeBtn: { padding: Spacing.sm },
  closeBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starFaint },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  field: { gap: Spacing.sm },
  label: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: Colors.graphite, borderWidth: 1, borderColor: Colors.steel,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
  },
  inputMultiline: { height: 100, paddingTop: Spacing.md },
  counter: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost, textAlign: 'right' },
  footer: { padding: Spacing.xl, paddingBottom: Spacing.xl },
});

const rankUpStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(7,10,12,0.92)',
    alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl,
  },
  glowRing: {
    position: 'absolute',
    width: 320, height: 320, borderRadius: 160,
    borderWidth: 2,
  },
  card: {
    backgroundColor: Colors.graphite,
    borderRadius: 24, borderWidth: 1, borderColor: Colors.steel,
    padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.lg,
    width: '100%', maxWidth: 320,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 2,
  },
  rankBadge: {
    borderWidth: 2, borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
  },
  rankBadgeText: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, letterSpacing: 1 },
  desc: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, textAlign: 'center', lineHeight: 22,
  },
});

const archStyles = StyleSheet.create({
  scroll: { padding: Spacing.xl, gap: Spacing.md },
  subtitle: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.starFaint, lineHeight: 20, marginBottom: Spacing.xs,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.graphiteSoft,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.steel,
    padding: Spacing.lg,
  },
  cardActive: {
    borderColor: Colors.aurora + '60', backgroundColor: Colors.aurora + '0C',
  },
  cardIcon:  { fontSize: 20, color: Colors.starFaint, width: 26, textAlign: 'center' },
  cardBody:  { flex: 1, gap: 4 },
  cardTitle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  cardDesc:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint, lineHeight: 18 },
  cardCheck: { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.aurora },
});

const obsStyles = StyleSheet.create({
  scroll: { padding: Spacing.xl, gap: Spacing.lg },
  subtitle: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.starFaint, lineHeight: 20,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.aurora + '18',
    borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.aurora + '50',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  tagItemText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },
  tagRemove:   { fontFamily: 'GeneralSans-Regular', fontSize: 12, color: Colors.aurora + '80' },
  emptyNote: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.starGhost, fontStyle: 'italic',
  },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addInput: {
    flex: 1, backgroundColor: Colors.graphiteSoft,
    borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.aurora, alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.steel },
  addBtnText: { fontFamily: 'GeneralSans-Bold', fontSize: 22, color: Colors.void, lineHeight: 26 },
  counter: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starGhost, textAlign: 'right',
  },
});

const pwStyles = StyleSheet.create({
  errorBox: {
    backgroundColor: Colors.ember + '18',
    borderWidth: 1,
    borderColor: Colors.ember + '50',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.ember,
    lineHeight: 20,
  },
  hint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.caption,
    color: Colors.starGhost,
    lineHeight: 18,
  },
});
