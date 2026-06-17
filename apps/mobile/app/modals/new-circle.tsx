import { View, Text, StyleSheet, TextInput, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { useCreateCircle } from '@/hooks/useCircles';

const CreateCircleSchema = z.object({
  name: z.string().min(3, 'Minimum 3 znaki').max(50, 'Maksimum 50 znaków'),
  slug: z
    .string()
    .min(3, 'Minimum 3 znaki')
    .max(24, 'Maksimum 24 znaki')
    .regex(/^[a-z0-9_-]+$/, 'Tylko małe litery, cyfry, _ i -'),
  description: z.string().max(200, 'Maksimum 200 znaków').optional(),
  isInviteOnly: z.boolean(),
});

type FormData = z.infer<typeof CreateCircleSchema>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
}

export default function NewCircleModal() {
  const { mutateAsync: createCircle, isPending } = useCreateCircle();

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(CreateCircleSchema),
    defaultValues: { name: '', slug: '', description: '', isInviteOnly: false },
  });

  async function onSubmit(data: FormData) {
    try {
      await createCircle(data);
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nieznany błąd';
      if (msg.includes('EXPEDITION')) {
        Alert.alert('Wymagany tier', 'Tworzenie circles wymaga tieru EXPEDITION.');
      } else {
        Alert.alert('Błąd', msg);
      }
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Nowy Circle</Text>
            <Text style={styles.title}>Stwórz swój circle</Text>
            <Text style={styles.subtitle}>Zamknięta grupa explorers z własną mapą i transmissjami.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Nazwa</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={value}
                    onChangeText={(v) => {
                      onChange(v);
                      setValue('slug', slugify(v));
                    }}
                    placeholder="np. Urbex Polska"
                    placeholderTextColor={Colors.starGhost}
                    autoCapitalize="words"
                  />
                )}
              />
              {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Slug</Text>
              <Controller
                control={control}
                name="slug"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.slug && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="urbex_polska"
                    placeholderTextColor={Colors.starGhost}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              {errors.slug && <Text style={styles.error}>{errors.slug.message}</Text>}
              <Text style={styles.hint}>Unikalny identyfikator circle. Tylko a-z, 0-9, _, -</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Opis (opcjonalnie)</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="O czym jest ten circle?"
                    placeholderTextColor={Colors.starGhost}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                )}
              />
            </View>

            <GlassCard style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>Tylko na zaproszenie</Text>
                  <Text style={styles.toggleDesc}>Nowi members muszą mieć invite code</Text>
                </View>
                <Controller
                  control={control}
                  name="isInviteOnly"
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{ false: Colors.steel, true: Colors.aurora + '80' }}
                      thumbColor={value ? Colors.aurora : Colors.starFaint}
                    />
                  )}
                />
              </View>
            </GlassCard>
          </View>

          <View style={styles.actions}>
            <SignalButton
              label="Stwórz circle"
              onPress={handleSubmit(onSubmit)}
              variant="aurora"
              size="lg"
              fullWidth
              loading={isPending}
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.abyss },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  header: { gap: Spacing.sm },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h2,
    color: Colors.starlight,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
  },
  form: { gap: Spacing.lg },
  field: { gap: Spacing.xs },
  label: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  inputMultiline: {
    height: 80,
    paddingTop: Spacing.md,
  },
  inputError: { borderColor: Colors.ember },
  error: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.ember,
  },
  hint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.micro,
    color: Colors.starGhost,
  },
  toggleCard: { padding: Spacing.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleText: { flex: 1, gap: Spacing.xs },
  toggleLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  toggleDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.starFaint,
  },
  actions: { gap: Spacing.md },
});
