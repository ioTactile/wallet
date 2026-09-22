import { describe, expect, it } from 'vitest';

import { DEFAULT_ACCOUNT_CURRENCY } from '../account.js';
import {
  createRecordBodySchema,
  listRecordsQuerySchema,
  RECORD_NOTE_MAX_LENGTH,
  recordSchema,
  recordsResponseSchema,
  updateRecordBodySchema,
} from './schemas.js';

const RECORD_ID = '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12';
const USER_ID = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';
const CASH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BANK_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NOW = '2026-09-20T10:00:00.000Z';

function expenseDto(overrides: Record<string, unknown> = {}) {
  return {
    id: RECORD_ID,
    userId: USER_ID,
    kind: 'expense',
    accountId: CASH_ID,
    categoryId: 'food_drinks.groceries',
    amountCents: 199,
    currency: DEFAULT_ACCOUNT_CURRENCY,
    bookedAt: NOW,
    clearing: 'cleared',
    categoryConfirmed: false,
    note: 'Courses',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function transferDto(overrides: Record<string, unknown> = {}) {
  return {
    id: RECORD_ID,
    userId: USER_ID,
    kind: 'transfer',
    fromAccountId: CASH_ID,
    toAccountId: BANK_ID,
    amountCents: 50_00,
    currency: DEFAULT_ACCOUNT_CURRENCY,
    bookedAt: NOW,
    clearing: 'cleared',
    categoryConfirmed: false,
    note: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('recordSchema', () => {
  it('parses an expense with a catalog category and integer cents', () => {
    const parsed = recordSchema.parse(expenseDto());
    expect(parsed.kind).toBe('expense');
    if (parsed.kind !== 'expense') throw new Error('expected expense');
    expect(parsed.accountId).toBe(CASH_ID);
    expect(parsed.categoryId).toBe('food_drinks.groceries');
    expect(parsed.categoryConfirmed).toBe(false);
    expect(parsed.amountCents).toBe(199);
    expect(parsed).not.toHaveProperty('fromAccountId');
  });

  it('parses a transfer without a category', () => {
    const parsed = recordSchema.parse(transferDto());
    expect(parsed.kind).toBe('transfer');
    if (parsed.kind !== 'transfer') throw new Error('expected transfer');
    expect(parsed.fromAccountId).toBe(CASH_ID);
    expect(parsed.toAccountId).toBe(BANK_ID);
    expect(parsed).not.toHaveProperty('categoryId');
    expect(parsed).not.toHaveProperty('accountId');
  });

  it('rejects zero, floats, unknown kinds and non-EUR currency', () => {
    expect(() => recordSchema.parse(expenseDto({ amountCents: 0 }))).toThrow();
    expect(() => recordSchema.parse(expenseDto({ amountCents: 1.5 }))).toThrow();
    expect(() => recordSchema.parse(expenseDto({ kind: 'fee' }))).toThrow();
    expect(() => recordSchema.parse(expenseDto({ currency: 'USD' }))).toThrow();
  });
});

describe('createRecordBodySchema', () => {
  it('accepts expense, income and transfer payloads', () => {
    expect(
      createRecordBodySchema.parse({
        kind: 'expense',
        accountId: CASH_ID,
        categoryId: 'food_drinks',
        amountCents: 100,
      }),
    ).toMatchObject({ kind: 'expense', categoryId: 'food_drinks' });

    expect(
      createRecordBodySchema.parse({
        kind: 'income',
        accountId: CASH_ID,
        categoryId: 'income.refunds',
        amountCents: 250,
        note: '  Remboursement ',
      }),
    ).toMatchObject({ kind: 'income', note: 'Remboursement' });

    expect(
      createRecordBodySchema.parse({
        kind: 'transfer',
        fromAccountId: CASH_ID,
        toAccountId: BANK_ID,
        amountCents: 10_00,
      }),
    ).toMatchObject({ kind: 'transfer' });
  });

  it('rejects a category that does not match the kind, same-account transfers and extra fields', () => {
    expect(() =>
      createRecordBodySchema.parse({
        kind: 'expense',
        accountId: CASH_ID,
        categoryId: 'income.refunds',
        amountCents: 100,
      }),
    ).toThrow();
    expect(() =>
      createRecordBodySchema.parse({
        kind: 'transfer',
        fromAccountId: CASH_ID,
        toAccountId: CASH_ID,
        amountCents: 100,
      }),
    ).toThrow();
    expect(() =>
      createRecordBodySchema.parse({
        kind: 'expense',
        accountId: CASH_ID,
        categoryId: 'food_drinks',
        amountCents: 100,
        fromAccountId: BANK_ID,
      }),
    ).toThrow();
  });
});

describe('updateRecordBodySchema', () => {
  it('accepts a partial update and trims the note', () => {
    expect(updateRecordBodySchema.parse({ note: '  Hello ' })).toEqual({ note: 'Hello' });
    expect(updateRecordBodySchema.parse({ categoryConfirmed: true })).toEqual({
      categoryConfirmed: true,
    });
  });

  it('accepts a kind conversion to transfer or ledger', () => {
    expect(updateRecordBodySchema.parse({ kind: 'transfer', toAccountId: BANK_ID })).toMatchObject({
      kind: 'transfer',
      toAccountId: BANK_ID,
    });
    expect(
      updateRecordBodySchema.parse({ kind: 'expense', categoryId: 'food_drinks.groceries' }),
    ).toMatchObject({ kind: 'expense', categoryId: 'food_drinks.groceries' });
  });

  it('rejects an empty body, mismatched conversion fields and oversized notes', () => {
    expect(() => updateRecordBodySchema.parse({})).toThrow();
    expect(() =>
      updateRecordBodySchema.parse({ kind: 'transfer', categoryId: 'food_drinks' }),
    ).toThrow();
    expect(() => updateRecordBodySchema.parse({ kind: 'expense', toAccountId: BANK_ID })).toThrow();
    expect(() =>
      updateRecordBodySchema.parse({ note: 'x'.repeat(RECORD_NOTE_MAX_LENGTH + 1) }),
    ).toThrow();
  });
});

describe('listRecordsQuerySchema', () => {
  it('parses a period and optional account ids', () => {
    expect(
      listRecordsQuerySchema.parse({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
      }),
    ).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });

    expect(
      listRecordsQuerySchema.parse({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
        accountIds: `${CASH_ID},${BANK_ID}`,
      }),
    ).toMatchObject({ accountIds: [CASH_ID, BANK_ID] });
  });

  it('rejects inverted periods and invalid uuids', () => {
    expect(() =>
      listRecordsQuerySchema.parse({
        from: '2026-09-30T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      }),
    ).toThrow();
    expect(() =>
      listRecordsQuerySchema.parse({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T00:00:00.000Z',
        accountIds: 'not-a-uuid',
      }),
    ).toThrow();
  });
});

describe('recordsResponseSchema', () => {
  it('wraps records with opening and period totals as integers', () => {
    const parsed = recordsResponseSchema.parse({
      records: [expenseDto()],
      openingBalanceCents: 1000,
      periodNetCents: -199,
    });
    expect(parsed.records).toHaveLength(1);
    expect(parsed.openingBalanceCents).toBe(1000);
    expect(parsed.periodNetCents).toBe(-199);
  });
});
