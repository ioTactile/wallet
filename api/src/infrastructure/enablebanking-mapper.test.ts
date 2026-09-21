import { describe, expect, it } from 'vitest';

import {
  decodeEnableBankingState,
  enableBankingDateFrom,
  encodeEnableBankingState,
  mapEnableBankingAccount,
  mapEnableBankingTransactions,
} from './enablebanking-mapper.js';

describe('enable banking state', () => {
  it('round-trips connection id and mobile redirect', () => {
    const state = encodeEnableBankingState({
      connectionId: 'link-1',
      redirectUri: 'mobile://bank/callback',
    });
    expect(decodeEnableBankingState(state)).toEqual({
      connectionId: 'link-1',
      redirectUri: 'mobile://bank/callback',
    });
    expect(() => decodeEnableBankingState('not-json')).toThrow();
  });
});

describe('mapEnableBankingTransactions', () => {
  it('applies CRDT/DBIT and pending status', () => {
    const mapped = mapEnableBankingTransactions('acc-1', [
      {
        transaction_id: 'tx-in',
        transaction_amount: { currency: 'EUR', amount: '2500.00' },
        credit_debit_indicator: 'CRDT',
        status: 'BOOK',
        booking_date: '2026-09-03',
        remittance_information: ['Salaire'],
      },
      {
        entry_reference: 'tx-out',
        transaction_amount: { currency: 'EUR', amount: '10.99' },
        credit_debit_indicator: 'DBIT',
        status: 'PDNG',
        value_date: '2026-09-20',
        creditor: { name: 'Spotify' },
      },
    ]);
    expect(mapped).toEqual([
      {
        externalId: 'tx-in',
        accountExternalId: 'acc-1',
        signedAmountCents: 2500_00,
        bookedAt: new Date('2026-09-03T00:00:00.000Z'),
        label: 'Salaire',
        pending: false,
      },
      {
        externalId: 'tx-out',
        accountExternalId: 'acc-1',
        signedAmountCents: -10_99,
        bookedAt: new Date('2026-09-20T00:00:00.000Z'),
        label: 'Spotify',
        pending: true,
      },
    ]);
  });

  it('skips non-EUR and zero amounts', () => {
    expect(
      mapEnableBankingTransactions('acc-1', [
        {
          transaction_id: 'usd',
          transaction_amount: { currency: 'USD', amount: '10.00' },
          booking_date: '2026-09-01',
        },
        {
          transaction_id: 'zero',
          transaction_amount: { currency: 'EUR', amount: '0.00' },
          booking_date: '2026-09-01',
        },
      ]),
    ).toEqual([]);
  });
});

describe('mapEnableBankingAccount', () => {
  it('maps EUR accounts and skips others', () => {
    expect(
      mapEnableBankingAccount(
        {
          uid: 'acc-1',
          details: 'Compte courant',
          currency: 'EUR',
          account_id: { iban: ' FR761234 ' },
        },
        'BoursoBank',
      ),
    ).toEqual({
      externalId: 'acc-1',
      name: 'Compte courant',
      iban: 'FR761234',
      institutionName: 'BoursoBank',
      currency: 'EUR',
    });
    expect(mapEnableBankingAccount({ uid: 'acc-2', currency: 'USD' }, 'BoursoBank')).toBeNull();
  });
});

describe('enableBankingDateFrom', () => {
  it('subtracts a two-day overlap', () => {
    expect(enableBankingDateFrom(new Date('2026-09-20T10:00:00.000Z'))).toBe('2026-09-18');
  });
});
