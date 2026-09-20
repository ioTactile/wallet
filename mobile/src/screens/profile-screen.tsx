import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileBodySchema, type UpdateProfileBody } from '@wallet/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, updateProfile, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const colors = Colors.light;

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<UpdateProfileBody>({
    resolver: zodResolver(updateProfileBodySchema),
    defaultValues: {
      firstName: session?.user.firstName ?? '',
      lastName: session?.user.lastName ?? '',
    },
    mode: 'onChange',
  });

  const firstName = watch('firstName');
  const initial =
    firstName.trim().slice(0, 1).toUpperCase() ||
    session?.user.email.slice(0, 1).toUpperCase() ||
    '?';

  async function onSave(values: UpdateProfileBody) {
    if (isSubmitting) return;
    setError(null);
    try {
      await updateProfile(values.firstName, values.lastName);
      router.replace('/');
    } catch {
      setError(t('profile.saveError'));
    }
  }

  async function onLogout() {
    await logout();
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('profile.title')}
        leftIcon="chevronLeft"
        rightIcon="checkmark"
        onLeftPress={() => router.back()}
        onRightPress={isSubmitting ? undefined : handleSubmit(onSave)}
      />
      <View style={styles.body}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{initial}</Text>
          </View>
          <View style={styles.nameFields}>
            <Text style={styles.label}>{t('profile.firstName')}</Text>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize="words"
                  autoComplete="given-name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  style={styles.input}
                  editable={!isSubmitting}
                />
              )}
            />
            <Text style={styles.label}>{t('profile.lastName')}</Text>
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize="words"
                  autoComplete="family-name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  style={styles.input}
                  editable={!isSubmitting}
                />
              )}
            />
          </View>
        </View>
        <Text style={styles.label}>{t('profile.email')}</Text>
        <Text style={styles.value}>{session?.user.email}</Text>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable onPress={onLogout} style={[styles.logout, { backgroundColor: colors.danger }]}>
          <Text style={[styles.logoutLabel, { color: colors.onBrand }]}>{t('profile.logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: Spacing.five,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.five,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '700',
  },
  nameFields: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  input: {
    fontSize: 16,
    marginBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
    paddingVertical: Spacing.two,
  },
  value: {
    fontSize: 16,
    marginBottom: Spacing.five,
  },
  error: {
    marginBottom: Spacing.three,
  },
  logout: {
    marginTop: Spacing.four,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
});
