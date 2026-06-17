import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { useAuthStore } from '@/stores/auth';
import { formatRelative } from '@travelpoint/utils';
import { api } from '@/lib/api';
import {
  useInbox, useThread, useSendDM,
  useCircleMessages, useSendCircleMessage,
} from '@/hooks/useCircles';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExplorerMini {
  id: string;
  handle: string;
  rank: string;
  displayName?: string;
}

interface TransmissionWithSender {
  id: string;
  senderId: string;
  recipientId?: string | null;
  circleId?: string | null;
  body: string;
  createdAt: string;
  readAt?: string | null;
  sender?: ExplorerMini;
}

type Mode = 'inbox' | 'thread' | 'circle' | 'compose';

// ─── Conversation grouping ────────────────────────────────────────────────────
interface Conversation {
  sender: ExplorerMini | undefined;
  senderId: string;
  latest: TransmissionWithSender;
  unread: number;
}

function groupInbox(messages: TransmissionWithSender[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const msg of messages) {
    const existing = map.get(msg.senderId);
    if (!existing) {
      map.set(msg.senderId, {
        sender: msg.sender,
        senderId: msg.senderId,
        latest: msg,
        unread: msg.readAt ? 0 : 1,
      });
    } else {
      if (new Date(msg.createdAt) > new Date(existing.latest.createdAt)) {
        existing.latest = msg;
      }
      if (!msg.readAt) existing.unread += 1;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime(),
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ConversationRow({
  conv,
  onPress,
}: {
  conv: Conversation;
  onPress: () => void;
}) {
  const handle = conv.sender?.handle ?? '?';
  const initial = handle[0]?.toUpperCase() ?? '?';
  const hasUnread = conv.unread > 0;

  return (
    <Pressable onPress={onPress}>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.convRow}>
        <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convMeta}>
            <Text style={[styles.convHandle, hasUnread && styles.convHandleUnread]}>
              @{handle}
            </Text>
            <Text style={styles.convTime}>{formatRelative(conv.latest.createdAt)}</Text>
          </View>
          <Text
            style={[styles.convPreview, hasUnread && styles.convPreviewUnread]}
            numberOfLines={1}
          >
            {conv.latest.body}
          </Text>
        </View>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{conv.unread}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function MessageBubble({
  msg,
  isOwn,
  showSender,
}: {
  msg: TransmissionWithSender;
  isOwn: boolean;
  showSender: boolean;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
    >
      {showSender && !isOwn && (
        <Text style={styles.bubbleSender}>@{msg.sender?.handle ?? '?'}</Text>
      )}
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{msg.body}</Text>
      <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
        {formatRelative(msg.createdAt)}
      </Text>
    </Animated.View>
  );
}

function ChatInput({
  onSend,
  loading,
  placeholder,
}: {
  onSend: (text: string) => void;
  loading: boolean;
  placeholder: string;
}) {
  const [text, setText] = useState('');
  const sendScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  function handleSend() {
    if (!text.trim() || loading) return;
    sendScale.value = withSpring(0.9, {}, () => { sendScale.value = withSpring(1); });
    onSend(text.trim());
    setText('');
  }

  return (
    <View style={styles.inputRow}>
      <TextInput
        style={styles.chatInput}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={Colors.starGhost}
        multiline
        maxLength={2000}
        returnKeyType="default"
      />
      <Pressable onPress={handleSend} disabled={!text.trim() || loading} hitSlop={8}>
        <Animated.View style={[styles.sendBtn, (!text.trim() || loading) && styles.sendBtnDisabled, btnStyle]}>
          {loading
            ? <ActivityIndicator size="small" color={Colors.void} />
            : <Text style={styles.sendBtnText}>◎</Text>
          }
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function TransmissionsModal() {
  const { explorer } = useAuthStore();
  const params = useLocalSearchParams<{ circleId?: string; circleName?: string }>();

  const circleId  = params.circleId;
  const circleName = params.circleName ? decodeURIComponent(params.circleName) : undefined;

  const [mode, setMode]       = useState<Mode>(circleId ? 'circle' : 'inbox');
  const [thread, setThread]   = useState<{ id: string; handle: string } | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const flatRef = useRef<FlatList>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: inboxMsgs, isLoading: inboxLoading, refetch: refetchInbox } = useInbox();
  const { data: threadData, isLoading: threadLoading } = useThread(thread?.id ?? '');
  const { data: circleMessages, isLoading: circleLoading } = useCircleMessages(circleId ?? '');

  const sendDM = useSendDM();
  const sendCircle = useSendCircleMessage(circleId ?? '');

  // Scroll to bottom of circle chat / thread on new messages
  useEffect(() => {
    const len =
      mode === 'circle' ? circleMessages?.length
      : mode === 'thread' ? threadData?.messages?.length
      : 0;
    if (len) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [circleMessages?.length, threadData?.messages?.length, mode]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openThread = useCallback((id: string, handle: string) => {
    setThread({ id, handle });
    setMode('thread');
  }, []);

  async function handleSendDM(body: string) {
    if (!thread?.id) return;
    await sendDM.mutateAsync({ recipientId: thread.id, body });
  }

  async function handleSendCircle(body: string) {
    await sendCircle.mutateAsync(body);
  }

  async function handleCompose() {
    if (!composeTo.trim() || !composeBody.trim()) return;
    const handle = composeTo.trim().replace('@', '');
    try {
      const recipient = await api.get<{ id: string; handle: string }>(`/api/explorers/${handle}`);
      await sendDM.mutateAsync({ recipientId: recipient.id, body: composeBody.trim() });
      setComposeTo('');
      setComposeBody('');
      setMode('inbox');
    } catch {
      // surface error via mutation state
    }
  }

  // ── Inbox conversations ────────────────────────────────────────────────────
  const conversations = inboxMsgs ? groupInbox(inboxMsgs) : [];
  const totalUnread   = conversations.reduce((sum, c) => sum + c.unread, 0);

  // ─── Render modes ─────────────────────────────────────────────────────────

  // CIRCLE CHAT
  if (mode === 'circle' && circleId) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Circle</Text>
              <Text style={styles.title}>{circleName ?? 'Chat'}</Text>
            </View>
            <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>Zamknij</Text>
            </Pressable>
          </View>

          {circleLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.aurora} size="large" />
            </View>
          ) : !circleMessages || circleMessages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◑</Text>
              <Text style={styles.emptyTitle}>Brak wiadomości</Text>
              <Text style={styles.emptySub}>Wyślij pierwszą transmisję do circle.</Text>
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={circleMessages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isOwn = item.senderId === explorer?.id;
                const prev  = circleMessages[index - 1];
                const showSender = !isOwn && (prev?.senderId !== item.senderId);
                return (
                  <MessageBubble msg={item} isOwn={isOwn} showSender={showSender} />
                );
              }}
            />
          )}

          <ChatInput
            onSend={handleSendCircle}
            loading={sendCircle.isPending}
            placeholder="Wyślij do circle..."
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // THREAD VIEW
  if (mode === 'thread' && thread) {
    const msgs = threadData?.messages ?? [];
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Pressable onPress={() => setMode('inbox')} hitSlop={12}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
              <View>
                <Text style={styles.eyebrow}>Transmisja</Text>
                <Text style={styles.title}>@{thread.handle}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>Zamknij</Text>
            </Pressable>
          </View>

          {threadLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.aurora} size="large" />
            </View>
          ) : msgs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyTitle}>Brak wiadomości</Text>
              <Text style={styles.emptySub}>Wyślij pierwszą transmisję.</Text>
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={msgs}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <MessageBubble
                  msg={item}
                  isOwn={item.senderId === explorer?.id}
                  showSender={false}
                />
              )}
            />
          )}

          <ChatInput
            onSend={handleSendDM}
            loading={sendDM.isPending}
            placeholder={`Transmisja do @${thread.handle}...`}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // COMPOSE VIEW
  if (mode === 'compose') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Pressable onPress={() => setMode('inbox')} hitSlop={12}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
              <View>
                <Text style={styles.eyebrow}>Nowa</Text>
                <Text style={styles.title}>Transmisja</Text>
              </View>
            </View>
            <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>Zamknij</Text>
            </Pressable>
          </View>

          <View style={styles.composePanel}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Do explorera</Text>
              <TextInput
                style={styles.composeInput}
                value={composeTo}
                onChangeText={setComposeTo}
                placeholder="@handle"
                placeholderTextColor={Colors.starGhost}
                autoCapitalize="none"
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Wiadomość</Text>
              <TextInput
                style={[styles.composeInput, styles.composeTextarea]}
                value={composeBody}
                onChangeText={setComposeBody}
                placeholder="Treść transmisji..."
                placeholderTextColor={Colors.starGhost}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
            </View>

            {sendDM.isError && (
              <Text style={styles.errorText}>Błąd — sprawdź handle i spróbuj ponownie</Text>
            )}

            <Pressable
              style={[
                styles.primaryBtn,
                (!composeTo.trim() || !composeBody.trim() || sendDM.isPending) && styles.primaryBtnDisabled,
              ]}
              onPress={handleCompose}
              disabled={!composeTo.trim() || !composeBody.trim() || sendDM.isPending}
            >
              {sendDM.isPending
                ? <ActivityIndicator color={Colors.void} size="small" />
                : <Text style={styles.primaryBtnText}>Wyślij transmisję ◎</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // INBOX VIEW (default)
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Sieć</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={styles.title}>Transmissions</Text>
            {totalUnread > 0 && (
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setMode('compose')}
            style={styles.iconBtn}
            hitSlop={12}
            accessibilityLabel="Nowa transmisja"
          >
            <Text style={styles.iconBtnText}>✎</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeBtnText}>Zamknij</Text>
          </Pressable>
        </View>
      </View>

      {inboxLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Brak transmisji</Text>
          <Text style={styles.emptySub}>
            Naciśnij ✎ żeby wysłać transmisję do innego explorera.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.senderId}
          contentContainerStyle={styles.inboxList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={inboxLoading}
              onRefresh={() => void refetchInbox()}
              tintColor={Colors.aurora}
            />
          }
          renderItem={({ item }) => (
            <ConversationRow
              conv={item}
              onPress={() => openThread(item.senderId, item.sender?.handle ?? '?')}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.graphite },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.steel,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, color: Colors.starlight, marginTop: 2,
  },
  titleBadge: {
    backgroundColor: Colors.aurora, borderRadius: BorderRadius.pill,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  titleBadgeText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.void, fontWeight: '700',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.pill,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.starFaint },
  closeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  closeBtnText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint,
  },
  backText: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starFaint },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emptyIcon: { fontSize: 40, color: Colors.starGhost },
  emptyTitle: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight,
  },
  emptySub: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, textAlign: 'center', lineHeight: 22,
  },

  // Inbox
  inboxList: { paddingTop: Spacing.sm, paddingBottom: Spacing.huge },
  sep: { height: 1, backgroundColor: Colors.steel, marginHorizontal: Spacing.xl },

  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.abyss, borderWidth: 1.5, borderColor: Colors.steel,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarUnread: { borderColor: Colors.aurora + '80' },
  avatarLetter: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.body, color: Colors.starFaint,
  },
  convInfo: { flex: 1, gap: 3 },
  convMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convHandle: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.star,
  },
  convHandleUnread: { color: Colors.starlight },
  convTime: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost,
  },
  convPreview: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starGhost,
  },
  convPreviewUnread: { color: Colors.star },
  unreadBadge: {
    backgroundColor: Colors.aurora, borderRadius: BorderRadius.pill,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.void, fontWeight: '700',
  },

  // Message bubbles
  messageList: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xl },
  bubble: {
    maxWidth: '78%', borderRadius: BorderRadius.xl, padding: Spacing.md,
    gap: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.graphiteSoft,
    borderWidth: 1, borderColor: Colors.steel,
    borderTopLeftRadius: BorderRadius.sm,
  },
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.deepBlue,
    borderWidth: 1, borderColor: Colors.signal + '40',
    borderTopRightRadius: BorderRadius.sm,
  },
  bubbleSender: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.aurora, textTransform: 'lowercase',
  },
  bubbleText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body,
    color: Colors.star, lineHeight: 22,
  },
  bubbleTextOwn: { color: Colors.starlight },
  bubbleTime: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starGhost, alignSelf: 'flex-end',
  },
  bubbleTimeOwn: { color: Colors.signal + '80' },

  // Chat input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.steel,
    backgroundColor: Colors.abyss,
  },
  chatInput: {
    flex: 1, maxHeight: 120, minHeight: 44,
    borderRadius: BorderRadius.xl, backgroundColor: Colors.graphite,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.signal, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35, backgroundColor: Colors.steel },
  sendBtnText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 20, color: Colors.void,
  },

  // Compose
  composePanel: { flex: 1, padding: Spacing.xl, gap: Spacing.xl },
  field: { gap: Spacing.sm },
  fieldLabel: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1,
  },
  composeInput: {
    borderRadius: BorderRadius.xl, backgroundColor: Colors.abyss,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
    minHeight: 48,
  },
  composeTextarea: { height: 120, textAlignVertical: 'top' },
  primaryBtn: {
    height: 52, borderRadius: BorderRadius.xl, backgroundColor: Colors.aurora,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.cta, color: Colors.void,
  },
  errorText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.danger,
  },
});
