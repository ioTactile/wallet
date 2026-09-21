import { describe, expect, it } from 'vitest';

import { DEFAULT_ACCOUNT_CURRENCY } from '@wallet/shared';

import { InvalidRecord } from './errors.js';
import { LedgerRecord } from './record.js';

const NOW = new Date('2026-09-20T10:00:00.000Z');

function expense(overrides: Partial<Parameters<typeof LedgerRecord.createExpense>[0]> = {}) {
  return LedgerRecord.createExpense({
    id: 'rec-1',
    userId: 'user-1',
    accountId: 'cash-1',
    categoryId: 'food_drinks.groceries',
    amountCents: 199,
    now: NOW,
    ...overrides,
  });
}

describe('LedgerRecord', () => {
  it('creates an expense with EUR, cleared by default and a catalog category', () => {
    const record = expense({ note: '  Courses ' });
    expect(record.kind).toBe('expense');
    expect(record.amountCents).toBe(199);
    expect(record.currency).toBe(DEFAULT_ACCOUNT_CURRENCY);
    expect(record.clearing).toBe('cleared');
    expect(record.note).toBe('Courses');
    expect(record.categoryId).toBe('food_drinks.groceries');
    expect(record.counterpartyAccountId).toBeNull();
    expect(record.bookedAt).toEqual(NOW);
  });

  it('creates a transfer without a category', () => {
    const record = LedgerRecord.createTransfer({
      id: 'rec-2',
      userId: 'user-1',
      accountId: 'cash-1',
      counterpartyAccountId: 'bank-1',
      amountCents: 50_00,
      now: NOW,
    });
    expect(record.kind).toBe('transfer');
    expect(record.categoryId).toBeNull();
    expect(record.counterpartyAccountId).toBe('bank-1');
  });

  it('rejects zero amounts, mismatched categories and same-account transfers', () => {
    expect(() => expense({ amountCents: 0 })).toThrow(InvalidRecord);
    expect(() => expense({ amountCents: 1.5 })).toThrow(InvalidRecord);
    expect(() => expense({ categoryId: 'income.refunds' })).toThrow(InvalidRecord);
    expect(() => expense({ currency: 'USD' })).toThrow(InvalidRecord);
    expect(() =>
      LedgerRecord.createTransfer({
        id: 'rec-2',
        userId: 'user-1',
        accountId: 'cash-1',
        counterpartyAccountId: 'cash-1',
        amountCents: 100,
        now: NOW,
      }),
    ).toThrow(InvalidRecord);
  });

  it('updates mutable fields without changing kind', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    const updated = expense()
      .recategorize('shopping.home_garden', later)
      .setAmount(599, later)
      .setNote('Amazon', later)
      .setClearing('uncleared', later)
      .setBookedAt(new Date('2026-09-13T00:00:00.000Z'), later);

    expect(updated.kind).toBe('expense');
    expect(updated.categoryId).toBe('shopping.home_garden');
    expect(updated.amountCents).toBe(599);
    expect(updated.note).toBe('Amazon');
    expect(updated.clearing).toBe('uncleared');
    expect(updated.updatedAt).toEqual(later);
  });

  it('forbids recategorizing a transfer', () => {
    const transfer = LedgerRecord.createTransfer({
      id: 'rec-2',
      userId: 'user-1',
      accountId: 'cash-1',
      counterpartyAccountId: 'bank-1',
      amountCents: 100,
      now: NOW,
    });
    expect(() => transfer.recategorize('food_drinks', NOW)).toThrow(InvalidRecord);
  });
});
