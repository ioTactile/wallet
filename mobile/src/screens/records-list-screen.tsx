import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/brand-header';
import { RecordCategoryMark } from '@/components/record-category-mark';
import { RecordSwipeRow } from '@/components/record-swipe-row';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import { formatMoney } from '@/domain/money';
import { dataScreenStatus } from '@/screens/accounts/accounts-view-model';
import { useAccountList } from '@/screens/accounts/use-account-queries';
import {
  categoryConfirmationUpdate,
  groupRecordsByWeek,
  periodRange,
  type RecordPeriod,
} from '@/screens/records/records-view-model';
import { recordDetailHref } from '@/screens/records/records-navigation';
import { useRecordList, useUpdateRecord } from '@/screens/records/use-record-queries';

const PERIODS: RecordPeriod[] = ['today', 'week', 'month', 'year'];

export function RecordsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.light;
  const { accountIds: accountIdsParam } = useLocalSearchParams<{ accountIds?: string }>();
  const [period, setPeriod] = useState<RecordPeriod>('month');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const accountIds = useMemo(() => {
    if (!accountIdsParam || accountIdsParam.length === 0) {
      return undefined;
    }
    return accountIdsParam.split(',').filter((id) => id.length > 0);
  }, [accountIdsParam]);
  const range = useMemo(() => periodRange(period, new Date()), [period]);
  const accountsQuery = useAccountList();
  const query = useRecordList({ ...range, accountIds });
  const update = useUpdateRecord();
  const status = dataScreenStatus({ data: query.data?.records, error: query.error });
  const accounts = accountsQuery.data ?? [];
  const sections = query.data
    ? groupRecordsByWeek(query.data, accounts, accountIds, (id) => t(id, { ns: 'category' }))
    : [];

  return (
    <View style={[styles.root, { backgroundColor: '#F5F5F5' }]}>
      <BrandHeader
        title={t('record.listTitle')}
        leftIcon="chevronLeft"
        onLeftPress={() => router.back()}
      />
      <View style={styles.summary}>
        <Text style={styles.periodLabel}>{t(`record.period.${period}`).toUpperCase()}</Text>
        <Text style={styles.periodTotal} selectable>
          {query.data ? formatMoney(query.data.periodNetCents) : '—'}
        </Text>
      </View>
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text style={styles.stateText}>{t('record.loading')}</Text>
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.state}>
          <Text style={[styles.stateText, { color: colors.danger }]} selectable>
            {t('record.error')}
          </Text>
          <Pressable onPress={() => query.refetch()}>
            <Text style={[styles.retry, { color: colors.action }]}>{t('record.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'empty' || status === 'content' ? (
        <SectionList
          sections={sections.map((section) => ({ ...section, data: section.rows }))}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
          ListEmptyComponent={
            <View style={styles.state}>
              <Text style={styles.stateText}>{t('record.empty')}</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.weekHeader}>
              <View>
                <Text style={styles.weekTitle}>{t('record.week', { week: section.week })}</Text>
                <Text style={styles.weekOpening}>{section.openingLabel}</Text>
              </View>
              <Text style={styles.weekNet}>{section.netLabel}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <RecordSwipeRow
              enabled={item.canConfirm}
              confirmed={item.confirmed}
              busy={update.isPending && update.variables?.id === item.id}
              confirmLabel={t('record.confirm')}
              unconfirmLabel={t('record.unconfirm')}
              onPress={() => router.push(recordDetailHref(item.id))}
              onToggle={() => {
                if (!item.canConfirm || (update.isPending && update.variables?.id === item.id)) {
                  return;
                }
                update.mutate({
                  id: item.id,
                  body: categoryConfirmationUpdate(item.confirmed),
                });
              }}
            >
              <View style={styles.row}>
                <RecordCategoryMark color={item.color} confirmed={item.confirmed} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  {item.note ? (
                    <Text style={styles.rowNote} numberOfLines={1}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowAmount}>
                  <Text
                    style={[
                      styles.amount,
                      { color: item.amountCents < 0 ? colors.danger : '#2E7D32' },
                    ]}
                    selectable
                  >
                    {item.amountLabel}
                  </Text>
                  {item.uncleared ? (
                    <Text style={styles.badge}>{t('record.uncleared')}</Text>
                  ) : null}
                </View>
              </View>
            </RecordSwipeRow>
          )}
        />
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Pressable
          onPress={() =>
            router.push(
              accountIds
                ? `/records/select-accounts?accountIds=${accountIds.join(',')}`
                : '/records/select-accounts',
            )
          }
          style={styles.filterDot}
        />
        <Pressable onPress={() => setPeriodOpen((open) => !open)} style={styles.periodButton}>
          <Text style={styles.periodButtonLabel}>{t(`record.period.${period}`)}</Text>
        </Pressable>
      </View>
      {periodOpen ? (
        <View style={[styles.periodMenu, { bottom: insets.bottom + 72 }]}>
          {PERIODS.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setPeriod(item);
                setPeriodOpen(false);
              }}
              style={styles.periodOption}
            >
              <Text>{t(`record.period.${item}`)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {fabOpen ? (
        <View style={[styles.fabActions, { bottom: insets.bottom + 88 }]}>
          <Pressable
            style={styles.fabAction}
            onPress={() => {
              setFabOpen(false);
              router.push('/records/new?kind=transfer');
            }}
          >
            <Text style={styles.fabActionLabel}>{t('record.newTransfer')}</Text>
          </Pressable>
          <Pressable
            style={styles.fabAction}
            onPress={() => {
              setFabOpen(false);
              router.push('/records/new?kind=expense');
            }}
          >
            <Text style={styles.fabActionLabel}>{t('record.new')}</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('record.new')}
        onPress={() => setFabOpen((open) => !open)}
        style={[
          styles.fab,
          { backgroundColor: colors.action, bottom: insets.bottom + Spacing.four },
        ]}
      >
        <SymbolView
          name={fabOpen ? Icons.close : Icons.plus}
          tintColor={colors.onBrand}
          size={22}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.light.brand,
  },
  periodLabel: { color: Colors.light.onBrand, fontWeight: '700', fontSize: 12 },
  periodTotal: { color: Colors.light.onBrand, fontWeight: '700', fontVariant: ['tabular-nums'] },
  state: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  stateText: { color: '#6B7280', textAlign: 'center' },
  retry: { fontWeight: '600' },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#EEEEEE',
  },
  weekTitle: { fontWeight: '700', fontSize: 12 },
  weekOpening: { color: '#6B7280', fontSize: 12 },
  weekNet: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '600' },
  rowSubtitle: { color: '#6B7280', fontSize: 13 },
  rowNote: { color: '#9CA3AF', fontSize: 12 },
  rowAmount: { alignItems: 'flex-end', gap: 4 },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  badge: {
    fontSize: 11,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
    alignItems: 'center',
  },
  periodButton: {
    backgroundColor: Colors.light.action,
    borderRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  periodButtonLabel: { color: Colors.light.onBrand, fontWeight: '600' },
  periodMenu: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: Spacing.two,
    minWidth: 180,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  },
  periodOption: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.action,
    marginBottom: Spacing.two,
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
  fabActions: {
    position: 'absolute',
    right: Spacing.four,
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  fabAction: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  fabActionLabel: { color: Colors.light.action, fontWeight: '600' },
});
