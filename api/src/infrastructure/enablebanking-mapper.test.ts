import { describe, expect, it } from 'vitest';

import {
  decodeEnableBankingState,
  enableBankingDateFrom,
  encodeEnableBankingState,
  mapEnableBankingAccount,
  mapEnableBankingTransactions,
} from './enablebanking-mapper.js';

const SECRET = 'test-secret-at-least-32-characters!';

describe('enable banking state', () => {
  it('round-trips a signed connection id and rejects forgeries', () => {
    const state = encodeEnableBankingState({ connectionId: 'link-1' }, SECRET);
    expect(decodeEnableBankingState(state, SECRET)).toEqual({ connectionId: 'link-1' });
    expect(() => decodeEnableBankingState(state, 'other-secret-at-least-32-chars!!')).toThrow();
    expect(() =>
      decodeEnableBankingState(
        Buffer.from(JSON.stringify({ connectionId: 'link-1' }), 'utf8').toString('base64url'),
        SECRET,
      ),
    ).toThrow();
    expect(() => decodeEnableBankingState('not-json', SECRET)).toThrow();
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
  it('maps EUR current accounts, skips cards and foreign currencies', () => {
    expect(
      mapEnableBankingAccount(
        {
          uid: 'acc-1',
          details: 'Compte courant',
          currency: 'EUR',
          cash_account_type: 'CACC',
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
    // BoursoBank often returns ISO 4217 XXX ("no currency") for EUR current accounts.
    expect(
      mapEnableBankingAccount(
        {
          uid: 'acc-xxx',
          name: 'M XXX',
          details: 'immediat_debit',
          product: 'CAV - BOURSOBANK',
          currency: 'XXX',
          cash_account_type: 'CACC',
          account_id: { iban: 'FR7640618804330004014834544' },
        },
        'BoursoBank',
      ),
    ).toEqual({
      externalId: 'acc-xxx',
      name: 'CAV - BOURSOBANK',
      iban: 'FR7640618804330004014834544',
      institutionName: 'BoursoBank',
      currency: 'EUR',
    });
    // Debit cards mirror CAV card payments — skip to avoid duplicates.
    expect(
      mapEnableBankingAccount(
        {
          uid: 'acc-card',
          product: 'Carte bancaire à débit immédiat',
          currency: 'XXX',
          cash_account_type: 'CARD',
        },
        'BoursoBank',
      ),
    ).toBeNull();
    expect(mapEnableBankingAccount({ uid: 'acc-2', currency: 'USD' }, 'BoursoBank')).toBeNull();
  });
});

describe('enableBankingDateFrom', () => {
  it('subtracts a two-day overlap', () => {
    expect(enableBankingDateFrom(new Date('2026-09-20T10:00:00.000Z'))).toBe('2026-09-18');
  });
});
