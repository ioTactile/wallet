import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export function MenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const colors = Colors.light;
  const initial = session?.user.email.slice(0, 1).toUpperCase() ?? '?';

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.brand }]}>
        <Pressable style={styles.identity} onPress={() => router.push('/profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.email}>{session?.user.email}</Text>
            <Text style={styles.wallet}>{t('menu.wallet')}</Text>
          </View>
        </Pressable>
      </View>
      <Pressable style={styles.row} onPress={() => router.replace('/')}>
        <Text style={styles.rowLabel}>{t('home.title')}</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/profile')}>
        <Text style={styles.rowLabel}>{t('profile.title')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontWeight: '700',
    fontSize: 18,
  },
  email: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  wallet: {
    color: '#E8FFF1',
    marginTop: 2,
  },
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 16,
  },
});
