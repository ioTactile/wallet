import {
  signedAmountForSelection,
  type Account,
  type Record as WalletRecord,
} from '@wallet/shared';

import { formatMoney } from '@/domain/money';

import {
  expensePeriodRange,
  previousExpensePeriodRange,
  type ExpenseStructureFilter,
  type ExpenseStructurePeriod,
} from '@/screens/home/expenses-structure-view-model';

export const DEFAULT_BALANCE_PERIOD: ExpenseStructurePeriod = 'days30';

const MAX_POINTS = 90;

export type BalanceTrendPoint = {
  at: string;
  cents: number;
};

export type BalanceTrendVm = {
  currentCents: number;
  currentLabel: string;
  deltaPercent: number | null;
  points: BalanceTrendPoint[];
  yTicks: { cents: number }[];
};

export function balanceTrendFetchRange(
  period: ExpenseStructurePeriod,
  now: Date,
): { from: string; to: string } {
  const previous = previousExpensePeriodRange(period, now);
  const current = expensePeriodRange(period, now);
  return {
    from: new Date(new Date(previous.to).getTime() + 1).toISOString(),
    to: current.to,
  };
}

export function buildBalanceTrend(input: {
  records: readonly WalletRecord[];
  accounts: readonly Account[];
  periodFrom: string;
  previousTo: string;
  now: Date;
  filter: ExpenseStructureFilter;
}): BalanceTrendVm {
  const includedIds = input.accounts
    .filter((account) => !account.excludeFromStats && account.archivedAt == null)
    .map((account) => account.id);
  const currentCents = input.accounts
    .filter((account) => includedIds.includes(account.id))
    .reduce((sum, account) => sum + account.balanceCents, 0);
  const deltas = input.records.map((record) => ({
    bookedAt: record.bookedAt,
    cents: recordDelta(record, includedIds, input.filter),
  }));

  const days = eachDay(new Date(input.periodFrom), input.now);
  const sampled = sampleDays(days, MAX_POINTS);
  const points = sampled.map((day) => {
    const end = endOfDay(day).toISOString();
    const after = deltas
      .filter((delta) => delta.bookedAt > end)
      .reduce((sum, delta) => sum + delta.cents, 0);
    return { at: end, cents: currentCents - after };
  });

  const afterPrevious = deltas
    .filter((delta) => delta.bookedAt > input.previousTo)
    .reduce((sum, delta) => sum + delta.cents, 0);
  const previousEnd = currentCents - afterPrevious;
  const minCents = points.reduce((min, point) => Math.min(min, point.cents), currentCents);
  const maxCents = points.reduce((max, point) => Math.max(max, point.cents), currentCents);

  return {
    currentCents,
    currentLabel: formatMoney(currentCents),
    deltaPercent: percentDelta(currentCents, previousEnd),
    points,
    yTicks: niceTicks(minCents, maxCents),
  };
}

function recordDelta(
  record: WalletRecord,
  accountIds: string[],
  filter: ExpenseStructureFilter,
): number {
  if (filter === 'withoutTransfers' && record.kind === 'transfer') {
    return 0;
  }
  if (accountIds.length === 0) {
    return 0;
  }
  return signedAmountForSelection(record, accountIds);
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function eachDay(from: Date, now: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(from);
  const last = startOfDay(now);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function sampleDays(days: Date[], max: number): Date[] {
  if (days.length <= max) {
    return days;
  }
  const sampled: Date[] = [];
  for (let index = 0; index < max; index += 1) {
    const at = Math.round((index * (days.length - 1)) / (max - 1));
    const day = days[at];
    if (day && sampled.at(-1)?.getTime() !== day.getTime()) {
      sampled.push(day);
    }
  }
  return sampled;
}

export function niceTicks(minCents: number, maxCents: number): { cents: number }[] {
  const minEuros = Math.min(0, minCents) / 100;
  const maxEuros = Math.max(minCents, maxCents) / 100;
  const hi = maxEuros === minEuros ? maxEuros + 1 : maxEuros;
  const lo = minCents >= 0 ? 0 : minEuros;
  const range = hi - lo || 1;
  const rough = range / 3;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / mag;
  const step = residual >= 5 ? 5 * mag : residual >= 3 ? 3 * mag : residual >= 2 ? 2 * mag : mag;
  const start = Math.floor(lo / step) * step;
  let end = Math.ceil(hi / step) * step;
  if (end <= hi) {
    end += step;
  }
  const ticks: { cents: number }[] = [];
  for (let value = start; value <= end + step / 4; value += step) {
    ticks.push({ cents: Math.round(value * 100) });
  }
  return ticks;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
