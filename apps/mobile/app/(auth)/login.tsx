import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { z } from 'zod';
import { Colors, FontSize, Spacing, BorderRadius, Gradients } from '@travelpoint/theme';
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
      } else {
        setServerError('Błąd połączenia. Spróbuj ponownie.');
      }
    }
  }

  return (
    <LinearGradient colors={[Colors.void, Colors.abyss, Colors.midnight]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Powrót do sieci</Text>
              <Text style={styles.title}>{pl.auth.loginTitle}</Text>
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
                  </View>
                )}
              />

              {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

              <SignalButton
                label={pl.auth.loginCta}
                onPress={handleSubmit(onSubmit)}
                variant="signal"
                size="lg"
                loading={isSubmitting}
                fullWidth
                haptic="medium"
              />

              <View style={styles.row}>
                <Text style={styles.rowText}>{pl.auth.noAccount} </Text>
                <Text style={styles.rowLink} onPress={() => router.push('/(auth)/join')}>
                  Request Access
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
  },
  row: { flexDirection: 'row', justifyContent: 'center' },
  rowText: { fontFamily: 'GeneralSans-Regular', fontSize: FontSize.bodySm, color: Colors.starFaint },
  rowLink: { fontFamily: 'GeneralSans-Semibold', fontSize: FontSize.bodySm, color: Colors.aurora },
});
