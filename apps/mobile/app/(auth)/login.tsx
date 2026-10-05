import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground,
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
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/lib/api';
import { useState } from 'react';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError('');
    try {
      await login(data.email, data.password);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError('Nieprawidłowy e-mail lub hasło.');
      } else if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Błąd połączenia. Spróbuj ponownie.');
      }
    }
  }

  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../../assets/images/loginview.jpg')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      {/* Top: subtle darkening, bottom: heavy gradient for content legibility */}
      <LinearGradient
        colors={['rgba(7,10,12,0.15)', 'rgba(7,10,12,0.25)', 'rgba(7,10,12,0.82)', 'rgba(7,10,12,0.97)']}
        locations={[0, 0.35, 0.68, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Brand mark — top left, SCAPES style */}
          <View style={styles.brandBar}>
            <Text style={styles.brandMark}>TP</Text>
            <Text style={styles.brandName}>TravelPoint</Text>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Hero text — positioned in lower portion like SCAPES */}
              <View style={styles.heroText}>
                <Text style={styles.eyebrow}>Powrót do sieci</Text>
                <Text style={styles.title}>{pl.auth.loginTitle}</Text>
                <Text style={styles.subtitle}>
                  Twoja sieć ukrytych miejsc czeka.
                </Text>
              </View>

              {/* Form panel */}
              <View style={styles.glassPanel}>
                <View style={styles.form}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, value } }) => (
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
                    )}
                  />

                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={[styles.input, errors.password && styles.inputError]}
                        placeholder={pl.auth.passwordPlaceholder}
                        placeholderTextColor={Colors.starGhost}
                        secureTextEntry
                        value={value}
                        onChangeText={onChange}
                      />
                    )}
                  />

                  {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

                  <SignalButton
                    label={pl.auth.loginCta}
                    onPress={handleSubmit(onSubmit)}
                    variant="aurora"
                    size="lg"
                    loading={isSubmitting}
                    fullWidth
                    haptic="medium"
                  />

                  <View style={styles.row}>
                    <Text style={styles.rowText}>{pl.auth.noAccount} </Text>
                    <Text style={styles.rowLink} onPress={() => router.push('/(auth)/join')}>
                      {pl.auth.joinCta}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  brandMark: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 18,
    color: Colors.starlight,
    letterSpacing: -0.5,
  },
  brandName: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: FontSize.caption,
    color: 'rgba(237,232,223,0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroText: {
    gap: Spacing.sm,
  },
  eyebrow: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: FontSize.micro,
    color: Colors.aurora,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: 42,
    color: Colors.starlight,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: FontSize.body,
    color: 'rgba(237,232,223,0.65)',
    lineHeight: 24,
  },
  glassPanel: {
    backgroundColor: 'rgba(13,16,19,0.92)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(237,232,223,0.10)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    padding: Spacing.xl,
  },
  form: { gap: Spacing.lg },
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
  row: { flexDirection: 'row', justifyContent: 'center', paddingTop: 4 },
  rowText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.star },
  rowLink: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
});
