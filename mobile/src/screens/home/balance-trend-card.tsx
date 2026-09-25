import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { Account, Record as WalletRecord } from '@wallet/shared';

import { AreaChart } from '@/components/area-chart';
import { Icons } from '@/constants/icons';
import { Colors, Spacing } from '@/constants/theme';
import { formatCompactMoney } from '@/domain/money';
import type { DataScreenStatus } from '@/screens/accounts/accounts-view-model';
import { buildBalanceTrend } from '@/screens/home/balance-trend-view-model';
import {
  showsActiveFilter,
  type ExpenseStructureFilter,
  type ExpenseStructurePeriod,
} from '@/screens/home/expenses-structure-view-model';
import { HomeCardConfigModal } from '@/screens/home/home-card-config-modal';

const UP_COLOR = '#2E7D32';
const DOWN_COLOR = Colors.light.danger;
const FILTER_COLOR = '#E65100';

type Props = {
  status: Exclude<DataScreenStatus, 'empty'>;
  records: readonly WalletRecord[];
  accounts: readonly Account[];
  period: ExpenseStructurePeriod;
  periodFrom: string;
  previousTo: string;
  now: Date;
  filter: ExpenseStructureFilter;
  locale: string;
  onRetry: () => void;
  onSaveConfig: (next: { period: ExpenseStructurePeriod; filter: ExpenseStructureFilter }) => void;
};

export function BalanceTrendCard({
  status,
  records,
  accounts,
  period,
  periodFrom,
  previousTo,
  now,
  filter,
  locale,
  onRetry,
  onSaveConfig,
}: Props) {
  const { t } = useTranslation();
  const colors = Colors.light;
  const { width } = useWindowDimensions();
  const [configOpen, setConfigOpen] = useState(false);
  const vm = buildBalanceTrend({
    records,
    accounts,
    periodFrom,
    previousTo,
    now,
    filter,
  });
  const empty = status === 'content' && vm.points.length === 0;
  const chartWidth = Math.max(width - Spacing.four * 2 - Spacing.three * 2, 200);
  const yMin = vm.yTicks[0]?.cents ?? 0;
  const yMax = vm.yTicks.at(-1)?.cents ?? 0;
  const yLabels = [...vm.yTicks].reverse().map((tick) => formatCompactMoney(tick.cents, locale));
  const xLabels = xTickLabels(vm.points, locale, now, t('record.period.today'));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.balanceTrend')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.configureCard')}
          onPress={() => setConfigOpen(true)}
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
            {status === 'content' ? vm.currentLabel : '—'}
          </Text>
        </View>
        <View style={styles.comparison}>
          <Text style={styles.vsLabel}>{t('home.vsPastPeriod')}</Text>
          {status === 'content' && vm.deltaPercent != null ? (
            <Text
              style={[styles.delta, { color: vm.deltaPercent >= 0 ? UP_COLOR : DOWN_COLOR }]}
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
          <Text style={styles.stateText}>{t('home.balanceTrendEmpty')}</Text>
        </View>
      ) : null}
      {status === 'content' && !empty ? (
        <View style={styles.chart}>
          <AreaChart
            values={vm.points.map((point) => point.cents)}
            yMin={yMin}
            yMax={yMax}
            yLabels={yLabels}
            xLabels={xLabels}
            width={chartWidth}
          />
        </View>
      ) : null}

      <HomeCardConfigModal
        visible={configOpen}
        period={period}
        filter={filter}
        onDismiss={() => setConfigOpen(false)}
        onSave={(next) => {
          onSaveConfig(next);
          setConfigOpen(false);
        }}
      />
    </View>
  );
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

function xTickLabels(
  points: readonly { at: string }[],
  locale: string,
  now: Date,
  todayLabel: string,
): string[] {
  if (points.length === 0) {
    return [];
  }
  const last = points.length - 1;
  const indexes = last === 0 ? [0] : [0, Math.round(last / 3), Math.round((2 * last) / 3), last];
  const unique = [...new Set(indexes)];
  return unique.map((index) => {
    const at = new Date(points[index]?.at ?? now.toISOString());
    if (sameDay(at, now)) {
      return todayLabel;
    }
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(at);
  });
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
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
  chart: {
    marginTop: Spacing.two,
  },
});
