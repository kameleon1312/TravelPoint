import {
  View, Text, StyleSheet, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { BackButton } from '@/components/ui/BackButton';
import { useForumPost, useAddForumReply, type ForumReply } from '@/hooks/useForum';
import { useAuthStore } from '@/stores/auth';

const CATEGORY_COLORS: Record<string, string> = {
  FIELD_NOTES: Colors.aurora,
  GEAR:        Colors.signal,
  SAFETY:      Colors.ember,
  REQUESTS:    Colors.sand,
  STORIES:     Colors.violet,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ReplyCard({ reply, index }: { reply: ForumReply; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 25).duration(280)}>
      <GlassCard style={styles.replyCard}>
        <View style={styles.replyHeader}>
          <Text style={styles.replyHandle}>{reply.author.handle}</Text>
          <Text style={styles.replyRank}>{reply.author.rank}</Text>
          <Text style={styles.replyDate}>{formatDate(reply.createdAt)}</Text>
        </View>
        <Text style={styles.replyBody}>{reply.body}</Text>
      </GlassCard>
    </Animated.View>
  );
}

export default function ForumThreadScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: post, isLoading } = useForumPost(slug ?? '');
  const { mutateAsync: addReply, isPending } = useAddForumReply(slug ?? '');
  const { explorer } = useAuthStore();
  const [replyBody, setReplyBody] = useState('');
  const inputRef = useRef<TextInput>(null);

  async function submitReply() {
    const body = replyBody.trim();
    if (body.length < 2) return;
    try {
      await addReply(body);
      setReplyBody('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd';
      if (msg.includes('POST_LOCKED')) {
        Alert.alert('Wątek zablokowany', 'Moderator zablokował możliwość odpowiedzi.');
      } else {
        Alert.alert('Błąd', msg);
      }
    }
  }

  if (isLoading || !post) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.aurora} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const accent = CATEGORY_COLORS[post.category] ?? Colors.signal;
  const isLocked = !!post.lockedAt;
  const canReply = !!explorer && !isLocked;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.topBar}>
          <BackButton />
          <Text style={styles.heading} numberOfLines={1}>Forum</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Original post */}
          <GlassCard style={styles.postCard}>
            <View style={styles.postCategoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: accent }]} />
              <Text style={[styles.categoryLabel, { color: accent }]}>
                {post.category.replace('_', ' ')}
              </Text>
              {post.isPinned && <Text style={styles.badge}>📌 pinned</Text>}
              {isLocked && <Text style={[styles.badge, { color: Colors.ember }]}>🔒 zablokowany</Text>}
            </View>

            <Text style={styles.postTitle}>{post.title}</Text>

            <Text style={styles.postMeta}>
              {post.author.handle} · {post.author.rank} · {formatDate(post.createdAt)}
            </Text>

            <Text style={styles.postBody}>{post.body}</Text>
          </GlassCard>

          {/* Replies */}
          {post.replies.length > 0 && (
            <View style={styles.repliesSection}>
              <Text style={styles.repliesLabel}>
                {post.replies.length} {post.replies.length === 1 ? 'odpowiedź' : 'odpowiedzi'}
              </Text>
              {post.replies.map((r, i) => (
                <ReplyCard key={r.id} reply={r} index={i} />
              ))}
            </View>
          )}

          {post.replies.length === 0 && !isLocked && (
            <Text style={styles.noReplies}>Bądź pierwszy który odpowie.</Text>
          )}
        </ScrollView>

        {/* Reply input */}
        {canReply && (
          <View style={styles.replyBar}>
            <TextInput
              ref={inputRef}
              style={styles.replyInput}
              value={replyBody}
              onChangeText={setReplyBody}
              placeholder="Odpowiedz…"
              placeholderTextColor={Colors.starGhost}
              multiline
              maxLength={3000}
            />
            <SignalButton
              label="→"
              onPress={() => void submitReply()}
              variant="aurora"
              size="sm"
              loading={isPending}
              haptic="medium"
              disabled={replyBody.trim().length < 2}
            />
          </View>
        )}

        {isLocked && (
          <View style={styles.lockedBar}>
            <Text style={styles.lockedText}>Wątek zablokowany przez moderatora</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  heading: {
    flex: 1,
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h3,
    color: Colors.starlight,
    letterSpacing: -0.4,
  },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg },

  postCard: { gap: Spacing.sm },
  postCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryDot:   { width: 6, height: 6, borderRadius: 3 },
  categoryLabel: { fontFamily: 'SpaceMono-Regular', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  badge:         { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starFaint, marginLeft: 8 },
  postTitle: {
    fontFamily: 'ClashDisplay-Semibold',
    fontSize: FontSize.h3,
    color: Colors.starlight,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  postMeta: { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starFaint },
  postBody: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.star,
    lineHeight: 22,
  },

  repliesSection: { gap: Spacing.sm },
  repliesLabel: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  noReplies: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starGhost,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  replyCard:   { gap: Spacing.xs },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  replyHandle: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.starlight },
  replyRank:   { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.signal, flex: 1 },
  replyDate:   { fontFamily: 'SpaceMono-Regular', fontSize: 10, color: Colors.starGhost },
  replyBody: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    lineHeight: 20,
  },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.steel,
    backgroundColor: Colors.graphite,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.abyss,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  lockedBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.steel,
    backgroundColor: Colors.graphite,
    alignItems: 'center',
  },
  lockedText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.ember,
  },
});
