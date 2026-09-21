import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountCard, AddAccountCard } from '@/components/account-card';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import type { DataScreenStatus, HomeAccountGridItem } from '@/screens/accounts/accounts-view-model';

type Props = {
  status: DataScreenStatus;
  items: HomeAccountGridItem[];
  cardWidth: number;
  onOpenAccounts: () => void;
  onRetry: () => void;
  onAddAccount: () => void;
  onAccountPress: (id: string) => void;
  onOpenRecords: () => void;
};

export function HomeAccountsCard({
  status,
  items,
  cardWidth,
  onOpenAccounts,
  onRetry,
  onAddAccount,
  onAccountPress,
  onOpenRecords,
}: Props) {
  const { t } = useTranslation();
  const colors = Colors.light;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.listTitle')}
        onPress={onOpenAccounts}
        style={styles.header}
      >
        <Text style={styles.title}>{t('home.accounts')}</Text>
        <SymbolView name={Icons.chevronRight} size={16} tintColor="#9CA3AF" />
      </Pressable>
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
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={[styles.retry, { color: colors.action }]}>{t('account.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'empty' || status === 'content' ? (
        <View style={styles.grid}>
          {items.map((item) =>
            item.type === 'add' ? (
              <AddAccountCard
                key="add"
                width={cardWidth}
                label={t('home.addAccount')}
                onPress={onAddAccount}
              />
            ) : (
              <AccountCard
                key={item.row.id}
                row={item.row}
                width={cardWidth}
                onPress={() => onAccountPress(item.row.id)}
              />
            ),
          )}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.records')}
        onPress={onOpenRecords}
        style={styles.records}
      >
        <SymbolView name={Icons.list} size={18} tintColor="#111827" />
        <Text style={styles.recordsLabel}>{t('home.records')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.three,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  state: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  stateText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  retry: {
    fontWeight: '600',
  },
  records: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  recordsLabel: {
    fontSize: 14,
  },
});
