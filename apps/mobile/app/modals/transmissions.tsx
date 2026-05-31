import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { api } from '@/lib/api';
import type { Transmission } from '@travelpoint/types';
import { formatRelative } from '@travelpoint/utils';

export default function TransmissionsModal() {
  const [body, setBody] = useState('');
  const qc = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ['transmissions'],
    queryFn: () => api.get<Transmission[]>('/api/transmissions'),
    refetchInterval: 10000,
  });

  const send = useMutation({
    mutationFn: ({ recipientId, body: b }: { recipientId: string; body: string }) =>
      api.post('/api/transmissions', { recipientId, body: b }),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['transmissions'] });
    },
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Text style={styles.title}>Transmissions</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {(!messages || messages.length === 0) ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyText}>Brak wiadomości</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={styles.message}>
                <Text style={styles.sender}>@sender</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </View>
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.steel }} />}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.graphite },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.steel },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.starlight },
  close: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.h4, color: Colors.starFaint },
  list: { padding: Spacing.xl },
  message: { paddingVertical: Spacing.md, gap: Spacing.xs },
  sender: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.caption, color: Colors.aurora },
  body: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight, lineHeight: 22 },
  time: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starGhost },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  emptyIcon: { fontSize: 40, color: Colors.starGhost },
  emptyText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starFaint },
});
