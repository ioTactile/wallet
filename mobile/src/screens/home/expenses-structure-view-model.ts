import {
  getCategory,
  listChildren,
  type Account,
  type Record as WalletRecord,
} from '@wallet/shared';

import { formatMoney } from '@/domain/money';

export const EXPENSE_STRUCTURE_PERIODS = [
  'today',
  'week',
  'month',
  'year',
  'days7',
  'days30',
  'weeks12',
  'months6',
  'year1',
  'years5',
] as const;

export type ExpenseStructurePeriod = (typeof EXPENSE_STRUCTURE_PERIODS)[number];

export const EXPENSE_STRUCTURE_FILTERS = ['none', 'withoutTransfers'] as const;

export type ExpenseStructureFilter = (typeof EXPENSE_STRUCTURE_FILTERS)[number];

export const DEFAULT_EXPENSE_PERIOD: ExpenseStructurePeriod = 'month';
export const DEFAULT_EXPENSE_FILTER: ExpenseStructureFilter = 'withoutTransfers';

export type ExpenseSliceVm = {
  id: string;
  title: string;
  color: string;
  amountCents: number;
  share: number;
  hasChildren: boolean;
};

export type ExpenseStructureCenterVm = {
  isAll: boolean;
  categoryId: string | null;
  amountCents: number;
  amountLabel: string;
  deltaPercent: number | null;
};

export type ExpenseStructureVm = {
  totalCents: number;
  totalLabel: string;
  deltaPercent: number | null;
  slices: ExpenseSliceVm[];
  center: ExpenseStructureCenterVm;
  canGoDeeper: boolean;
  canGoBack: boolean;
};

export function showsActiveFilter(filter: ExpenseStructureFilter): boolean {
  return filter === 'withoutTransfers';
}

export function expensePeriodRange(
  period: ExpenseStructurePeriod,
  now: Date,
): { from: string; to: string } {
  const to = endOfDay(now);
  return { from: startOfPeriod(period, now).toISOString(), to: to.toISOString() };
}

export function previousExpensePeriodRange(
  period: ExpenseStructurePeriod,
  now: Date,
): { from: string; to: string } {
  if (period === 'today') {
    const day = addDays(now, -1);
    return { from: startOfDay(day).toISOString(), to: endOfDay(day).toISOString() };
  }
  if (period === 'week') {
    const start = addDays(startOfIsoWeek(now), -7);
    const elapsed = daysBetween(startOfIsoWeek(now), startOfDay(now));
    const end = addDays(start, elapsed);
    return { from: start.toISOString(), to: endOfDay(end).toISOString() };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = clampDay(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { from: start.toISOString(), to: endOfDay(end).toISOString() };
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = clampDay(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return { from: start.toISOString(), to: endOfDay(end).toISOString() };
  }
  if (period === 'months6' || period === 'year1' || period === 'years5') {
    const currentFrom = startOfPeriod(period, now);
    const prevFrom = startOfPeriod(period, currentFrom);
    return {
      from: prevFrom.toISOString(),
      to: endOfDay(addDays(currentFrom, -1)).toISOString(),
    };
  }

  const currentFrom = startOfPeriod(period, now);
  const prevTo = endOfDay(addDays(currentFrom, -1));
  const lengthDays = daysBetween(currentFrom, startOfDay(now)) + 1;
  const prevFrom = startOfDay(addDays(prevTo, -(lengthDays - 1)));
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

export function goDeeper(selectedId: string): { parentId: string; selectedId: string } {
  return { parentId: selectedId, selectedId };
}

export function goBack(parentId: string): { parentId: null; selectedId: string } {
  return { parentId: null, selectedId: parentId };
}

export function buildExpensesStructure(input: {
  records: readonly WalletRecord[];
  previousRecords: readonly WalletRecord[];
  accounts: readonly Account[];
  parentId: string | null;
  selectedId: string | null;
  categoryTitle: (id: string) => string;
}): ExpenseStructureVm {
  const currentAmounts = amountsAtLevel(
    includedExpenses(input.records, input.accounts),
    input.parentId,
  );
  const previousAmounts = amountsAtLevel(
    includedExpenses(input.previousRecords, input.accounts),
    input.parentId,
  );
  const totalCents = sumAmounts(currentAmounts);
  const previousTotal = sumAmounts(previousAmounts);
  const slices = [...currentAmounts.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([id, amountCents], index, list) => ({
      id,
      title: input.categoryTitle(id),
      color: sliceColor(id, input.parentId, index, list.length),
      amountCents,
      share: totalCents === 0 ? 0 : amountCents / totalCents,
      hasChildren: listChildren(id).length > 0,
    }));

  const isAll = input.selectedId == null;
  const selectedIsLevel = input.selectedId != null && input.selectedId === input.parentId;
  const centerAmount =
    isAll || selectedIsLevel ? totalCents : (currentAmounts.get(input.selectedId ?? '') ?? 0);
  const centerPrevious =
    isAll || selectedIsLevel ? previousTotal : (previousAmounts.get(input.selectedId ?? '') ?? 0);

  return {
    totalCents,
    totalLabel: formatMoney(totalCents),
    deltaPercent: percentDelta(totalCents, previousTotal),
    slices,
    center: {
      isAll,
      categoryId: isAll ? null : input.selectedId,
      amountCents: centerAmount,
      amountLabel: formatMoney(centerAmount),
      deltaPercent: percentDelta(centerAmount, centerPrevious),
    },
    canGoDeeper:
      input.selectedId != null &&
      input.parentId !== input.selectedId &&
      listChildren(input.selectedId).length > 0,
    canGoBack: input.parentId != null,
  };
}

function includedExpenses(
  records: readonly WalletRecord[],
  accounts: readonly Account[],
): Extract<WalletRecord, { kind: 'expense' }>[] {
  const excluded = new Set(
    accounts.filter((account) => account.excludeFromStats).map((account) => account.id),
  );
  return records.filter(
    (record): record is Extract<WalletRecord, { kind: 'expense' }> =>
      record.kind === 'expense' && !excluded.has(record.accountId),
  );
}

function amountsAtLevel(
  records: readonly Extract<WalletRecord, { kind: 'expense' }>[],
  parentId: string | null,
): Map<string, number> {
  const amounts = new Map<string, number>();
  for (const record of records) {
    const sliceId = sliceIdFor(record.categoryId, parentId);
    if (sliceId == null) {
      continue;
    }
    amounts.set(sliceId, (amounts.get(sliceId) ?? 0) + record.amountCents);
  }
  return amounts;
}

function sliceIdFor(categoryId: string, parentId: string | null): string | null {
  const category = getCategory(categoryId);
  if (parentId == null) {
    return category?.parentId ?? category?.id ?? categoryId;
  }
  if (category == null) {
    return null;
  }
  if (category.id === parentId) {
    return parentId;
  }
  if (category.parentId === parentId) {
    return category.id;
  }
  return null;
}

function sliceColor(id: string, parentId: string | null, index: number, count: number): string {
  const base = getCategory(id)?.color ?? getCategory(parentId ?? '')?.color ?? '#757575';
  if (parentId == null || count <= 1) {
    return base;
  }
  return shadeHex(base, index, count);
}

export function shadeHex(hex: string, index: number, count: number): string {
  const value = hex.replace('#', '');
  const raw = value.length === 3 ? [...value].map((char) => char + char).join('') : value;
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  const t = count <= 1 ? 0 : index / (count - 1);
  const factor = 1 - t * 0.45;
  return `#${toHex(red * factor)}${toHex(green * factor)}${toHex(blue * factor)}`;
}

function toHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0');
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function sumAmounts(amounts: Map<string, number>): number {
  let total = 0;
  for (const amount of amounts.values()) {
    total += amount;
  }
  return total;
}

function startOfPeriod(period: ExpenseStructurePeriod, now: Date): Date {
  if (period === 'today') {
    return startOfDay(now);
  }
  if (period === 'week') {
    return startOfIsoWeek(now);
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (period === 'days7') {
    return startOfDay(addDays(now, -6));
  }
  if (period === 'days30') {
    return startOfDay(addDays(now, -29));
  }
  if (period === 'weeks12') {
    return startOfDay(addDays(now, -83));
  }
  if (period === 'months6') {
    return startOfDay(addMonths(now, -6));
  }
  if (period === 'year1') {
    return startOfDay(addMonths(now, -12));
  }
  return startOfDay(addMonths(now, -60));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfIsoWeek(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  return clampDay(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function clampDay(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
