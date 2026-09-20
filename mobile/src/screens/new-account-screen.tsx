import { Host, List, ListItem } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors, Spacing } from '@/constants/theme';

export function NewAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = Colors.light;

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('account.newTitle')}
        leftIcon="chevronLeft"
        onLeftPress={() => router.back()}
      />
      <Text style={styles.section}>{t('account.chooseKind')}</Text>
      <Host matchContents style={styles.host}>
        <List>
          <ListItem
            supportingText={t('account.newCashHint')}
            onPress={() => router.push('/accounts/new-cash')}
          >
            {t('account.newCash')}
          </ListItem>
          <ListItem
            supportingText={t('account.newBankHint')}
            onPress={() => router.push('/accounts/connect-bank')}
          >
            {t('account.newBank')}
          </ListItem>
        </List>
      </Host>
      <Pressable onPress={() => router.back()} style={styles.cancel}>
        <Text style={[styles.cancelLabel, { color: colors.action }]}>{t('account.cancel')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  host: {
    marginHorizontal: Spacing.three,
  },
  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    color: '#6B7280',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  cancel: {
    alignItems: 'center',
    padding: Spacing.four,
  },
  cancelLabel: {
    fontSize: 16,
  },
});
