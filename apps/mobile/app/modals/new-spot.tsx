import {
  View, Text, StyleSheet, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { CreateSpotSchema, type CreateSpotInput } from '@travelpoint/validation';
import { useCreateSpot } from '@/hooks/useSpots';
import { useMyCircles } from '@/hooks/useCircles';
import { pl } from '@/i18n/pl';

const CATEGORIES = ['ABANDONED', 'CAFE', 'BEACH', 'ROUTE', 'UNDERGROUND', 'VIEWPOINT', 'CAMP'] as const;
const ACCESS_LEVELS = ['PUBLIC', 'TRUSTED', 'CIRCLE_ONLY', 'SECRET_DROP'] as const;

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED: '◈', CAFE: '◎', BEACH: '◎', ROUTE: '◉', UNDERGROUND: '◈', VIEWPOINT: '◎', CAMP: '◉',
};

const ACCESS_LABELS: Record<string, string> = {
  PUBLIC:      'Publiczne',
  TRUSTED:     'Trusted+',
  CIRCLE_ONLY: 'Tylko circle',
  SECRET_DROP: 'Secret Drop',
};

const ACCESS_COLORS: Record<string, string> = {
  PUBLIC:      Colors.aurora,
  TRUSTED:     Colors.signal,
  CIRCLE_ONLY: Colors.violet,
  SECRET_DROP: Colors.ember,
};

// Preset expiry options for SECRET_DROP
const DROP_PRESETS = [
  { label: '24h',    hours: 24 },
  { label: '3 dni',  hours: 72 },
  { label: '7 dni',  hours: 168 },
  { label: '30 dni', hours: 720 },
] as const;

export default function NewSpotModal() {
  const { mutateAsync: createSpot } = useCreateSpot();
  const { data: myCircles } = useMyCircles();
  const [serverError, setServerError] = useState('');
  const [gpsLabel, setGpsLabel] = useState('Pobieranie lokalizacji...');
  const [selectedDropPreset, setSelectedDropPreset] = useState<number | null>(null);

  const {
    control, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSpotInput>({
    resolver: zodResolver(CreateSpotSchema),
    defaultValues: {
      accessLevel: 'PUBLIC',
      category: 'ABANDONED',
      lat: 0,
      lng: 0,
    },
  });

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsLabel('Brak dostępu do lokalizacji — koordynaty nie zostaną zapisane.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setValue('lat', loc.coords.latitude);
      setValue('lng', loc.coords.longitude);
      setGpsLabel(
        `📍 ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`,
      );
    })();
  }, [setValue]);

  async function onSubmit(data: CreateSpotInput) {
    setServerError('');
    try {
      await createSpot(data);
      router.back();
    } catch {
      setServerError('Błąd zapisu. Sprawdź połączenie i spróbuj ponownie.');
    }
  }

  function selectDropPreset(hours: number, index: number) {
    setSelectedDropPreset(index);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setValue('dropExpiresAt', expiresAt);
  }

  const selectedCategory  = watch('category');
  const selectedAccess    = watch('accessLevel');
  const selectedCircleId  = watch('circleId');
  const dropExpiresAt     = watch('dropExpiresAt');

  const isSecretDrop  = selectedAccess === 'SECRET_DROP';
  const isCircleOnly  = selectedAccess === 'CIRCLE_ONLY';

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
                    <Pressable
                      key={cat}
                      style={[
                        styles.chip,
                        selectedCategory === cat && styles.chipActive,
                      ]}
                      onPress={() => onChange(cat)}
                    >
                      <Text style={[
                        styles.chipText,
                        selectedCategory === cat && styles.chipTextActive,
                      ]}>
                        {CATEGORY_ICONS[cat]} {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Access level */}
          <View style={styles.field}>
            <Text style={styles.label}>Poziom dostępu</Text>
            <Controller
              control={control}
              name="accessLevel"
              render={({ field: { onChange } }) => (
                <View style={styles.chips}>
                  {ACCESS_LEVELS.map((lvl) => {
                    const isSelected = selectedAccess === lvl;
                    const accentColor = ACCESS_COLORS[lvl] ?? Colors.aurora;
                    return (
                      <Pressable
                        key={lvl}
                        style={[
                          styles.chip,
                          isSelected && {
                            borderColor: accentColor + '80',
                            backgroundColor: accentColor + '18',
                          },
                        ]}
                        onPress={() => {
                          onChange(lvl);
                          if (lvl !== 'SECRET_DROP') {
                            setValue('dropExpiresAt', undefined);
                            setSelectedDropPreset(null);
                          }
                          if (lvl !== 'CIRCLE_ONLY') {
                            setValue('circleId', undefined);
                          }
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          isSelected && { color: accentColor },
                        ]}>
                          {ACCESS_LABELS[lvl]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          {/* CIRCLE_ONLY — pick a circle */}
          {isCircleOnly && (
            <Animated.View entering={FadeInDown.duration(280)}>
              <View style={styles.field}>
                <Text style={styles.label}>Circle</Text>
                {!myCircles || myCircles.length === 0 ? (
                  <GlassCard style={styles.infoCard}>
                    <Text style={styles.infoText}>
                      Nie należysz do żadnego circle. Dołącz lub stwórz circle, by ograniczyć dostęp.
                    </Text>
                  </GlassCard>
                ) : (
                  <Controller
                    control={control}
                    name="circleId"
                    render={({ field: { onChange } }) => (
                      <View style={styles.chips}>
                        {myCircles.map((c) => {
                          const isSelected = selectedCircleId === c.id;
                          return (
                            <Pressable
                              key={c.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipViolet,
                              ]}
                              onPress={() => onChange(c.id)}
                            >
                              <Text style={[
                                styles.chipText,
                                isSelected && { color: Colors.violet },
                              ]}>
                                ◑ {c.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  />
                )}
                {errors.circleId && <Text style={styles.error}>{errors.circleId.message}</Text>}
              </View>
            </Animated.View>
          )}

          {/* SECRET_DROP — expiry selector */}
          {isSecretDrop && (
            <Animated.View entering={FadeInDown.duration(280)}>
              <GlassCard style={styles.dropCard}>
                <Text style={styles.dropTitle}>⬡ Secret Drop</Text>
                <Text style={styles.dropSub}>
                  Spot zniknie po wybranym czasie. Tylko dla uprawnio&shy;nych eksploratorów.
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Czas trwania</Text>
                  <View style={styles.chips}>
                    {DROP_PRESETS.map((preset, i) => (
                      <Pressable
                        key={preset.label}
                        style={[
                          styles.chip,
                          selectedDropPreset === i && styles.chipEmber,
                        ]}
                        onPress={() => selectDropPreset(preset.hours, i)}
                      >
                        <Text style={[
                          styles.chipText,
                          selectedDropPreset === i && { color: Colors.ember },
                        ]}>
                          {preset.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {dropExpiresAt && (
                  <View style={styles.expiryRow}>
                    <Text style={styles.expiryLabel}>Wygaśnie:</Text>
                    <Text style={styles.expiryValue}>
                      {new Date(dropExpiresAt).toLocaleString('pl-PL', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}

                {isSecretDrop && !dropExpiresAt && (
                  <Text style={styles.error}>Wybierz czas trwania Secret Drop</Text>
                )}
              </GlassCard>
            </Animated.View>
          )}

          {/* Geo info */}
          <View style={styles.geoInfo}>
            <Text style={styles.geoText}>{gpsLabel}</Text>
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
  textArea: { height: 100, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.danger },
  error: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.danger,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1, borderColor: Colors.steel, borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    backgroundColor: Colors.abyss,
  },
  chipActive: {
    borderColor: Colors.aurora + '70', backgroundColor: Colors.aurora + '15',
  },
  chipViolet: {
    borderColor: Colors.violet + '70', backgroundColor: Colors.violet + '15',
  },
  chipEmber: {
    borderColor: Colors.ember + '70', backgroundColor: Colors.ember + '15',
  },
  chipText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.caption, color: Colors.starFaint,
  },
  chipTextActive: { color: Colors.aurora },

  infoCard: { padding: Spacing.lg },
  infoText: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, lineHeight: 20,
  },

  dropCard: { gap: Spacing.lg },
  dropTitle: {
    fontFamily: 'ClashDisplay-Bold', fontSize: FontSize.h4, color: Colors.ember,
  },
  dropSub: {
    fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm,
    color: Colors.star, lineHeight: 20,
  },
  expiryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.ember + '12', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ember + '30',
  },
  expiryLabel: {
    fontFamily: 'SpaceMono-Regular', fontSize: FontSize.micro,
    color: Colors.starFaint, textTransform: 'uppercase', letterSpacing: 1,
  },
  expiryValue: {
    fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.ember,
  },

  geoInfo: { backgroundColor: Colors.midnight, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  geoText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star, lineHeight: 20 },
  actions: { gap: Spacing.md },
});
