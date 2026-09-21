import { describe, expect, it } from '@jest/globals';

import { makeCashAccount, makeExpenseRecord } from '@/application/fakes';

import {
  appendCalculatorKey,
  calculatorCents,
  canSubmitCalculator,
  groupRecordsByWeek,
  periodRange,
  toRecordRow,
} from './records-view-model';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

describe('records view-model', () => {
  it('computes local period bounds for today, week, month and year', () => {
    expect(periodRange('today', NOW).from).toBe(new Date(2026, 8, 21).toISOString());
    expect(periodRange('week', NOW).from).toBe(new Date(2026, 8, 21).toISOString());
    expect(periodRange('month', NOW).from).toBe(new Date(2026, 8, 1).toISOString());
    expect(periodRange('year', NOW).from).toBe(new Date(2026, 0, 1).toISOString());
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
});
