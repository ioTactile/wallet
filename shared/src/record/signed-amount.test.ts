import { describe, expect, it } from 'vitest';

import { DEFAULT_ACCOUNT_CURRENCY } from '../account.js';
import type { Record } from './schemas.js';
import {
  accumulateBalances,
  recordTouchesAccounts,
  signedAmountForAccount,
  signedAmountForSelection,
} from './signed-amount.js';

const CASH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BANK = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW = '2026-09-20T10:00:00.000Z';

const base = {
  id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
  userId: '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d',
  currency: DEFAULT_ACCOUNT_CURRENCY,
  bookedAt: NOW,
  clearing: 'cleared' as const,
  note: '',
  createdAt: NOW,
  updatedAt: NOW,
};

const expense: Record = {
  ...base,
  kind: 'expense',
  accountId: CASH,
  categoryId: 'food_drinks',
  amountCents: 400,
};

const income: Record = {
  ...base,
  kind: 'income',
  accountId: CASH,
  categoryId: 'income.refunds',
  amountCents: 150,
};

const transfer: Record = {
  ...base,
  kind: 'transfer',
  fromAccountId: CASH,
  toAccountId: BANK,
  amountCents: 1000,
};

describe('signed amounts', () => {
  it('signs expense, income and both sides of a transfer', () => {
    expect(signedAmountForAccount(expense, CASH)).toBe(-400);
    expect(signedAmountForAccount(income, CASH)).toBe(150);
    expect(signedAmountForAccount(transfer, CASH)).toBe(-1000);
    expect(signedAmountForAccount(transfer, BANK)).toBe(1000);
    expect(signedAmountForAccount(expense, BANK)).toBe(0);
  });

  it('nets internal transfers when no account filter is set', () => {
    expect(signedAmountForSelection(expense, undefined)).toBe(-400);
    expect(signedAmountForSelection(income, undefined)).toBe(150);
    expect(signedAmountForSelection(transfer, undefined)).toBe(0);
    expect(signedAmountForSelection(transfer, [CASH])).toBe(-1000);
    expect(signedAmountForSelection(transfer, [BANK])).toBe(1000);
    expect(signedAmountForSelection(transfer, [CASH, BANK])).toBe(0);
  });

  it('matches records that touch the selected accounts', () => {
    expect(recordTouchesAccounts(expense, undefined)).toBe(true);
    expect(recordTouchesAccounts(expense, [CASH])).toBe(true);
    expect(recordTouchesAccounts(expense, [BANK])).toBe(false);
    expect(recordTouchesAccounts(transfer, [BANK])).toBe(true);
    expect(recordTouchesAccounts(transfer, [OTHER])).toBe(false);
  });

  it('accumulates per-account balances', () => {
    const balances = accumulateBalances([expense, income, transfer]);
    expect(balances.get(CASH)).toBe(-400 + 150 - 1000);
    expect(balances.get(BANK)).toBe(1000);
  });
});
