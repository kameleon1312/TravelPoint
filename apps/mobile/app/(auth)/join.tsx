import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Pressable, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RegisterSchema, type RegisterInput } from '@travelpoint/validation';
import { Colors, FontSize, Spacing, BorderRadius } from '@travelpoint/theme';
import { SignalButton } from '@/components/ui/SignalButton';
import { pl } from '@/i18n/pl';
import { useState } from 'react';
import { tokenStorage } from '@/lib/secureStorage';
import { useAuthStore } from '@/stores/auth';
import type { Explorer } from '@travelpoint/types';
import { api, ApiError } from '@/lib/api';

export default function JoinScreen() {
  const [serverError, setServerError] = useState('');
  const { setExplorer } = useAuthStore();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: '',
      handle: '',
      password: '',
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });
  const webUrl = process.env['EXPO_PUBLIC_WEB_URL'] ?? 'https://travelpoint.app';

  async function onSubmit(data: RegisterInput) {
    setServerError('');
    try {
      const body = await api.post<{
        accessToken: string;
        refreshToken: string;
        explorer: Explorer;
      }>('/api/auth/join', data);
      await tokenStorage.setTokens(body.accessToken, body.refreshToken);
      setExplorer(body.explorer);
      router.replace('/(onboarding)/step-1-archetype');
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        return;
      }
      setServerError('Błąd rejestracji. Spróbuj ponownie.');
    }
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
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>A Network for the Obsessed</Text>
              <Text style={styles.title}>{pl.auth.joinTitle}</Text>
              <Text style={styles.subtitle}>{pl.auth.joinSubtitle}</Text>
            </View>

            {/* Form */}
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
