import { describe, expect, it } from '@jest/globals';

import {
  makeBankAccount,
  makeCashAccount,
  makeExpenseRecord,
  makeTransferRecord,
} from '@/application/fakes';

import {
  applyRecordEditParams,
  appendCalculatorKey,
  calculatorCents,
  canSubmitCalculator,
  canSubmitRecordEdit,
  destinationAccounts,
  draftForKind,
  formatRecordDay,
  groupRecordsByWeek,
  lastRecordsPreview,
  lastThirtyDaysRange,
  periodRange,
  recordUpdateBody,
  toRecordEditDraft,
  toRecordRow,
} from './records-view-model';

const NOW = new Date(2026, 8, 21, 12, 0, 0);
const CASH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BANK_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('records view-model', () => {
  it('computes local period bounds for today, week, month and year', () => {
    expect(periodRange('today', NOW).from).toBe(new Date(2026, 8, 21).toISOString());
    expect(periodRange('week', NOW).from).toBe(new Date(2026, 8, 21).toISOString());
    expect(periodRange('month', NOW).from).toBe(new Date(2026, 8, 1).toISOString());
    expect(periodRange('year', NOW).from).toBe(new Date(2026, 0, 1).toISOString());
  });

  it('computes a rolling last-30-days window in local time', () => {
    expect(lastThirtyDaysRange(NOW)).toEqual({
      from: new Date(2026, 7, 22).toISOString(),
      to: new Date(2026, 8, 21, 23, 59, 59, 999).toISOString(),
    });
  });

  it('keeps the five most recent records and formats the day label', () => {
    const cash = makeCashAccount({ id: CASH_ID, name: 'Espèces' });
    const records = [0, 1, 2, 3, 4, 5].map((offset) =>
      makeExpenseRecord({
        id: `11111111-1111-4111-8111-11111111111${offset}`,
        bookedAt: new Date(2026, 8, 21 - offset, 10, 0, 0).toISOString(),
        amountCents: 100 + offset,
      }),
    );
    const preview = lastRecordsPreview(records, [cash], () => 'Courses');
    expect(preview).toHaveLength(5);
    expect(preview.map((row) => row.id)).toEqual([
      '11111111-1111-4111-8111-111111111110',
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111112',
      '11111111-1111-4111-8111-111111111113',
      '11111111-1111-4111-8111-111111111114',
    ]);
    expect(formatRecordDay(records[0].bookedAt, 'fr')).toMatch(/21/);
  });

  it('maps an expense row with a signed amount and category color', () => {
    const row = toRecordRow(
      makeExpenseRecord({ amountCents: 7640, clearing: 'uncleared' }),
      [makeCashAccount({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Espèces' })],
      undefined,
      () => 'Courses',
    );
    expect(row.title).toBe('Courses');
    expect(row.subtitle).toBe('Espèces');
    expect(row.amountLabel).toBe('-76,40 €');
    expect(row.uncleared).toBe(true);
  });

  it('groups records by ISO week and accumulates opening balances', () => {
    const sections = groupRecordsByWeek(
      {
        records: [
          makeExpenseRecord({ bookedAt: '2026-09-21T10:00:00.000Z', amountCents: 200 }),
          makeExpenseRecord({
            id: '99999999-9999-4999-8999-999999999999',
            bookedAt: '2026-09-14T10:00:00.000Z',
            amountCents: 100,
          }),
        ],
        openingBalanceCents: 1000,
        periodNetCents: -300,
      },
      [makeCashAccount({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })],
      undefined,
      () => 'Courses',
    );
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(sections.at(-1)?.openingCents).toBe(1000);
    expect(sections[0]?.openingCents).toBe(900);
  });

  it('builds calculator cents from digits and a decimal comma', () => {
    let buffer = '';
    buffer = appendCalculatorKey(buffer, '7');
    buffer = appendCalculatorKey(buffer, '6');
    buffer = appendCalculatorKey(buffer, ',');
    buffer = appendCalculatorKey(buffer, '4');
    buffer = appendCalculatorKey(buffer, '0');
    expect(calculatorCents(buffer)).toBe(7640);
    expect(canSubmitCalculator(buffer)).toBe(true);
    expect(canSubmitCalculator('')).toBe(false);
  });

  it('builds an update body to recategorize, convert to a transfer and back', () => {
    const expense = makeExpenseRecord();
    const recategorize = recordUpdateBody(expense, {
      ...toRecordEditDraft(expense),
      categoryId: 'shopping.home_garden',
    });
    expect(recategorize).toEqual({ categoryId: 'shopping.home_garden' });

    const asTransfer = recordUpdateBody(expense, {
      kind: 'transfer',
      categoryId: null,
      otherAccountId: BANK_ID,
      note: expense.note,
      uncleared: false,
    });
    expect(asTransfer).toEqual({ kind: 'transfer', toAccountId: BANK_ID });

    const transfer = makeTransferRecord();
    const asExpense = recordUpdateBody(transfer, {
      kind: 'expense',
      categoryId: 'food_drinks.groceries',
      otherAccountId: transfer.toAccountId,
      note: transfer.note,
      uncleared: false,
    });
    expect(asExpense).toEqual({ kind: 'expense', categoryId: 'food_drinks.groceries' });
    expect(canSubmitRecordEdit(expense, { ...toRecordEditDraft(expense), kind: 'transfer' })).toBe(
      false,
    );
  });

  it('lists destination accounts and resets the category when switching kind', () => {
    const cash = makeCashAccount({ id: CASH_ID });
    const bank = makeBankAccount({ id: BANK_ID });
    expect(destinationAccounts([cash, bank], CASH_ID).map((account) => account.id)).toEqual([
      BANK_ID,
    ]);

    const expense = makeExpenseRecord();
    const draft = draftForKind(toRecordEditDraft(expense), 'income');
    expect(draft.kind).toBe('income');
    expect(draft.categoryId).toBe('income');
    expect(
      applyRecordEditParams(toRecordEditDraft(expense), {
        kind: 'transfer',
        toAccountId: BANK_ID,
      }),
    ).toMatchObject({ kind: 'transfer', otherAccountId: BANK_ID });
  });
});
