import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Clipboard, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { BackButton } from '@/components/ui/BackButton';
import {
  useCircle, useJoinCircle, useLeaveCircle,
  useGenerateInviteCode, useInviteCodes,
  useUpdateCircle, useDeleteCircle, usePromoteMember, useKickMember,
} from '@/hooks/useCircles';
import { useAuthStore } from '@/stores/auth';
import { formatRelative } from '@travelpoint/utils';
import { useBlockExplorer } from '@/hooks/useExplorers';

// ─── Extended API response type ───────────────────────────────────────────────
type CircleMemberEntry = {
  explorer: { id: string; handle: string; rank: string; displayName?: string };
  role: string;
};

type CircleDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isInviteOnly: boolean;
  members: CircleMemberEntry[];
  _count?: { members: number };
  createdAt: string;
  viewerRole?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  FOUNDER: Colors.ember,
  GUIDE:   Colors.aurora,
  MEMBER:  Colors.signal,
};

const ROLE_ICONS: Record<string, string> = {
  FOUNDER: '◉',
  GUIDE:   '◈',
  MEMBER:  '◎',
};

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Założyciel',
  GUIDE:   'Przewodnik',
  MEMBER:  'Członek',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function MemberRow({
  entry,
  viewerExplorerId,
  viewerRole,
  onPromote,
  onKick,
}: {
  entry: CircleMemberEntry;
  viewerExplorerId: string | undefined;
  viewerRole: string | null;
  onPromote?: (explorerId: string, handle: string) => void;
  onKick?: (explorerId: string, handle: string) => void;
}) {
  const roleColor = ROLE_COLORS[entry.role] ?? Colors.signal;
  const blockExplorer = useBlockExplorer();
  const isSelf = entry.explorer.id === viewerExplorerId;
  const canManage = viewerRole === 'FOUNDER' || viewerRole === 'GUIDE';

  function handleLongPress() {
    if (isSelf || !canManage) return;
    type AlertButton = { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void };
    const options: AlertButton[] = [];

    if (viewerRole === 'FOUNDER' && entry.role === 'MEMBER') {
      options.push({
        text: '◈ Awansuj na Przewodnika',
        onPress: () => onPromote?.(entry.explorer.id, entry.explorer.handle),
      });
    }

    const canKick =
      entry.role !== 'FOUNDER' &&
      (viewerRole === 'FOUNDER' || (viewerRole === 'GUIDE' && entry.role === 'MEMBER'));
    if (canKick) {
      options.push({
        text: 'Wyrzuć z circle',
        style: 'destructive',
        onPress: () => onKick?.(entry.explorer.id, entry.explorer.handle),
      });
    }

    options.push({
      text: 'Zablokuj explorera',
      style: 'destructive',
      onPress: () => {
        blockExplorer.mutate(entry.explorer.id, {
          onSuccess: () => Alert.alert('Zablokowano', `@${entry.explorer.handle} został zablokowany.`),
          onError: () => Alert.alert('Błąd', 'Nie udało się zablokować explorera.'),
        });
      },
    });
    options.push({ text: 'Anuluj', style: 'cancel' });

    Alert.alert(`@${entry.explorer.handle}`, 'Co chcesz zrobić?', options);
  }

  return (
    <Pressable
      onLongPress={isSelf ? undefined : handleLongPress}
      style={styles.memberRow}
      delayLongPress={400}
    >
      <View style={[styles.memberAvatar, { borderColor: roleColor }]}>
        <Text style={[styles.memberAvatarLetter, { color: roleColor }]}>
          {entry.explorer.handle[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberHandle}>@{entry.explorer.handle}</Text>
        {entry.explorer.displayName && (
          <Text style={styles.memberDisplayName}>{entry.explorer.displayName}</Text>
        )}
      </View>
      <View style={[styles.roleBadge, { borderColor: roleColor + '60' }]}>
        <Text style={[styles.roleText, { color: roleColor }]}>
          {ROLE_ICONS[entry.role] ?? '○'} {ROLE_LABELS[entry.role] ?? entry.role}
        </Text>
      </View>
    </Pressable>
  );
}

function InviteCodeCard({ code, expiresAt }: { code: string; expiresAt: string }) {
  function handleCopy() {
    Clipboard.setString(code);
    Alert.alert('Skopiowano', `Kod ${code} skopiowany do schowka.`);
  }
  return (
    <Pressable style={styles.inviteCodeRow} onPress={handleCopy}>
      <Text style={styles.inviteCodeText}>{code}</Text>
      <View style={styles.inviteCodeMeta}>
        <Text style={styles.inviteCodeExpiry}>Wygasa {formatRelative(expiresAt)}</Text>
        <Text style={styles.inviteCodeCopy}>Kopiuj ⎘</Text>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { explorer } = useAuthStore();

  const { data: circle, isLoading, error } = useCircle(id ?? '');
  const { mutateAsync: joinCircle,     isPending: isJoining    } = useJoinCircle();
  const { mutateAsync: leaveCircle,    isPending: isLeaving    } = useLeaveCircle();
  const { mutateAsync: generateCode,   isPending: isGenerating } = useGenerateInviteCode();
  const { mutateAsync: updateCircle,   isPending: isSaving     } = useUpdateCircle();
  const { mutateAsync: deleteCircle,   isPending: isDeleting   } = useDeleteCircle();
  const { mutateAsync: promoteMember } = usePromoteMember();
  const { mutateAsync: kickMember    } = useKickMember();

  const [inviteCode, setInviteCode] = useState('');
  const [editName, setEditName]               = useState('');
  const [editDesc, setEditDesc]               = useState('');
  const [editInviteOnly, setEditInviteOnly]   = useState(false);
  const [settingsOpen, setSettingsOpen]       = useState(false);

  const detail = circle as unknown as CircleDetail | undefined;
  const slug    = detail?.slug ?? id ?? '';

  const { data: inviteCodes } = useInviteCodes(slug);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Nie znaleziono circle.</Text>
          <SignalButton label="Wróć" onPress={() => router.back()} variant="ghost" size="sm" />
        </View>
      </SafeAreaView>
    );
  }

  const members      = detail.members ?? [];
  const myMembership = members.find((m) => m.explorer.id === explorer?.id);
  const viewerRole   = detail.viewerRole ?? myMembership?.role ?? null;
  const isMember     = viewerRole !== null;
  const isFounder    = viewerRole === 'FOUNDER';
  const isGuide      = viewerRole === 'GUIDE';
  const canInvite    = isFounder || isGuide;
  const memberCount  = detail._count?.members ?? members.length;
  const isInviteOnly = detail.isInviteOnly;

  function openSettings() {
    if (!detail) return;
    setEditName(detail.name);
    setEditDesc(detail.description ?? '');
    setEditInviteOnly(detail.isInviteOnly);
    setSettingsOpen(true);
  }

  async function handleSave() {
    try {
      await updateCircle({
        slug,
        data: { name: editName.trim(), description: editDesc.trim() || undefined, isInviteOnly: editInviteOnly },
      });
      setSettingsOpen(false);
    } catch (e: unknown) {
      Alert.alert('Błąd', e instanceof Error ? e.message : 'Nie udało się zapisać zmian.');
    }
  }

  function confirmDelete() {
    if (!detail) return;
    Alert.alert(
      `Usuń "${detail.name}"?`,
      'Ta operacja jest nieodwracalna. Circle i wszystkie transmisje zostaną usunięte.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń circle', style: 'destructive',
          onPress: async () => {
            try {
              await deleteCircle(slug);
              router.back();
            } catch (e: unknown) {
              Alert.alert('Błąd', e instanceof Error ? e.message : 'Nie udało się usunąć circle.');
            }
          },
        },
      ],
    );
  }

  function handlePromote(explorerId: string, handle: string) {
    Alert.alert(
      `Awansuj @${handle}?`,
      'Zostanie Przewodnikiem — może zapraszać nowych członków.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Awansuj',
          onPress: async () => {
            try {
              await promoteMember({ slug, explorerId });
            } catch (e: unknown) {
              Alert.alert('Błąd', e instanceof Error ? e.message : 'Nie udało się awansować.');
            }
          },
        },
      ],
    );
  }

  function handleKick(explorerId: string, handle: string) {
    Alert.alert(
      `Wyrzuć @${handle}?`,
      'Explorer straci dostęp do circle.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyrzuć', style: 'destructive',
          onPress: async () => {
            try {
              await kickMember({ slug, explorerId });
            } catch (e: unknown) {
              Alert.alert('Błąd', e instanceof Error ? e.message : 'Nie udało się wyrzucić.');
            }
          },
        },
      ],
    );
  }

  async function handleJoin() {
    try {
      await joinCircle({
        slug,
        inviteCode: isInviteOnly ? inviteCode.trim() : undefined,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nie udało się dołączyć.';
      Alert.alert('Błąd', msg);
    }
  }

  function confirmLeave() {
    if (isFounder) {
      Alert.alert(
        'Nie możesz opuścić circle',
        'Jesteś założycielem. Przekaż rolę innemu członkowi przed opuszczeniem.',
        [{ text: 'OK' }],
      );
      return;
    }
    // detail is guaranteed non-null here — early returns above guard against it.
    if (!detail) return;
    Alert.alert(
      `Opuścić ${detail.name}?`,
      'Stracisz dostęp do wspólnej mapy i transmisji tego circle.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Opuść', style: 'destructive',
          onPress: async () => {
            try {
              await leaveCircle(slug);
              router.back();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Nie udało się opuścić circle.';
              Alert.alert('Błąd', msg);
            }
          },
        },
      ],
    );
  }

  async function handleGenerateCode() {
    try {
      const { code } = await generateCode(slug);
      Clipboard.setString(code);
      Alert.alert('Kod wygenerowany', `${code}\n\nSkopiowany do schowka. Ważny przez 7 dni.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nie udało się wygenerować kodu.';
      Alert.alert('Błąd', msg);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + settings */}
        <View style={styles.topBar}>
          <BackButton label="Kręgi" />
          {isFounder && (
            <Pressable style={styles.settingsBtn} onPress={openSettings} hitSlop={8}>
              <Text style={styles.settingsBtnText}>⚙ Ustawienia</Text>
            </Pressable>
          )}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PulsingDot color={Colors.violet} />
            <Text style={styles.name}>{detail.name}</Text>
          </View>
          <Text style={styles.slug}>@{detail.slug}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>◑ {memberCount} członków</Text>
            </View>
            {detail.isInviteOnly && (
              <View style={[styles.metaChip, styles.inviteChip]}>
                <Text style={[styles.metaChipText, { color: Colors.ember }]}>🔒 Tylko zaproszenia</Text>
              </View>
            )}
            {viewerRole && (
              <View style={[styles.metaChip, { borderColor: (ROLE_COLORS[viewerRole] ?? Colors.signal) + '60' }]}>
                <Text style={[styles.metaChipText, { color: ROLE_COLORS[viewerRole] ?? Colors.signal }]}>
                  {ROLE_ICONS[viewerRole] ?? '◎'} {ROLE_LABELS[viewerRole] ?? viewerRole}
                </Text>
              </View>
            )}
          </View>

          {detail.description && (
            <Text style={styles.description}>{detail.description}</Text>
          )}
        </View>

        {/* Join button (non-member) */}
        {!isMember && (
          <View style={styles.joinPanel}>
            {detail.isInviteOnly && (
              <>
                <Text style={styles.joinHint}>
                  Ten circle jest prywatny. Wpisz jednorazowy kod otrzymany od Przewodnika lub Założyciela.
                </Text>
                <TextInput
                  style={styles.inviteInput}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="Kod zaproszenia"
                  placeholderTextColor={Colors.starGhost}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}
            <SignalButton
              label="Dołącz do circle"
              onPress={handleJoin}
              variant="signal"
              size="lg"
              fullWidth
              loading={isJoining}
              disabled={detail.isInviteOnly && inviteCode.trim().length === 0}
              haptic="medium"
            />
          </View>
        )}

        {/* Member actions */}
        {isMember && (
          <View style={styles.memberActions}>
            <SignalButton
              label="◐ Czat Circle"
              onPress={() =>
                router.push(
                  `/modals/transmissions?circleId=${detail.id}&circleName=${encodeURIComponent(detail.name)}`,
                )
              }
              variant="ghost"
              size="md"
              fullWidth
              haptic="light"
            />
            {!isFounder && (
              <SignalButton
                label="Opuść circle"
                onPress={confirmLeave}
                variant="ember"
                size="md"
                fullWidth
                loading={isLeaving}
                haptic="medium"
              />
            )}
          </View>
        )}

        {/* Members list */}
        {members.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Członkowie</Text>
            {members.map((m, i) => (
              <View key={m.explorer.id}>
                {i > 0 && <View style={styles.divider} />}
                <MemberRow
                  entry={m}
                  viewerExplorerId={explorer?.id}
                  viewerRole={viewerRole}
                  onPromote={handlePromote}
                  onKick={handleKick}
                />
              </View>
            ))}
          </GlassCard>
        )}

        {/* Settings panel — FOUNDER only */}
        {isFounder && settingsOpen && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionLabel}>Ustawienia Circle</Text>

            <View style={styles.settingsField}>
              <Text style={styles.settingsFieldLabel}>Nazwa</Text>
              <TextInput
                style={styles.settingsInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nazwa circle"
                placeholderTextColor={Colors.starGhost}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.settingsField}>
              <Text style={styles.settingsFieldLabel}>Opis</Text>
              <TextInput
                style={[styles.settingsInput, styles.settingsInputMulti]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Opis (opcjonalnie)"
                placeholderTextColor={Colors.starGhost}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.settingsToggleRow}>
              <Text style={styles.settingsFieldLabel}>Tylko na zaproszenie</Text>
              <Switch
                value={editInviteOnly}
                onValueChange={setEditInviteOnly}
                trackColor={{ false: Colors.steel, true: Colors.aurora + '80' }}
                thumbColor={editInviteOnly ? Colors.aurora : Colors.starFaint}
              />
            </View>

            <View style={styles.settingsActions}>
              <SignalButton
                label="Zapisz zmiany"
                onPress={handleSave}
                variant="aurora"
                size="md"
                fullWidth
                loading={isSaving}
                haptic="medium"
              />
              <SignalButton
                label="Anuluj"
                onPress={() => setSettingsOpen(false)}
                variant="ghost"
                size="sm"
                fullWidth
              />
            </View>

            <View style={styles.dangerZone}>
              <SignalButton
                label={isDeleting ? 'Usuwanie…' : 'Usuń circle'}
                onPress={confirmDelete}
                variant="ember"
                size="md"
                fullWidth
                loading={isDeleting}
                haptic="heavy"
              />
            </View>
          </GlassCard>
        )}

        {/* Invite codes — GUIDE / FOUNDER */}
        {canInvite && (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Kody zaproszenia</Text>
              <SignalButton
                label="Generuj"
                onPress={handleGenerateCode}
                variant="aurora"
                size="sm"
                loading={isGenerating}
                haptic="light"
              />
            </View>
            {inviteCodes && inviteCodes.length > 0 ? (
              inviteCodes.map((c) => (
                <InviteCodeCard key={c.code} code={c.code} expiresAt={c.expiresAt} />
              ))
            ) : (
              <Text style={styles.emptyCodesText}>
                Brak aktywnych kodów. Wygeneruj nowy aby zaprosić eksploratorów.
              </Text>
            )}
          </GlassCard>
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

  header:   { gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dot:      { width: 10, height: 10, borderRadius: 5 },
  name:     { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight, letterSpacing: -0.5, flex: 1 },
  slug:     { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.starFaint },

  metaRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaChip:      { borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  inviteChip:    { borderColor: Colors.ember + '50' },
  metaChipText:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint },
  description:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 22 },

  memberActions: { gap: Spacing.sm },
  joinPanel: { gap: Spacing.md },
  joinHint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 20,
  },
  inviteInput: {
    height: 50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.ember + '60',
    backgroundColor: Colors.graphite,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starlight,
    letterSpacing: 1,
  },

  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  sectionLabel: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1,
  },

  divider: { height: 1, backgroundColor: Colors.steel, marginVertical: Spacing.sm },

  memberRow:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar:        { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.graphite },
  memberAvatarLetter:  { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.bodySm },
  memberInfo:          { flex: 1, gap: 2 },
  memberHandle:        { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  memberDisplayName:   { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  roleBadge:           { borderWidth: 1, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  roleText:            { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, textTransform: 'uppercase' },

  inviteCodeRow:   { paddingVertical: Spacing.md, gap: Spacing.xs },
  inviteCodeText:  { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.body, color: Colors.aurora, letterSpacing: 2 },
  inviteCodeMeta:  { flexDirection: 'row', justifyContent: 'space-between' },
  inviteCodeExpiry:{ fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starGhost },
  inviteCodeCopy:  { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.signal },

  emptyCodesText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starGhost, lineHeight: 20 },

  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.ember },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  settingsBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },

  settingsField: { gap: Spacing.xs },
  settingsFieldLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsInput: {
    backgroundColor: Colors.graphiteSoft,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  settingsInputMulti: { height: 72, paddingTop: Spacing.md },
  settingsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsActions: { gap: Spacing.sm, marginTop: Spacing.xs },
  dangerZone: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.ember + '30', paddingTop: Spacing.md },
});
