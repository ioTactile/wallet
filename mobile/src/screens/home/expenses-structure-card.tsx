import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Account, Record as WalletRecord } from '@wallet/shared';

import { DonutChart } from '@/components/donut-chart';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import type { DataScreenStatus } from '@/screens/accounts/accounts-view-model';
import {
  buildExpensesStructure,
  EXPENSE_STRUCTURE_FILTERS,
  EXPENSE_STRUCTURE_PERIODS,
  goBack,
  goDeeper,
  showsActiveFilter,
  type ExpenseStructureFilter,
  type ExpenseStructurePeriod,
} from '@/screens/home/expenses-structure-view-model';

const DONUT_SIZE = 220;
const UP_COLOR = Colors.light.danger;
const DOWN_COLOR = '#2E7D32';
const FILTER_COLOR = '#E65100';

type Props = {
  status: Exclude<DataScreenStatus, 'empty'>;
  records: readonly WalletRecord[];
  previousRecords: readonly WalletRecord[];
  accounts: readonly Account[];
  period: ExpenseStructurePeriod;
  filter: ExpenseStructureFilter;
  onRetry: () => void;
  onSaveConfig: (next: { period: ExpenseStructurePeriod; filter: ExpenseStructureFilter }) => void;
};

export function ExpensesStructureCard({
  status,
  records,
  previousRecords,
  accounts,
  period,
  filter,
  onRetry,
  onSaveConfig,
}: Props) {
  const { t } = useTranslation();
  const colors = Colors.light;
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState(period);
  const [draftFilter, setDraftFilter] = useState(filter);
  const [openMenu, setOpenMenu] = useState<'period' | 'filter' | null>(null);

  const vm = buildExpensesStructure({
    records,
    previousRecords,
    accounts,
    parentId,
    selectedId,
    categoryTitle: (id) => t(id, { ns: 'category' }),
  });
  const empty = status === 'content' && vm.slices.length === 0;

  function handleSlicePress(id: string) {
    setSelectedId((current) => (current === id ? (parentId === id ? id : null) : id));
  }

  function openConfig() {
    setDraftPeriod(period);
    setDraftFilter(filter);
    setOpenMenu(null);
    setConfigOpen(true);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.expensesStructure')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.configureCard')}
          onPress={openConfig}
          style={styles.menuButton}
        >
          <SymbolView name={Icons.ellipsis} size={20} tintColor="#6B7280" />
        </Pressable>
      </View>
      {showsActiveFilter(filter) ? (
        <Text style={styles.activeFilter}>
          {t('home.activeFilter', { filter: t('home.filter.withoutTransfers') })}
        </Text>
      ) : null}
      <View style={styles.summary}>
        <View>
          <Text style={styles.period}>{t(`record.period.${period}`).toUpperCase()}</Text>
          <Text style={styles.total} selectable>
            {status === 'content' ? vm.totalLabel : '—'}
          </Text>
        </View>
        <View style={styles.comparison}>
          <Text style={styles.vsLabel}>{t('home.vsPastPeriod')}</Text>
          {status === 'content' && vm.deltaPercent != null ? (
            <Text
              style={[styles.delta, { color: vm.deltaPercent > 0 ? UP_COLOR : DOWN_COLOR }]}
              selectable
            >
              {formatDelta(vm.deltaPercent)}
            </Text>
          ) : null}
        </View>
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
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={[styles.retry, { color: colors.action }]}>{t('record.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {empty ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{t('home.expensesStructureEmpty')}</Text>
        </View>
      ) : null}
      {status === 'content' && !empty ? (
        <>
          <View style={styles.chartWrap}>
            {vm.canGoBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.back')}
                onPress={() => {
                  if (parentId == null) {
                    return;
                  }
                  const next = goBack(parentId);
                  setParentId(next.parentId);
                  setSelectedId(next.selectedId);
                }}
                style={[styles.chartAction, styles.back]}
              >
                <Text style={styles.chartActionLabel}>{t('home.back')}</Text>
              </Pressable>
            ) : null}
            {vm.canGoDeeper ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.goDeeper')}
                onPress={() => {
                  if (selectedId == null) {
                    return;
                  }
                  const next = goDeeper(selectedId);
                  setParentId(next.parentId);
                  setSelectedId(next.selectedId);
                }}
                style={[styles.chartAction, styles.deeper]}
              >
                <Text style={styles.chartActionLabel}>{t('home.goDeeper')}</Text>
              </Pressable>
            ) : null}
            <DonutChart
              slices={vm.slices}
              selectedId={selectedId === parentId ? null : selectedId}
              size={DONUT_SIZE}
              onSlicePress={handleSlicePress}
            />
            <View pointerEvents="none" style={styles.center}>
              <Text style={styles.centerTitle} numberOfLines={2}>
                {vm.center.isAll
                  ? t('home.expensesStructureAll')
                  : t(vm.center.categoryId ?? '', { ns: 'category' })}
              </Text>
              <Text style={styles.centerAmount} selectable>
                {vm.center.amountLabel}
              </Text>
              {vm.center.deltaPercent != null ? (
                <Text
                  style={[
                    styles.centerDelta,
                    { color: vm.center.deltaPercent > 0 ? UP_COLOR : DOWN_COLOR },
                  ]}
                  selectable
                >
                  {formatDelta(vm.center.deltaPercent)}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.legend}>
            {vm.slices.map((slice) => (
              <Pressable
                key={slice.id}
                accessibilityRole="button"
                accessibilityLabel={slice.title}
                onPress={() => handleSlicePress(slice.id)}
                style={styles.legendItem}
              >
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text
                  style={[
                    styles.legendLabel,
                    selectedId === slice.id ? styles.legendSelected : null,
                  ]}
                  numberOfLines={1}
                >
                  {slice.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Modal
        visible={configOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfigOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('account.cancel')}
            style={StyleSheet.absoluteFill}
            onPress={() => setConfigOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('home.cardConfiguration')}</Text>
            <Text style={styles.fieldLabel}>{t('home.selectPeriod')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpenMenu((current) => (current === 'period' ? null : 'period'))}
              style={styles.field}
            >
              <Text style={styles.fieldValue}>{t(`record.period.${draftPeriod}`)}</Text>
              <SymbolView name={Icons.chevronRight} size={16} tintColor="#9CA3AF" />
            </Pressable>
            {openMenu === 'period' ? (
              <ScrollView
                style={styles.dropdown}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {EXPENSE_STRUCTURE_PERIODS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setDraftPeriod(item);
                      setOpenMenu(null);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text>{t(`record.period.${item}`)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <Text style={styles.fieldLabel}>{t('home.filter')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpenMenu((current) => (current === 'filter' ? null : 'filter'))}
              style={styles.field}
            >
              <Text style={styles.fieldValue}>{t(`home.filter.${draftFilter}`)}</Text>
              <SymbolView name={Icons.chevronRight} size={16} tintColor="#9CA3AF" />
            </Pressable>
            {openMenu === 'filter' ? (
              <View style={styles.dropdown}>
                {EXPENSE_STRUCTURE_FILTERS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setDraftFilter(item);
                      setOpenMenu(null);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text>{t(`home.filter.${item}`)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfigOpen(false)}
                style={styles.modalAction}
              >
                <Text style={[styles.modalActionLabel, { color: colors.action }]}>
                  {t('account.cancel')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setParentId(null);
                  setSelectedId(null);
                  onSaveConfig({ period: draftPeriod, filter: draftFilter });
                  setConfigOpen(false);
                }}
                style={styles.modalAction}
              >
                <Text style={[styles.modalActionLabel, { color: colors.action }]}>
                  {t('account.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilter: {
    marginTop: Spacing.one,
    color: FILTER_COLOR,
    fontSize: 13,
    fontWeight: '600',
  },
  summary: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  period: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },
  total: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  comparison: {
    alignItems: 'flex-end',
    maxWidth: '46%',
  },
  vsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  delta: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
  chartWrap: {
    marginTop: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DONUT_SIZE,
  },
  chartAction: {
    position: 'absolute',
    top: 0,
    zIndex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  back: {
    left: 0,
  },
  deeper: {
    right: 0,
  },
  chartActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.six,
  },
  centerTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerAmount: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  centerDelta: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  legend: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#4B5563',
    flexShrink: 1,
  },
  legendSelected: {
    fontWeight: '700',
    color: '#111827',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: Spacing.four,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    marginTop: -Spacing.two,
    marginBottom: Spacing.three,
    maxHeight: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  modalAction: {
    paddingVertical: Spacing.two,
  },
  modalActionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
