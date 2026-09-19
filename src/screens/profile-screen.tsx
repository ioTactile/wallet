import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, logout } = useAuth();
  const colors = Colors.light;
  const initial = session?.user.email.slice(0, 1).toUpperCase() ?? '?';

  async function onLogout() {
    await logout();
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('profile.title')}
        leftIcon="chevron.left"
        rightIcon="checkmark"
        onLeftPress={() => router.back()}
      />
      <View style={styles.body}>
        <Text style={styles.label}>{t('profile.firstName')}</Text>
        <Text style={styles.value} />
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initial}</Text>
        </View>
        <Text style={styles.label}>{t('profile.lastName')}</Text>
        <Text style={styles.value} />
        <Text style={styles.label}>{t('profile.email')}</Text>
        <Text style={styles.value}>{session?.user.email}</Text>
        <Pressable
          onPress={onLogout}
          style={[styles.logout, { backgroundColor: colors.danger }]}>
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
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '700',
  },
  label: {
    alignSelf: 'stretch',
    color: '#9CA3AF',
    fontSize: 13,
  },
  value: {
    alignSelf: 'stretch',
    fontSize: 16,
    marginBottom: Spacing.five,
  },
  logout: {
    marginTop: Spacing.four,
    alignSelf: 'stretch',
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
