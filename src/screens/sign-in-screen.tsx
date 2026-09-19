import { zodResolver } from '@hookform/resolvers/zod';
import { loginBodySchema } from '@wallet/shared';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { AuthApiError } from '@/domain/ports';

type FormValues = {
  email: string;
  password: string;
};

export function SignInScreen() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const colors = Colors.light;

  const form = useForm<FormValues>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    if (form.formState.isSubmitting) return;
    setError(null);
    try {
      if (mode === 'login') {
        await login(values.email, values.password);
      } else {
        await register(values.email, values.password);
      }
    } catch (cause) {
      if (cause instanceof AuthApiError && cause.code === 'invalid_credentials') {
        setError(t('signIn.invalidCredentials'));
        return;
      }
      if (cause instanceof AuthApiError && cause.code === 'email_already_taken') {
        setError(t('signIn.emailTaken'));
        return;
      }
      setError(t('signIn.genericError'));
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader title={mode === 'login' ? t('signIn.title') : t('signIn.registerTitle')} />
      <View style={styles.form}>
        <Text style={styles.label}>{t('signIn.email')}</Text>
        <Controller
          control={form.control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
            />
          )}
        />
        <Text style={styles.label}>{t('signIn.password')}</Text>
        <Controller
          control={form.control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              secureTextEntry
              autoComplete={mode === 'login' ? 'password' : 'new-password'}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
            />
          )}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable
          disabled={form.formState.isSubmitting}
          onPress={form.handleSubmit(onSubmit)}
          style={[styles.submit, { backgroundColor: colors.brand, opacity: form.formState.isSubmitting ? 0.7 : 1 }]}>
          <Text style={[styles.submitLabel, { color: colors.onBrand }]}>{t('signIn.submit')}</Text>
        </Pressable>
        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={[styles.switch, { color: colors.action }]}>
            {mode === 'login' ? t('signIn.switchToRegister') : t('signIn.switchToLogin')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  form: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: Spacing.two,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: {
    marginTop: Spacing.two,
  },
  submit: {
    marginTop: Spacing.four,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  switch: {
    textAlign: 'center',
    marginTop: Spacing.three,
    fontSize: 14,
  },
});
