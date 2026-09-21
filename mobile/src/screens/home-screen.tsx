import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { HomeMenuSidebar } from '@/components/home-menu-sidebar';
import { Spacing } from '@/constants/theme';
import { dataScreenStatus, homeAccountGridItems } from '@/screens/accounts/accounts-view-model';
import { useAccountList } from '@/screens/accounts/use-account-queries';
import { BalanceTrendCard } from '@/screens/home/balance-trend-card';
import {
  balanceTrendFetchRange,
  DEFAULT_BALANCE_PERIOD,
} from '@/screens/home/balance-trend-view-model';
import { ExpensesStructureCard } from '@/screens/home/expenses-structure-card';
import {
  DEFAULT_EXPENSE_FILTER,
  DEFAULT_EXPENSE_PERIOD,
  expensePeriodRange,
  previousExpensePeriodRange,
  type ExpenseStructureFilter,
  type ExpenseStructurePeriod,
} from '@/screens/home/expenses-structure-view-model';
import { HomeAccountsCard } from '@/screens/home/home-accounts-card';
import { LastRecordsCard } from '@/screens/home/last-records-card';
import { recordDetailHref, recordsListHref } from '@/screens/records/records-navigation';
import { lastRecordsPreview, lastThirtyDaysRange } from '@/screens/records/records-view-model';
import { useRecordList } from '@/screens/records/use-record-queries';

const GRID_GAP = Spacing.two;
const CARD_PADDING = Spacing.three;

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expensePeriod, setExpensePeriod] =
    useState<ExpenseStructurePeriod>(DEFAULT_EXPENSE_PERIOD);
  const [expenseFilter, setExpenseFilter] =
    useState<ExpenseStructureFilter>(DEFAULT_EXPENSE_FILTER);
  const [balancePeriod, setBalancePeriod] =
    useState<ExpenseStructurePeriod>(DEFAULT_BALANCE_PERIOD);
  const [balanceFilter, setBalanceFilter] =
    useState<ExpenseStructureFilter>(DEFAULT_EXPENSE_FILTER);
  const query = useAccountList();
  const now = useMemo(() => new Date(), []);
  const range = useMemo(() => lastThirtyDaysRange(now), [now]);
  const recordsQuery = useRecordList(range);
  const expensesRange = useMemo(() => expensePeriodRange(expensePeriod, now), [expensePeriod, now]);
  const previousRange = useMemo(
    () => previousExpensePeriodRange(expensePeriod, now),
    [expensePeriod, now],
  );
  const expensesQuery = useRecordList(expensesRange);
  const previousExpensesQuery = useRecordList(previousRange);
  const balanceRange = useMemo(
    () => balanceTrendFetchRange(balancePeriod, now),
    [balancePeriod, now],
  );
  const balancePeriodRange = useMemo(
    () => expensePeriodRange(balancePeriod, now),
    [balancePeriod, now],
  );
  const previousBalanceRange = useMemo(
    () => previousExpensePeriodRange(balancePeriod, now),
    [balancePeriod, now],
  );
  const balanceQuery = useRecordList(balanceRange);
  const status = dataScreenStatus({ data: query.data, error: query.error });
  const recordsStatus = dataScreenStatus({
    data: recordsQuery.data?.records,
    error: recordsQuery.error,
  });
  const expensesStatus =
    expensesQuery.data === undefined ? (expensesQuery.error ? 'error' : 'loading') : 'content';
  const balanceStatus =
    balanceQuery.data === undefined || query.data === undefined
      ? balanceQuery.error || query.error
        ? 'error'
        : 'loading'
      : 'content';
  const items = homeAccountGridItems(query.data ?? []);
  const lastRows = lastRecordsPreview(recordsQuery.data?.records ?? [], query.data ?? [], (id) =>
    t(id, { ns: 'category' }),
  );
  const cardWidth = (width - Spacing.four * 2 - CARD_PADDING * 2 - GRID_GAP) / 2;

  return (
    <View style={styles.root}>
      <BrandHeader
        title={t('home.title')}
        leftIcon="menu"
        rightIcon="bell"
        onLeftPress={() => setMenuOpen(true)}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.section}
      >
        <HomeAccountsCard
          status={status}
          items={items}
          cardWidth={cardWidth}
          onOpenAccounts={() => router.push('/accounts')}
          onRetry={() => query.refetch()}
          onAddAccount={() => router.push('/accounts/new')}
          onAccountPress={(id) => router.push(`/accounts/${id}`)}
          onOpenRecords={() => router.push(recordsListHref())}
        />
        <ExpensesStructureCard
          key={`${expensePeriod}:${expenseFilter}`}
          status={expensesStatus}
          records={expensesQuery.data?.records ?? []}
          previousRecords={previousExpensesQuery.data?.records ?? []}
          accounts={query.data ?? []}
          period={expensePeriod}
          filter={expenseFilter}
          onRetry={() => expensesQuery.refetch()}
          onSaveConfig={({ period, filter }) => {
            setExpensePeriod(period);
            setExpenseFilter(filter);
          }}
        />
        <LastRecordsCard
          status={recordsStatus}
          rows={lastRows}
          locale={i18n.language}
          onRetry={() => recordsQuery.refetch()}
          onShowMore={() => router.push(recordsListHref())}
          onRecordPress={(id) => router.push(recordDetailHref(id))}
        />
        <BalanceTrendCard
          key={`${balancePeriod}:${balanceFilter}`}
          status={balanceStatus}
          records={balanceQuery.data?.records ?? []}
          accounts={query.data ?? []}
          period={balancePeriod}
          periodFrom={balancePeriodRange.from}
          previousTo={previousBalanceRange.to}
          now={now}
          filter={balanceFilter}
          locale={i18n.language}
          onRetry={() => balanceQuery.refetch()}
          onSaveConfig={({ period, filter }) => {
            setBalancePeriod(period);
            setBalanceFilter(filter);
          }}
        />
      </ScrollView>
      <HomeMenuSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  section: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
