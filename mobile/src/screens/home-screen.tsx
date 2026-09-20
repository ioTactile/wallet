import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountRow } from '@/components/account-row';
import { BrandHeader } from '@/components/brand-header';
import { HomeMenuSidebar } from '@/components/home-menu-sidebar';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import { dataScreenStatus, toAccountRow } from '@/screens/accounts/accounts-view-model';
import { useAccountList } from '@/screens/accounts/use-account-queries';

export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const colors = Colors.light;
  const query = useAccountList();
  const status = dataScreenStatus({ data: query.data, error: query.error });
  const rows = (query.data ?? []).map(toAccountRow);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrandHeader
        title={t('home.title')}
        leftIcon="menu"
        rightIcon="bell"
        onLeftPress={() => setMenuOpen(true)}
      />
      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('account.listTitle')}
          onPress={() => router.push('/accounts')}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>{t('home.accounts')}</Text>
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
            <Pressable onPress={() => query.refetch()}>
              <Text style={[styles.retry, { color: colors.action }]}>{t('account.retry')}</Text>
            </Pressable>
          </View>
        ) : null}
        {status === 'content'
          ? rows.map((row) => (
              <AccountRow
                key={row.id}
                row={row}
                onPress={() => router.push(`/accounts/${row.id}`)}
              />
            ))
          : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/accounts/new')}
          style={styles.addCard}
        >
          <Text style={styles.addLabel}>{t('home.addAccount')}</Text>
          <Text style={styles.addPlus}>+</Text>
        </Pressable>
        <Pressable style={styles.records}>
          <SymbolView name={Icons.list} size={18} tintColor="#111827" />
          <Text style={styles.recordsLabel}>{t('home.records')}</Text>
        </Pressable>
      </View>
      <HomeMenuSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  addCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderCurve: 'continuous',
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  addLabel: {
    color: '#6B7280',
  },
  addPlus: {
    fontSize: 22,
    color: '#9CA3AF',
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
