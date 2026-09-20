import { Host, List, ListItem } from '@expo/ui';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/brand-header';
import { NativeSwitch } from '@/components/native-switch';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import { dataScreenStatus, toAccountRow } from '@/screens/accounts/accounts-view-model';
import { useAccountList } from '@/screens/accounts/use-account-queries';

export function AccountsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.light;
  const [includeArchived, setIncludeArchived] = useState(false);
  const query = useAccountList(includeArchived);
  const status = dataScreenStatus({ data: query.data, error: query.error });
  const rows = (query.data ?? []).map(toAccountRow);

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('account.listTitle')}
        leftIcon="chevronLeft"
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('account.showArchived')}</Text>
          <NativeSwitch value={includeArchived} onValueChange={setIncludeArchived} />
        </View>
        {status === 'loading' ? (
          <View style={styles.state}>
            <ActivityIndicator />
            <Text style={styles.stateText}>{t('account.loading')}</Text>
          </View>
        ) : null}
        {status === 'error' ? (
          <View style={styles.state}>
            <Text style={[styles.stateText, { color: colors.danger }]} selectable>
              {t('account.error')}
            </Text>
            <Pressable onPress={() => query.refetch()}>
              <Text style={[styles.retry, { color: colors.action }]}>{t('account.retry')}</Text>
            </Pressable>
          </View>
        ) : null}
        {status === 'empty' ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{t('account.empty')}</Text>
            <Pressable onPress={() => router.push('/accounts/new')}>
              <Text style={[styles.retry, { color: colors.action }]}>{t('account.add')}</Text>
            </Pressable>
          </View>
        ) : null}
        {status === 'content' ? (
          <Host matchContents>
            <List>
              {rows.map((row) => (
                <ListItem
                  key={row.id}
                  leading={<View style={[styles.swatch, { backgroundColor: row.color }]} />}
                  trailing={
                    <Text style={styles.balance} selectable>
                      {row.balanceLabel}
                    </Text>
                  }
                  supportingText={
                    row.subtitle ?? (row.archived ? t('account.archived') : undefined)
                  }
                  onPress={() => router.push(`/accounts/${row.id}`)}
                >
                  {row.name}
                </ListItem>
              ))}
            </List>
          </Host>
        ) : null}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.add')}
        onPress={() => router.push('/accounts/new')}
        style={[
          styles.fab,
          {
            backgroundColor: colors.brand,
            bottom: insets.bottom + Spacing.four,
          },
        ]}
      >
        <SymbolView name={Icons.plus} tintColor={colors.onBrand} size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginBottom: Spacing.two,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
  },
  state: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  stateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retry: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  balance: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
