import { Host, List, ListItem } from '@expo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { NativeSwitch } from '@/components/native-switch';
import { Colors } from '@/constants/theme';
import { useAccountList } from '@/screens/accounts/use-account-queries';

export function SelectAccountsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { accountIds: initial } = useLocalSearchParams<{ accountIds?: string }>();
  const query = useAccountList();
  const accounts = query.data ?? [];
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial?.split(',').filter(Boolean) ?? []),
  );
  const allSelected = selected.size === 0;
  const colors = Colors.light;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function confirm() {
    const accountIds = allSelected ? undefined : [...selected].join(',');
    router.navigate({
      pathname: '/records',
      params: accountIds ? { accountIds } : {},
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('record.selectAccounts')}
        leftIcon="chevronLeft"
        rightIcon="checkmark"
        onLeftPress={() => router.back()}
        onRightPress={confirm}
      />
      <Host matchContents>
        <List>
          <ListItem
            trailing={
              <NativeSwitch
                value={allSelected}
                onValueChange={(value) => {
                  if (value) {
                    setSelected(new Set());
                  }
                }}
              />
            }
          >
            {t('record.allAccounts')}
          </ListItem>
          {accounts.map((account) => (
            <ListItem
              key={account.id}
              leading={<View style={[styles.dot, { backgroundColor: account.color }]} />}
              trailing={
                <NativeSwitch
                  value={!allSelected && selected.has(account.id)}
                  onValueChange={() => {
                    if (allSelected) {
                      setSelected(new Set([account.id]));
                      return;
                    }
                    toggle(account.id);
                  }}
                />
              }
            >
              {account.name}
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
