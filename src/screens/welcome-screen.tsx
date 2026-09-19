import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Spacing } from '@/constants/theme';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.light;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.brand, paddingTop: insets.top + Spacing.six }]}>
        <View style={styles.badge}>
          <SymbolView name="shield.fill" tintColor={colors.brand} size={36} />
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Text style={styles.title}>{t('welcome.title')}</Text>

        <Pressable
          style={[styles.button, { backgroundColor: colors.brand }]}
          onPress={() => router.push('/sign-in')}>
          <SymbolView name="envelope.fill" tintColor={colors.onBrand} size={18} />
          <Text style={[styles.buttonLabel, { color: colors.onBrand }]}>{t('welcome.email')}</Text>
        </Pressable>

        <Text style={styles.legal}>
          {t('welcome.legal')}{' '}
          <Text style={styles.legalLink}>{t('welcome.terms')}</Text> {t('welcome.and')}{' '}
          <Text style={styles.legalLink}>{t('welcome.privacy')}</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.five,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.four,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111111',
  },
  button: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  legal: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#6B7280',
  },
  legalLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});
