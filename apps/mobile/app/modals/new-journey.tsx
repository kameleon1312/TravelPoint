import {
  View, Text, StyleSheet, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { CreateJourneySchema, type CreateJourneyInput } from '@travelpoint/validation';
import { useCreateJourney } from '@/hooks/useJourneys';
import { promptUpgradeOnTierError } from '@/lib/upgradePrompt';
import { pl } from '@/i18n/pl';
import { TierLimits } from '@travelpoint/types';
import { useState } from 'react';

export default function NewJourneyModal() {
  const { mutateAsync: createJourney } = useCreateJourney();
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateJourneyInput>({
    resolver: zodResolver(CreateJourneySchema),
    defaultValues: { isPrivate: true },
  });

  async function onSubmit(data: CreateJourneyInput) {
    setServerError('');
    try {
      const journey = await createJourney(data);
      router.back();
      router.push(`/journey/${(journey as { id: string }).id}`);
    } catch (err) {
      if (promptUpgradeOnTierError(err, pl.upgrade.journeyLimit(TierLimits.FREE.journeys))) return;
      setServerError('Błąd zapisu. Sprawdź połączenie.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Nowa ekspedycja</Text>
            <Text style={styles.title}>Nowa Wyprawa</Text>
          </View>

          {/* Title */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Nazwa wyprawy</Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="np. Poranek w opuszczonej fabryce..."
                  placeholderTextColor={Colors.starGhost}
                  value={value}
                  onChangeText={onChange}
                  maxLength={120}
                />
                {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}
              </View>
            )}
          />

          {/* Mood */}
          <Controller
            control={control}
            name="mood"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Nastrój (opcjonalnie)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="jedno zdanie, jedno uczucie..."
                  placeholderTextColor={Colors.starGhost}
                  value={value ?? ''}
                  onChangeText={onChange}
                  maxLength={60}
                />
              </View>
            )}
          />

          {/* Soundtrack */}
          <Controller
            control={control}
            name="soundtrack"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Ścieżka dźwiękowa — URL (opcjonalnie)</Text>
                <TextInput
                  style={[styles.input, errors.soundtrack && styles.inputError]}
                  placeholder="https://open.spotify.com/..."
                  placeholderTextColor={Colors.starGhost}
                  value={value ?? ''}
                  onChangeText={onChange}
                  keyboardType="url"
                  autoCapitalize="none"
                  maxLength={500}
                />
                {errors.soundtrack && <Text style={styles.error}>{errors.soundtrack.message}</Text>}
              </View>
            )}
          />

          {/* Privacy toggle */}
          <Controller
            control={control}
            name="isPrivate"
            render={({ field: { onChange, value } }) => (
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={styles.label}>Prywatna wyprawa</Text>
                  <Text style={styles.toggleSub}>
                    {value ? '🔒 Widoczne tylko dla Ciebie' : '◎ Publiczne w Twoim profilu'}
                  </Text>
                </View>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: Colors.steel, true: Colors.aurora + '60' }}
                  thumbColor={value ? Colors.aurora : Colors.starGhost}
                />
              </View>
            )}
          />

          {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

          <View style={styles.actions}>
            <SignalButton
              label="Ruszam w drogę ◎"
              onPress={handleSubmit(onSubmit)}
              variant="aurora"
              size="lg"
              loading={isSubmitting}
              fullWidth
              haptic="heavy"
            />
            <SignalButton
              label="Anuluj"
              onPress={() => router.back()}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.graphite },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  header: { gap: Spacing.xs },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase',
  },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  field: { gap: Spacing.sm },
  label: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    borderRadius: BorderRadius.xl, backgroundColor: Colors.abyss,
    borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
  },
  inputError: { borderColor: Colors.danger },
  error: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.danger },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.abyss, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.steel, padding: Spacing.lg,
  },
  toggleLabel: { flex: 1, gap: 4 },
  toggleSub: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint },
  actions: { gap: Spacing.md },
});
