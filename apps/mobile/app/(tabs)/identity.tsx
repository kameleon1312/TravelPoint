import { View, Text, ScrollView, StyleSheet, Modal, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, Clipboard, Switch, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';
import { SignalButton } from '@/components/ui/SignalButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { useMarkSignalsSeen, useSignals, SIGNAL_LABELS, SIGNAL_ICONS } from '@/hooks/useSignals';
import { formatRelative } from '@travelpoint/utils';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';

const RANK_COLORS: Record<string, string> = {
  NEWCOMER: Colors.starGhost,
  EXPLORER: Colors.star,
  TRUSTED: Colors.signal,
  INSIDER: Colors.aurora,
  LEGEND: Colors.ember,
};

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
  const { explorer, logout, setExplorer, deleteAccount } = useAuthStore();
  const { mutate: markSeen } = useMarkSignalsSeen();
  const { data: signals } = useSignals();
  const [editVisible, setEditVisible]           = useState(false);
  const [isExporting, setIsExporting]           = useState(false);
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
          <Text style={styles.eyebrow}>Explorer Identity</Text>

          <View style={[styles.avatarRing, { borderColor: rankColor, shadowColor: rankColor }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {explorer.handle[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          </View>

          <Text style={styles.handle}>@{explorer.handle}</Text>
          {explorer.displayName && (
            <Text style={styles.displayName}>{explorer.displayName}</Text>
          )}

          <View style={[styles.rankBadge, { borderColor: rankColor }]}>
            <Text style={[styles.rankText, { color: rankColor }]}>{explorer.rank}</Text>
          </View>

          <SignalButton
            label="Edytuj tożsamość"
            onPress={() => setEditVisible(true)}
            variant="ghost"
            size="sm"
            haptic="light"
          />
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Trust', value: String(explorer.trustScore) },
            { label: 'Tier', value: explorer.tier },
            { label: 'Archetype', value: explorer.archetype ?? '—' },
          ].map((stat) => (
            <GlassCard key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </GlassCard>
          ))}
        </View>

        {explorer.bio && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Bio</Text>
            <Text style={styles.bioText}>{explorer.bio}</Text>
          </GlassCard>
        )}

        {explorer.obsessions.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Obsesje</Text>
            <View style={styles.tags}>
              {explorer.obsessions.map((obs) => (
                <View key={obs} style={styles.tag}>
                  <Text style={styles.tagText}>{obs}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {signals && signals.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Sygnały</Text>
            {signals.slice(0, 8).map((sig) => (
              <View
                key={sig.id}
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
              </View>
            ))}
          </GlassCard>
        )}

        {/* Privacy & Data — GDPR */}
        <GlassCard style={styles.section}>
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
            Zgody regulaminowe udzielone: {new Date(explorer.consentTerms ?? '').toLocaleDateString('pl-PL')}
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
        </GlassCard>

        <SignalButton
          label={isExporting ? 'Eksportowanie...' : '⬇ Pobierz moje dane (RODO)'}
          onPress={handleExportData}
          variant="ghost"
          size="md"
          fullWidth
          loading={isExporting}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.abyss },
  loadingRoot: { flex: 1, backgroundColor: Colors.abyss, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.md },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.cosmicBlue, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.aurora },
  handle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodyLg, color: Colors.starlight },
  displayName: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  rankBadge: { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  rankText: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, letterSpacing: 2, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight, textAlign: 'center' },
  statLabel: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginTop: 2 },
  section: { gap: Spacing.sm },
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
