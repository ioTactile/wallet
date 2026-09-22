import { Host, List, ListItem } from '@expo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { Colors } from '@/constants/theme';
import { useAccountList } from '@/screens/accounts/use-account-queries';
import { recordDetailHref } from '@/screens/records/records-navigation';
import { destinationAccounts } from '@/screens/records/records-view-model';

export function SelectAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    recordId,
    excludeAccountId,
    selectedId,
    field,
    from: fromParam,
  } = useLocalSearchParams<{
    recordId?: string;
    excludeAccountId?: string;
    selectedId?: string;
    field?: string;
    from?: string;
  }>();
  const query = useAccountList();
  const accounts = destinationAccounts(query.data ?? [], excludeAccountId ?? '');
  const colors = Colors.light;
  const paramName = field === 'fromAccountId' ? 'fromAccountId' : 'toAccountId';
  const from = typeof fromParam === 'string' ? fromParam : undefined;

  function select(id: string) {
    if (!recordId) {
      router.dismiss();
      return;
    }
    router.dismissTo(
      paramName === 'fromAccountId'
        ? recordDetailHref(recordId, { fromAccountId: id, from })
        : recordDetailHref(recordId, { toAccountId: id, from }),
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('record.selectAccount')}
        leftIcon="chevronLeft"
        onLeftPress={() => router.dismiss()}
      />
      <Host matchContents>
        <List>
          {accounts.map((account) => (
            <ListItem
              key={account.id}
              onPress={() => select(account.id)}
              leading={<View style={[styles.dot, { backgroundColor: account.color }]} />}
            >
              {account.name}
              {selectedId === account.id ? ' ✓' : ''}
            </ListItem>
          ))}
        </List>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dot: { width: 28, height: 28, borderRadius: 14 },
});
