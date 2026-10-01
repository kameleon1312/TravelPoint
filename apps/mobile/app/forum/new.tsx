import {
  View, Text, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { SignalButton } from '@/components/ui/SignalButton';
import { BackButton } from '@/components/ui/BackButton';
import { useAddForumPost, type ForumCategory } from '@/hooks/useForum';

const CATEGORIES: { key: ForumCategory; label: string; color: string }[] = [
  { key: 'FIELD_NOTES', label: 'Field Notes', color: Colors.aurora },
  { key: 'GEAR',        label: 'Gear',        color: Colors.signal },
  { key: 'SAFETY',      label: 'Safety',      color: Colors.ember },
  { key: 'REQUESTS',    label: 'Requests',    color: Colors.sand },
  { key: 'STORIES',     label: 'Stories',     color: Colors.violet },
];

export default function NewForumPostScreen() {
  const { mutateAsync: addPost, isPending } = useAddForumPost();
  const [category, setCategory] = useState<ForumCategory>('FIELD_NOTES');
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');

  async function submit() {
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) { Alert.alert('Błąd', 'Tytuł musi mieć min. 3 znaki.'); return; }
    if (b.length < 10) { Alert.alert('Błąd', 'Treść musi mieć min. 10 znaków.'); return; }

    try {
      const post = await addPost({ title: t, body: b, category });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/forum/${post.slug}`);
    } catch (e: unknown) {
      Alert.alert('Błąd', e instanceof Error ? e.message : 'Spróbuj ponownie.');
    }
  }

  const active = CATEGORIES.find((c) => c.key === category)!;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <BackButton />
          <Text style={styles.heading}>Nowy post</Text>
          <SignalButton
            label="Opublikuj"
            onPress={() => void submit()}
            variant="aurora"
            size="sm"
            haptic="medium"
            loading={isPending}
            disabled={title.trim().length < 3 || body.trim().length < 10}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Category */}
          <GlassCard style={styles.section}>
            <Text style={styles.label}>Kategoria</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const isActive = c.key === category;
                return (
                  <SignalButton
                    key={c.key}
                    label={c.label}
                    onPress={() => setCategory(c.key)}
                    variant={isActive ? 'aurora' : 'ghost'}
                    size="sm"
                    haptic="light"
                  />
                );
              })}
            </View>
          </GlassCard>

          {/* Title */}
          <GlassCard style={styles.section}>
            <Text style={styles.label}>Tytuł</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Tytuł posta…"
              placeholderTextColor={Colors.starGhost}
              maxLength={120}
              returnKeyType="next"
              autoFocus
            />
            <Text style={styles.charCount}>{title.length}/120</Text>
          </GlassCard>

          {/* Body */}
          <GlassCard style={styles.section}>
            <Text style={styles.label}>Treść</Text>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="Napisz co masz do przekazania społeczności…"
              placeholderTextColor={Colors.starGhost}
              multiline
              maxLength={10000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{body.length}/10000</Text>
          </GlassCard>

          {/* Preview chip */}
          <View style={[styles.previewChip, { borderColor: active.color }]}>
            <View style={[styles.previewDot, { backgroundColor: active.color }]} />
            <Text style={[styles.previewCategory, { color: active.color }]}>
              {active.label}
            </Text>
            {title.trim() ? (
              <Text style={styles.previewTitle} numberOfLines={1}>{title.trim()}</Text>
            ) : (
              <Text style={styles.previewPlaceholder}>Tytuł posta…</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.abyss },
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

  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },

  section: { gap: Spacing.sm },
  label: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  titleInput: {
    fontFamily: 'ClashDisplay-Semibold',
    fontSize: FontSize.h4,
    color: Colors.starlight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.steel,
    paddingVertical: Spacing.sm,
  },
  bodyInput: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starlight,
    lineHeight: 22,
    minHeight: 140,
    paddingTop: Spacing.xs,
  },
  charCount: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    color: Colors.starGhost,
    textAlign: 'right',
    marginTop: 2,
  },

  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.graphite,
  },
  previewDot: { width: 6, height: 6, borderRadius: 3 },
  previewCategory: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewTitle: {
    flex: 1,
    fontFamily: 'ClashDisplay-Semibold',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  previewPlaceholder: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starGhost,
  },
});
