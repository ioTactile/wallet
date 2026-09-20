import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';

export function ConnectBankScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = Colors.light;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('account.bankStubTitle')}
        leftIcon="chevronLeft"
        onLeftPress={() => router.back()}
      />
      <View style={styles.body}>
        <Text style={styles.message} selectable>
          {t('account.bankStubMessage')}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.brand }]}
        >
          <Text style={[styles.backLabel, { color: colors.onBrand }]}>
            {t('account.bankStubBack')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  back: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
});
