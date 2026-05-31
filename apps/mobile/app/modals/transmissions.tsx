'use client';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { formatRelative } from '@travelpoint/utils';

interface TransmissionWithSender {
  id: string;
  senderId: string;
  recipientId?: string;
  circleId?: string;
  body: string;
  createdAt: string;
  readAt?: string;
  sender?: { id: string; handle: string; rank: string; displayName?: string };
}

export default function TransmissionsModal() {
  const { explorer } = useAuthStore();
  const [body, setBody] = useState('');
  const [recipientHandle, setRecipientHandle] = useState('');
  const [composing, setComposing] = useState(false);
  const qc = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['transmissions'],
    queryFn: () => api.get<TransmissionWithSender[]>('/api/transmissions'),
    refetchInterval: 15000,
  });

  const send = useMutation({
    mutationFn: ({ handle, body: b }: { handle: string; body: string }) =>
      api.get<{ id: string }>(`/api/explorers/${handle}`).then((recipient) =>
        api.post('/api/transmissions', { recipientId: recipient.id, body: b }),
      ),
    onSuccess: () => {
      setBody('');
      setRecipientHandle('');
      setComposing(false);
      void qc.invalidateQueries({ queryKey: ['transmissions'] });
    },
  });

  function handleSend() {
    if (!recipientHandle.trim() || !body.trim()) return;
    send.mutate({ handle: recipientHandle.trim().replace('@', ''), body: body.trim() });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Sieć</Text>
            <Text style={styles.title}>Transmissions</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setComposing((v) => !v)}
              style={[styles.composeBtn, composing && styles.composeBtnActive]}
              accessibilityLabel="Nowa wiadomość"
            >
              <Text style={[styles.composeBtnText, composing && { color: Colors.aurora }]}>
                {composing ? '✕' : '✎'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Zamknij</Text>
            </Pressable>
          </View>
        </View>

        {/* Compose */}
        {composing && (
          <View style={styles.composePanel}>
            <Text style={styles.composeLabel}>Nowa transmisja</Text>
            <TextInput
              style={styles.input}
              placeholder="@handle odbiorcy"
              placeholderTextColor={Colors.starGhost}
              autoCapitalize="none"
              value={recipientHandle}
              onChangeText={setRecipientHandle}
            />
            <TextInput
              style={[styles.input, styles.bodyInput]}
              placeholder="Wpisz wiadomość..."
              placeholderTextColor={Colors.starGhost}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={[
                styles.sendBtn,
                (!recipientHandle.trim() || !body.trim() || send.isPending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!recipientHandle.trim() || !body.trim() || send.isPending}
            >
              {send.isPending ? (
                <ActivityIndicator color={Colors.void} size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Wyślij transmisję ◎</Text>
              )}
            </Pressable>
            {send.isError && (
              <Text style={styles.errorText}>Błąd — sprawdź handle i spróbuj ponownie</Text>
            )}
          </View>
        )}

        {/* Inbox */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.aurora} size="large" />
          </View>
        ) : !messages || messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyTitle}>Brak wiadomości</Text>
            <Text style={styles.emptySub}>
              Naciśnij ✎ żeby wysłać transmisję do innego explorera.
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isOwn = item.senderId === explorer?.id;
              return (
                <View style={[styles.message, isOwn && styles.messageOwn]}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.sender, isOwn && { color: Colors.aurora }]}>
                      @{item.sender?.handle ?? (isOwn ? explorer?.handle : '?')}
                    </Text>
                    <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.body}>{item.body}</Text>
                  {!item.readAt && !isOwn && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.graphite },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.steel,
  },
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h3, color: Colors.starlight, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  composeBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.pill,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  composeBtnActive: { borderColor: Colors.aurora + '60', backgroundColor: Colors.aurora + '12' },
  composeBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: 18, color: Colors.starFaint },
  closeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  closeBtnText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  composePanel: {
    padding: Spacing.xl, gap: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.steel,
    backgroundColor: Colors.abyss,
  },
  composeLabel: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    height: 48, borderRadius: BorderRadius.xl, backgroundColor: Colors.graphite,
    borderWidth: 1, borderColor: Colors.steel, paddingHorizontal: Spacing.lg,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starlight,
  },
  bodyInput: { height: 80, textAlignVertical: 'top', paddingTop: Spacing.md },
  sendBtn: {
    height: 48, borderRadius: BorderRadius.xl, backgroundColor: Colors.aurora,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.cta, color: Colors.void },
  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.danger },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  emptyIcon: { fontSize: 40, color: Colors.starGhost },
  emptyTitle: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  emptySub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, textAlign: 'center', lineHeight: 22 },
  list: { padding: Spacing.xl },
  sep: { height: 1, backgroundColor: Colors.steel, marginVertical: Spacing.sm },
  message: { gap: Spacing.xs },
  messageOwn: { paddingLeft: Spacing.xl },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sender: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.signal },
  time: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  body: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight, lineHeight: 24 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.aurora, alignSelf: 'flex-end' },
});
