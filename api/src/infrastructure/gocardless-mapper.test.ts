import { describe, expect, it } from 'vitest';

import {
  gocardlessDateFrom,
  mapGoCardlessAccount,
  mapGoCardlessTransactions,
  parseEuroAmountToCents,
} from './gocardless-mapper.js';

describe('parseEuroAmountToCents', () => {
  it('parses dotted and comma amounts as integer cents', () => {
    expect(parseEuroAmountToCents('45.00')).toBe(4500);
    expect(parseEuroAmountToCents('-15.00')).toBe(-1500);
    expect(parseEuroAmountToCents('-10.99')).toBe(-1099);
    expect(parseEuroAmountToCents('1,5')).toBe(150);
    expect(parseEuroAmountToCents('  12 ')).toBe(1200);
  });

  it('rejects non-euro-decimal strings without using floats', () => {
    expect(parseEuroAmountToCents('')).toBeNull();
    expect(parseEuroAmountToCents('abc')).toBeNull();
    expect(parseEuroAmountToCents('10.999')).toBeNull();
  });
});

describe('mapGoCardlessTransactions', () => {
  it('maps booked and pending EUR transactions to integer cents', () => {
    const mapped = mapGoCardlessTransactions('acc-1', {
      booked: [
        {
          transactionId: 'tx-salary',
          transactionAmount: { currency: 'EUR', amount: '2500.00' },
          bookingDate: '2026-09-03',
          remittanceInformationUnstructured: 'Salaire',
        },
      ],
      pending: [
        {
          transactionAmount: { currency: 'EUR', amount: '-4.50' },
          valueDate: '2026-09-20',
          remittanceInformationUnstructured: 'Café',
        },
      ],
    });
    expect(mapped).toEqual([
      {
        externalId: 'tx-salary',
        accountExternalId: 'acc-1',
        signedAmountCents: 2500_00,
        bookedAt: new Date('2026-09-03T00:00:00.000Z'),
        label: 'Salaire',
        pending: false,
      },
      {
        externalId: mapped[1]?.externalId,
        accountExternalId: 'acc-1',
        signedAmountCents: -4_50,
        bookedAt: new Date('2026-09-20T00:00:00.000Z'),
        label: 'Café',
        pending: true,
      },
    ]);
    expect(mapped[1]?.externalId).toMatch(/^[a-f0-9]{32}$/);
  });

  it('keeps a stable id for pending transactions without a provider id', () => {
    const payload = {
      pending: [
        {
          transactionAmount: { currency: 'EUR', amount: '-4.50' },
          valueDate: '2026-09-20',
          remittanceInformationUnstructured: 'Café',
        },
      ],
    };
    const first = mapGoCardlessTransactions('acc-1', payload);
    const second = mapGoCardlessTransactions('acc-1', payload);
    expect(first[0]?.externalId).toBe(second[0]?.externalId);
    expect(mapGoCardlessTransactions('acc-2', payload)[0]?.externalId).not.toBe(
      first[0]?.externalId,
    );
  });

  it('skips non-EUR, zero, and undated transactions', () => {
    expect(
      mapGoCardlessTransactions('acc-1', {
        booked: [
          {
            transactionId: 'usd',
            transactionAmount: { currency: 'USD', amount: '10.00' },
            bookingDate: '2026-09-01',
            remittanceInformationUnstructured: 'USD',
          },
          {
            transactionId: 'zero',
            transactionAmount: { currency: 'EUR', amount: '0.00' },
            bookingDate: '2026-09-01',
            remittanceInformationUnstructured: 'Zero',
          },
          {
            transactionId: 'nodate',
            transactionAmount: { currency: 'EUR', amount: '-1.00' },
            remittanceInformationUnstructured: 'No date',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('prefers bookingDate and falls back to remittance array then names', () => {
    const [mapped] = mapGoCardlessTransactions('acc-1', {
      booked: [
        {
          transactionId: 'tx-1',
          transactionAmount: { currency: 'EUR', amount: '-38.50' },
          bookingDate: '2026-09-15',
          valueDate: '2026-09-16',
          remittanceInformationUnstructuredArray: ['Restaurant', 'Paris'],
        },
      ],
    });
    expect(mapped?.bookedAt).toEqual(new Date('2026-09-15T00:00:00.000Z'));
    expect(mapped?.label).toBe('Restaurant Paris');
  });
});

describe('mapGoCardlessAccount', () => {
  it('maps EUR account details and skips other currencies', () => {
    expect(
      mapGoCardlessAccount(
        'acc-1',
        {
          iban: ' FR7630001007941234567890185 ',
          currency: 'EUR',
          name: 'Compte courant',
        },
        'BoursoBank',
      ),
    ).toEqual({
      externalId: 'acc-1',
      name: 'Compte courant',
      iban: 'FR7630001007941234567890185',
      institutionName: 'BoursoBank',
      currency: 'EUR',
    });
    expect(
      mapGoCardlessAccount('acc-2', { currency: 'USD', name: 'Checking' }, 'BoursoBank'),
    ).toBeNull();
  });
});

describe('gocardlessDateFrom', () => {
  it('subtracts a two-day overlap for incremental pulls', () => {
    expect(gocardlessDateFrom(new Date('2026-09-20T10:00:00.000Z'))).toBe('2026-09-18');
  });
});
