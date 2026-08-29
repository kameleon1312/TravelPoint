import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Pressable, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { z } from 'zod';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import type { Explorer } from '@travelpoint/types';
import { api, ApiError } from '@/lib/api';
import { socketManager } from '@/lib/socket';

const JoinSchema = z.object({
  email: z.string().email('Podaj poprawny adres e-mail'),
  handle: z
    .string()
    .min(3, 'Minimum 3 znaki')
    .max(24, 'Maksimum 24 znaki')
    .regex(/^[a-z0-9][a-z0-9_]*$/, 'Tylko małe litery, cyfry i podkreślenia'),
  password: z
    .string()
    .min(12, 'Minimum 12 znaków')
    .regex(/[A-Z]/, 'Wymagana wielka litera')
    .regex(/[0-9]/, 'Wymagana cyfra')
    .regex(/[^a-zA-Z0-9]/, 'Wymagany znak specjalny'),
  acceptTerms: z.boolean().refine((v) => v, 'Zaakceptuj regulamin'),
  acceptPrivacy: z.boolean().refine((v) => v, 'Zaakceptuj politykę prywatności'),
  inviteCode: z.string().optional(),
});

type JoinInput = z.infer<typeof JoinSchema>;

export default function JoinScreen() {
  const [serverError, setServerError] = useState('');
  const [emailConfirmNeeded, setEmailConfirmNeeded] = useState(false);
  const { setExplorer } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinInput>({
    resolver: zodResolver(JoinSchema),
    defaultValues: {
      email: '',
      handle: '',
      password: '',
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const webUrl = process.env['EXPO_PUBLIC_WEB_URL'] ?? 'https://travelpoint.app';

  async function onSubmit(data: JoinInput) {
    setServerError('');
    setEmailConfirmNeeded(false);

    // Krok 1: Utwórz użytkownika w Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setServerError('Ten e-mail jest już zarejestrowany.');
      } else {
        setServerError(signUpError.message);
      }
      return;
    }

    if (!authData.session) {
      // Supabase wymaga potwierdzenia e-maila — poinformuj użytkownika
      setEmailConfirmNeeded(true);
      return;
    }

    try {
      // Krok 2: Utwórz profil Explorer w naszej bazie
      await api.post('/api/auth/complete-signup', {
        handle: data.handle,
        inviteCode: data.inviteCode || undefined,
      });

      // Krok 3: Pobierz pełny profil
      const explorer = await api.get<Explorer>('/api/explorers/me');
      socketManager.connect(authData.session.access_token);
      setExplorer(explorer);
      router.replace('/(onboarding)/step-1-archetype');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'HANDLE_TAKEN') {
          setServerError('Handle jest już zajęty. Wybierz inny.');
        } else if (error.code === 'EMAIL_TAKEN') {
          setServerError('Ten e-mail jest już zarejestrowany.');
        } else {
          setServerError(error.message);
        }
        // Wyczyść konto Supabase jeśli tworzenie profilu nie powiodło się
        await supabase.auth.signOut();
        return;
      }
      setServerError('Błąd rejestracji. Spróbuj ponownie.');
      await supabase.auth.signOut();
    }
  }

  if (emailConfirmNeeded) {
    return (
      <LinearGradient colors={[Colors.void, Colors.abyss, Colors.midnight]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }} edges={['top', 'bottom']}>
          <Text style={styles.eyebrow}>Prawie gotowe</Text>
          <Text style={[styles.title, { marginVertical: Spacing.lg }]}>Potwierdź e-mail</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            Wysłaliśmy link potwierdzający na podany adres. Kliknij go, a następnie wróć i zaloguj się.
          </Text>
          <View style={{ marginTop: Spacing.xl }}>
            <SignalButton
              label="Mam już konto — zaloguj się"
              onPress={() => router.replace('/(auth)/login')}
              variant="signal"
              size="md"
              fullWidth
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.void, Colors.abyss, Colors.midnight]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.eyebrow}>A Network for the Obsessed</Text>
              <Text style={styles.title}>{pl.auth.joinTitle}</Text>
              <Text style={styles.subtitle}>{pl.auth.joinSubtitle}</Text>
            </View>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <TextInput
                      style={[styles.input, errors.email && styles.inputError]}
                      placeholder={pl.auth.emailPlaceholder}
                      placeholderTextColor={Colors.starGhost}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      value={value}
                      onChangeText={onChange}
                    />
                    {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="handle"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <TextInput
                      style={[styles.input, errors.handle && styles.inputError]}
                      placeholder={pl.auth.handlePlaceholder}
                      placeholderTextColor={Colors.starGhost}
                      autoCapitalize="none"
                      value={value}
                      onChangeText={(v) => onChange(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    />
                    {errors.handle && <Text style={styles.error}>{errors.handle.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <TextInput
                      style={[styles.input, errors.password && styles.inputError]}
                      placeholder={pl.auth.passwordPlaceholder}
                      placeholderTextColor={Colors.starGhost}
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                    <Text style={styles.hint}>Min. 12 znaków · wielka litera · cyfra · znak specjalny</Text>
                    {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="acceptTerms"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.consentGroup}>
                    <Pressable
                      style={styles.consentRow}
                      onPress={() => onChange(!value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: value }}
                    >
                      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                        {value && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.consentText}>{pl.auth.acceptTerms}</Text>
                    </Pressable>
                    <Pressable onPress={() => void Linking.openURL(`${webUrl}/regulamin`)}>
                      <Text style={styles.legalLink}>Przeczytaj regulamin</Text>
                    </Pressable>
                    {errors.acceptTerms && <Text style={styles.error}>{errors.acceptTerms.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="acceptPrivacy"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.consentGroup}>
                    <Pressable
                      style={styles.consentRow}
                      onPress={() => onChange(!value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: value }}
                    >
                      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                        {value && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.consentText}>{pl.auth.acceptPrivacy}</Text>
                    </Pressable>
                    <Pressable onPress={() => void Linking.openURL(`${webUrl}/polityka-prywatnosci`)}>
                      <Text style={styles.legalLink}>Przeczytaj politykę prywatności</Text>
                    </Pressable>
                    {errors.acceptPrivacy && <Text style={styles.error}>{errors.acceptPrivacy.message}</Text>}
                  </View>
                )}
              />

              {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

              <SignalButton
                label={pl.auth.joinCta}
                onPress={handleSubmit(onSubmit)}
                variant="ember"
                size="lg"
                loading={isSubmitting}
                fullWidth
                haptic="medium"
              />

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>{pl.auth.haveAccount} </Text>
                <Text
                  style={styles.loginLink}
                  onPress={() => router.push('/(auth)/login')}
                >
                  {pl.auth.loginCta}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.xxl },
  header: { alignItems: 'center', gap: Spacing.md },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.starFaint,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.h1,
    color: Colors.starlight,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
    textAlign: 'center',
  },
  form: { gap: Spacing.lg },
  fieldGroup: { gap: Spacing.xs },
  input: {
    height: 52,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.graphite,
    borderWidth: 1,
    borderColor: Colors.steel,
    paddingHorizontal: Spacing.xl,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: Colors.starlight,
  },
  inputError: { borderColor: Colors.danger },
  hint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.caption,
    color: Colors.starFaint,
    marginLeft: Spacing.sm,
  },
  error: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.caption,
    color: Colors.danger,
    marginLeft: Spacing.sm,
  },
  consentGroup: { gap: Spacing.xs },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.steel,
    backgroundColor: Colors.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { borderColor: Colors.aurora, backgroundColor: Colors.aurora },
  checkmark: { color: Colors.void, fontSize: 14, fontWeight: '700' },
  consentText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.bodySm,
    color: Colors.star,
  },
  legalLink: {
    marginLeft: 22 + Spacing.md,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: Colors.signal,
  },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  loginLink: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
});
