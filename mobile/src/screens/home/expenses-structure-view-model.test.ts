import { describe, expect, it } from '@jest/globals';
import { getCategory } from '@wallet/shared';

import {
  makeBankAccount,
  makeCashAccount,
  makeExpenseRecord,
  makeTransferRecord,
} from '@/application/fakes';

import {
  buildExpensesStructure,
  expensePeriodRange,
  goBack,
  goDeeper,
  previousExpensePeriodRange,
  showsActiveFilter,
} from '@/screens/home/expenses-structure-view-model';

const NOW = new Date(2026, 8, 21, 12, 0, 0);
const CASH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BANK_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function endOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function titles(id: string): string {
  return id;
}

describe('expense period ranges', () => {
  it('uses local calendar bounds to date for today, week, month and year', () => {
    expect(expensePeriodRange('today', NOW)).toEqual({
      from: new Date(2026, 8, 21).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('week', NOW)).toEqual({
      from: new Date(2026, 8, 21).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('month', NOW)).toEqual({
      from: new Date(2026, 8, 1).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('year', NOW)).toEqual({
      from: new Date(2026, 0, 1).toISOString(),
      to: endOf(NOW).toISOString(),
    });
  });

  it('uses inclusive rolling windows for relative periods', () => {
    expect(expensePeriodRange('days7', NOW)).toEqual({
      from: new Date(2026, 8, 15).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('days30', NOW)).toEqual({
      from: new Date(2026, 7, 23).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('weeks12', NOW)).toEqual({
      from: new Date(2026, 5, 30).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('months6', NOW)).toEqual({
      from: new Date(2026, 2, 21).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('year1', NOW)).toEqual({
      from: new Date(2025, 8, 21).toISOString(),
      to: endOf(NOW).toISOString(),
    });
    expect(expensePeriodRange('years5', NOW)).toEqual({
      from: new Date(2021, 8, 21).toISOString(),
      to: endOf(NOW).toISOString(),
    });
  });

  it('compares calendar periods to the same elapsed days in the previous period', () => {
    expect(previousExpensePeriodRange('today', NOW)).toEqual({
      from: new Date(2026, 8, 20).toISOString(),
      to: endOf(new Date(2026, 8, 20)).toISOString(),
    });
    expect(previousExpensePeriodRange('week', NOW)).toEqual({
      from: new Date(2026, 8, 14).toISOString(),
      to: endOf(new Date(2026, 8, 14)).toISOString(),
    });
    expect(previousExpensePeriodRange('month', NOW)).toEqual({
      from: new Date(2026, 7, 1).toISOString(),
      to: endOf(new Date(2026, 7, 21)).toISOString(),
    });
    expect(previousExpensePeriodRange('year', NOW)).toEqual({
      from: new Date(2025, 0, 1).toISOString(),
      to: endOf(new Date(2025, 8, 21)).toISOString(),
    });
  });

  it('compares rolling windows to the immediately preceding window', () => {
    expect(previousExpensePeriodRange('days7', NOW)).toEqual({
      from: new Date(2026, 8, 8).toISOString(),
      to: endOf(new Date(2026, 8, 14)).toISOString(),
    });
    expect(previousExpensePeriodRange('months6', NOW)).toEqual({
      from: new Date(2025, 8, 21).toISOString(),
      to: endOf(new Date(2026, 2, 20)).toISOString(),
    });
  });
});

describe('buildExpensesStructure', () => {
  const cash = makeCashAccount({ id: CASH_ID });
  const bank = makeBankAccount({ id: BANK_ID });

  it('keeps expenses only and rolls children up to their root', () => {
    const records = [
      makeExpenseRecord({
        id: '11111111-1111-4111-8111-111111111111',
        categoryId: 'food_drinks.groceries',
        amountCents: 20000,
      }),
      makeExpenseRecord({
        id: '22222222-2222-4222-8222-222222222222',
        categoryId: 'food_drinks.bar_cafe',
        amountCents: 5000,
      }),
      makeExpenseRecord({
        id: '33333333-3333-4333-8333-333333333333',
        categoryId: 'housing.rent',
        amountCents: 80000,
      }),
      makeTransferRecord({ amountCents: 99999 }),
      {
        ...makeExpenseRecord({
          id: '44444444-4444-4444-8444-444444444444',
          categoryId: 'income.wage_invoices',
          amountCents: 300000,
        }),
        kind: 'income' as const,
      },
    ];

    const vm = buildExpensesStructure({
      records,
      previousRecords: [],
      accounts: [cash, bank],
      parentId: null,
      selectedId: null,
      categoryTitle: titles,
    });

    expect(vm.totalCents).toBe(105000);
    expect(vm.slices.map((slice) => slice.id)).toEqual(['housing', 'food_drinks']);
    expect(vm.slices[0]).toMatchObject({
      id: 'housing',
      amountCents: 80000,
      color: getCategory('housing')?.color,
      hasChildren: true,
    });
    expect(vm.slices[1]).toMatchObject({
      id: 'food_drinks',
      amountCents: 25000,
      color: getCategory('food_drinks')?.color,
    });
    expect(vm.center).toMatchObject({
      isAll: true,
      amountCents: 105000,
      deltaPercent: null,
    });
    expect(vm.canGoDeeper).toBe(false);
    expect(vm.canGoBack).toBe(false);
  });

  it('ignores expenses on accounts excluded from stats', () => {
    const excluded = makeBankAccount({ id: BANK_ID, excludeFromStats: true });
    const records = [
      makeExpenseRecord({
        accountId: CASH_ID,
        categoryId: 'food_drinks.groceries',
        amountCents: 1000,
      }),
      makeExpenseRecord({
        id: '55555555-5555-4555-8555-555555555555',
        accountId: BANK_ID,
        categoryId: 'housing.rent',
        amountCents: 90000,
      }),
    ];

    const vm = buildExpensesStructure({
      records,
      previousRecords: [],
      accounts: [cash, excluded],
      parentId: null,
      selectedId: null,
      categoryTitle: titles,
    });

    expect(vm.totalCents).toBe(1000);
    expect(vm.slices.map((slice) => slice.id)).toEqual(['food_drinks']);
  });

  it('splits a root into children and leftover parent bookings when drilled in', () => {
    const records = [
      makeExpenseRecord({
        categoryId: 'food_drinks.groceries',
        amountCents: 20000,
      }),
      makeExpenseRecord({
        id: '66666666-6666-4666-8666-666666666666',
        categoryId: 'food_drinks.restaurant_fast_food',
        amountCents: 7000,
      }),
      makeExpenseRecord({
        id: '77777777-7777-4777-8777-777777777777',
        categoryId: 'food_drinks',
        amountCents: 3000,
      }),
      makeExpenseRecord({
        id: '88888888-8888-4888-8888-888888888888',
        categoryId: 'housing.rent',
        amountCents: 50000,
      }),
    ];

    const vm = buildExpensesStructure({
      records,
      previousRecords: [],
      accounts: [cash],
      parentId: 'food_drinks',
      selectedId: 'food_drinks',
      categoryTitle: titles,
    });

    expect(vm.totalCents).toBe(30000);
    expect(vm.slices.map((slice) => ({ id: slice.id, amountCents: slice.amountCents }))).toEqual([
      { id: 'food_drinks.groceries', amountCents: 20000 },
      { id: 'food_drinks.restaurant_fast_food', amountCents: 7000 },
      { id: 'food_drinks', amountCents: 3000 },
    ]);
    expect(vm.slices[0]?.color).not.toBe(vm.slices[1]?.color);
    expect(vm.center).toMatchObject({
      isAll: false,
      categoryId: 'food_drinks',
      amountCents: 30000,
    });
    expect(vm.canGoDeeper).toBe(false);
    expect(vm.canGoBack).toBe(true);
  });

  it('selects a child slice and compares it to the previous period', () => {
    const current = [
      makeExpenseRecord({
        categoryId: 'food_drinks.groceries',
        amountCents: 25000,
      }),
    ];
    const previous = [
      makeExpenseRecord({
        categoryId: 'food_drinks.groceries',
        amountCents: 20000,
      }),
    ];

    const vm = buildExpensesStructure({
      records: current,
      previousRecords: previous,
      accounts: [cash],
      parentId: 'food_drinks',
      selectedId: 'food_drinks.groceries',
      categoryTitle: titles,
    });

    expect(vm.center).toMatchObject({
      isAll: false,
      categoryId: 'food_drinks.groceries',
      amountCents: 25000,
      deltaPercent: 25,
    });
    expect(vm.deltaPercent).toBe(25);
  });

  it('offers go deeper on a selected root and restores it when going back', () => {
    const records = [
      makeExpenseRecord({
        categoryId: 'food_drinks.groceries',
        amountCents: 1000,
      }),
    ];
    const vm = buildExpensesStructure({
      records,
      previousRecords: [],
      accounts: [cash],
      parentId: null,
      selectedId: 'food_drinks',
      categoryTitle: titles,
    });

    expect(vm.canGoDeeper).toBe(true);
    expect(goDeeper('food_drinks')).toEqual({
      parentId: 'food_drinks',
      selectedId: 'food_drinks',
    });
    expect(goBack('food_drinks')).toEqual({ parentId: null, selectedId: 'food_drinks' });
  });

  it('reports a rounded spending delta versus the previous period', () => {
    const current = [makeExpenseRecord({ categoryId: 'housing.rent', amountCents: 103809 })];
    const previous = [makeExpenseRecord({ categoryId: 'housing.rent', amountCents: 152660 })];

    const vm = buildExpensesStructure({
      records: current,
      previousRecords: previous,
      accounts: [cash],
      parentId: null,
      selectedId: null,
      categoryTitle: titles,
    });

    expect(vm.deltaPercent).toBe(-32);
    expect(vm.center.deltaPercent).toBe(-32);
  });
});

describe('expense structure filter banner', () => {
  it('shows the without-transfers banner only for that filter', () => {
    expect(showsActiveFilter('withoutTransfers')).toBe(true);
    expect(showsActiveFilter('none')).toBe(false);
  });
});
