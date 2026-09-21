import { describe, expect, it } from '@jest/globals';

import {
  makeBankAccount,
  makeCashAccount,
  makeExpenseRecord,
  makeTransferRecord,
} from '@/application/fakes';

import {
  previousExpensePeriodRange,
  expensePeriodRange,
} from '@/screens/home/expenses-structure-view-model';
import {
  balanceTrendFetchRange,
  buildBalanceTrend,
  DEFAULT_BALANCE_PERIOD,
  niceTicks,
} from '@/screens/home/balance-trend-view-model';

const NOW = new Date(2026, 8, 21, 12, 0, 0);
const CASH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BANK_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('balanceTrendFetchRange', () => {
  it('starts just after the previous period so the current balance can be walked back', () => {
    const previous = previousExpensePeriodRange('days30', NOW);
    const current = expensePeriodRange('days30', NOW);
    const range = balanceTrendFetchRange('days30', NOW);
    expect(new Date(range.from).getTime()).toBe(new Date(previous.to).getTime() + 1);
    expect(range.to).toBe(current.to);
  });

  it('defaults to the rolling 30-day window', () => {
    expect(DEFAULT_BALANCE_PERIOD).toBe('days30');
  });
});

describe('buildBalanceTrend', () => {
  const cash = makeCashAccount({ id: CASH_ID, balanceCents: 10000 });

  it('rebuilds end-of-day balances from the current total', () => {
    const records = [
      makeExpenseRecord({
        id: '11111111-1111-4111-8111-111111111111',
        accountId: CASH_ID,
        bookedAt: new Date(2026, 8, 19, 10).toISOString(),
        amountCents: 1000,
      }),
      makeExpenseRecord({
        id: '22222222-2222-4222-8222-222222222222',
        accountId: CASH_ID,
        bookedAt: new Date(2026, 8, 20, 10).toISOString(),
        amountCents: 2000,
        categoryId: 'housing.rent',
      }),
      {
        ...makeExpenseRecord({
          id: '33333333-3333-4333-8333-333333333333',
          accountId: CASH_ID,
          bookedAt: new Date(2026, 8, 20, 15).toISOString(),
          amountCents: 5000,
          categoryId: 'income.wage_invoices',
        }),
        kind: 'income' as const,
      },
    ];

    const vm = buildBalanceTrend({
      records,
      accounts: [cash],
      periodFrom: new Date(2026, 8, 19).toISOString(),
      previousTo: new Date(2026, 8, 18, 23, 59, 59, 999).toISOString(),
      now: NOW,
      filter: 'withoutTransfers',
    });

    expect(vm.currentCents).toBe(10000);
    expect(vm.points.map((point: { cents: number }) => point.cents)).toEqual([7000, 10000, 10000]);
    expect(vm.deltaPercent).toBe(25);
    expect(vm.yTicks[0]?.cents).toBe(0);
    expect(vm.yTicks.at(-1)?.cents).toBeGreaterThan(10000);
  });

  it('ignores excluded accounts and can drop transfers', () => {
    const excluded = makeBankAccount({ id: BANK_ID, excludeFromStats: true, balanceCents: 80000 });
    const records = [
      makeExpenseRecord({
        accountId: CASH_ID,
        bookedAt: new Date(2026, 8, 21, 9).toISOString(),
        amountCents: 1000,
      }),
      makeExpenseRecord({
        id: '55555555-5555-4555-8555-555555555555',
        accountId: BANK_ID,
        bookedAt: new Date(2026, 8, 21, 9).toISOString(),
        amountCents: 9000,
        categoryId: 'housing.rent',
      }),
      makeTransferRecord({
        fromAccountId: CASH_ID,
        toAccountId: BANK_ID,
        amountCents: 4000,
        bookedAt: new Date(2026, 8, 21, 8).toISOString(),
      }),
    ];

    const without = buildBalanceTrend({
      records,
      accounts: [cash, excluded],
      periodFrom: new Date(2026, 8, 21).toISOString(),
      previousTo: new Date(2026, 8, 20, 23, 59, 59, 999).toISOString(),
      now: NOW,
      filter: 'withoutTransfers',
    });
    expect(without.currentCents).toBe(10000);
    expect(without.points).toHaveLength(1);
    expect(without.points[0]?.cents).toBe(10000);

    const withTransfers = buildBalanceTrend({
      records,
      accounts: [cash, excluded],
      periodFrom: new Date(2026, 8, 21).toISOString(),
      previousTo: new Date(2026, 8, 20, 23, 59, 59, 999).toISOString(),
      now: NOW,
      filter: 'none',
    });
    expect(withTransfers.points[0]?.cents).toBe(10000);
    expect(withTransfers.deltaPercent).not.toBe(without.deltaPercent);
  });
});

describe('niceTicks', () => {
  it('keeps an extra step above the max so the curve does not sit on the top axis', () => {
    const ticks = niceTicks(0, 90000);
    expect(ticks[0]?.cents).toBe(0);
    expect(ticks.at(-1)?.cents).toBeGreaterThan(90000);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    const step = (ticks[1]?.cents ?? 0) - (ticks[0]?.cents ?? 0);
    expect(
      ticks.every(
        (tick: { cents: number }, index: number) =>
          index === 0 || tick.cents - (ticks[index - 1]?.cents ?? 0) === step,
      ),
    ).toBe(true);
  });

  it('adds a full step when the max already lands on a nice number', () => {
    const ticks = niceTicks(0, 120000);
    expect(ticks.at(-1)?.cents).toBeGreaterThan(120000);
  });
});
