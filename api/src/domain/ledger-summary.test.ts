import { describe, expect, it } from 'vitest';

import { accumulateLedgerBalances, summarizeLedgerRecords } from './ledger-summary.js';
import { LedgerRecord } from './record.js';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const FROM = new Date('2026-09-01T00:00:00.000Z');
const TO = new Date('2026-09-30T23:59:59.000Z');
const USER = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';
const CASH = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BANK = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('ledger summary', () => {
  it('summarizes period net and opening balance in integer cents', () => {
    const opening = LedgerRecord.createIncome({
      id: '11111111-1111-4111-8111-111111111111',
      userId: USER,
      accountId: CASH,
      categoryId: 'income.refunds',
      amountCents: 1000,
      now: NOW,
      bookedAt: new Date('2026-08-15T10:00:00.000Z'),
    });
    const inPeriod = LedgerRecord.createExpense({
      id: '22222222-2222-4222-8222-222222222222',
      userId: USER,
      accountId: CASH,
      categoryId: 'food_drinks',
      amountCents: 200,
      now: NOW,
      bookedAt: NOW,
    });

    const listed = summarizeLedgerRecords([opening, inPeriod], FROM, TO);
    expect(listed.records).toHaveLength(1);
    expect(listed.openingBalanceCents).toBe(1000);
    expect(listed.periodNetCents).toBe(-200);
  });

  it('accumulates balances per account including transfers', () => {
    const transfer = LedgerRecord.createTransfer({
      id: '33333333-3333-4333-8333-333333333333',
      userId: USER,
      accountId: CASH,
      counterpartyAccountId: BANK,
      amountCents: 40_00,
      now: NOW,
      bookedAt: NOW,
    });
    const balances = accumulateLedgerBalances([transfer]);
    expect(balances.get(CASH)).toBe(-40_00);
    expect(balances.get(BANK)).toBe(40_00);
  });
});
