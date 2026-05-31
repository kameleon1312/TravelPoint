import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { CreateSpotSchema, type CreateSpotInput } from '@travelpoint/validation';
import { useCreateSpot } from '@/hooks/useSpots';
import { pl } from '@/i18n/pl';
import { useState } from 'react';

const CATEGORIES = ['ABANDONED', 'CAFE', 'BEACH', 'ROUTE', 'UNDERGROUND', 'VIEWPOINT', 'CAMP'] as const;
const ACCESS_LEVELS = ['PUBLIC', 'TRUSTED', 'CIRCLE_ONLY'] as const;

export default function NewSpotModal() {
  const { mutateAsync: createSpot } = useCreateSpot();
  const [serverError, setServerError] = useState('');

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateSpotInput>({
    resolver: zodResolver(CreateSpotSchema),
    defaultValues: {
      accessLevel: 'PUBLIC',
      category: 'ABANDONED',
      lat: 0,
      lng: 0,
    },
  });

  async function onSubmit(data: CreateSpotInput) {
    setServerError('');
    try {
      await createSpot(data);
      router.back();
    } catch {
      setServerError('Błąd zapisu. Sprawdź połączenie.');
    }
  }

  const selectedCategory = watch('category');
  const selectedAccess = watch('accessLevel');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Nowe odkrycie</Text>
            <Text style={styles.title}>{pl.spots.dropSpot}</Text>
          </View>

          {/* Title */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Nazwa miejsca</Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="np. Opuszczona fabryka przy dworcu..."
                  placeholderTextColor={Colors.starGhost}
                  value={value}
                  onChangeText={onChange}
                  maxLength={120}
                />
                {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}
              </View>
            )}
          />

          {/* Story */}
          <Controller
            control={control}
            name="story"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Historia (opcjonalnie)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Co kryje to miejsce? Jak tam trafiłeś?"
                  placeholderTextColor={Colors.starGhost}
                  value={value ?? ''}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                />
              </View>
            )}
          />

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Kategoria</Text>
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange } }) => (
                <View style={styles.chips}>
                  {CATEGORIES.map((cat) => (
                    <SignalButton
                      key={cat}
                      label={cat}
                      onPress={() => onChange(cat)}
                      variant={selectedCategory === cat ? 'signal' : 'ghost'}
                      size="sm"
                    />
                  ))}
                </View>
              )}
            />
          </View>

          {/* Access level */}
          <View style={styles.field}>
            <Text style={styles.label}>Dostęp</Text>
            <Controller
              control={control}
              name="accessLevel"
              render={({ field: { onChange } }) => (
                <View style={styles.chips}>
                  {ACCESS_LEVELS.map((lvl) => (
                    <SignalButton
                      key={lvl}
                      label={lvl.replace('_', ' ')}
                      onPress={() => onChange(lvl)}
                      variant={selectedAccess === lvl ? 'aurora' : 'ghost'}
                      size="sm"
                    />
                  ))}
                </View>
              )}
            />
          </View>

          {/* Geo — placeholder (real: use expo-location) */}
          <View style={styles.geoInfo}>
            <Text style={styles.geoText}>
              📍 Lokalizacja zostanie pobrana z GPS po wyrażeniu zgody na dostęp do lokalizacji.
            </Text>
          </View>

          {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

          <View style={styles.actions}>
            <SignalButton
              label="Drop a Spot"
              onPress={handleSubmit(onSubmit)}
              variant="ember"
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
  eyebrow: { fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro, color: Colors.starFaint, letterSpacing: 3, textTransform: 'uppercase' },
  title: { fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h2, color: Colors.starlight },
  field: { gap: Spacing.sm },
  label: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.caption, color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    borderRadius: BorderRadius.xl, backgroundColor: Colors.abyss, borderWidth: 1, borderColor: Colors.steel,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.body, color: Colors.starlight,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.danger },
  error: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  geoInfo: { backgroundColor: Colors.midnight, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  geoText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 20 },
  actions: { gap: Spacing.md },
});
