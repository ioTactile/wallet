import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_CURRENCY,
  DEFAULT_CASH_ACCOUNT_ID,
} from '@wallet/shared';

import { Account } from './account.js';
import { AccountKindMismatch, InvalidAccount } from './errors.js';

const NOW = new Date('2026-09-20T10:00:00.000Z');

function cash(overrides: Partial<Parameters<typeof Account.createCash>[0]> = {}) {
  return Account.createCash({
    id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
    userId: '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d',
    name: 'Espèces',
    now: NOW,
    ...overrides,
  });
}

function bank(overrides: Partial<Parameters<typeof Account.createBank>[0]> = {}) {
  return Account.createBank({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    userId: '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d',
    name: 'BoursoBank',
    now: NOW,
    ...overrides,
  });
}

describe('Account', () => {
  it('creates a cash account with EUR, default color and no bank fields', () => {
    const account = cash();
    expect(account.kind).toBe('cash');
    expect(account.name).toBe('Espèces');
    expect(account.currency).toBe(DEFAULT_ACCOUNT_CURRENCY);
    expect(account.color).toBe(DEFAULT_ACCOUNT_COLOR);
    expect(account.excludeFromStats).toBe(false);
    expect(account.archivedAt).toBeNull();
    expect(account.iban).toBeNull();
    expect(account.institutionName).toBeNull();
    expect(account.minBalanceCents).toBeNull();
    expect(account.maxBalanceCents).toBeNull();
    expect(account.id).not.toBe(DEFAULT_CASH_ACCOUNT_ID);
  });

  it('creates a bank account with optional iban and institution', () => {
    const account = bank({
      iban: '  FR7630001007941234567890185 ',
      institutionName: '  BoursoBank ',
    });
    expect(account.kind).toBe('bank');
    expect(account.iban).toBe('FR7630001007941234567890185');
    expect(account.institutionName).toBe('BoursoBank');
  });

  it('trims the name, uppercases color, and rejects invalid values', () => {
    expect(cash({ name: '  Coffre ', color: '#42a5f5' }).name).toBe('Coffre');
    expect(cash({ name: '  Coffre ', color: '#42a5f5' }).color).toBe('#42A5F5');
    expect(() => cash({ name: '   ' })).toThrow(InvalidAccount);
    expect(() => cash({ name: 'x'.repeat(101) })).toThrow(InvalidAccount);
    expect(() => cash({ color: 'green' })).toThrow(InvalidAccount);
    expect(() => cash({ currency: 'USD' })).toThrow(InvalidAccount);
    expect(() => cash({ id: DEFAULT_CASH_ACCOUNT_ID })).toThrow(InvalidAccount);
  });

  it('rejects inverted or equal balance alerts', () => {
    expect(() => cash({ minBalanceCents: 100, maxBalanceCents: 100 })).toThrow(InvalidAccount);
    expect(() => cash({ minBalanceCents: 200, maxBalanceCents: 100 })).toThrow(InvalidAccount);
    expect(cash({ minBalanceCents: 0, maxBalanceCents: 100 }).minBalanceCents).toBe(0);
  });

  it('renames, recolors, toggles stats exclusion and sets alerts without changing kind', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    const updated = cash()
      .rename('  Vacances ', later)
      .recolor('#ec407a', later)
      .setExcludeFromStats(true, later)
      .setBalanceAlerts(-50_00, 200_00, later);

    expect(updated.kind).toBe('cash');
    expect(updated.name).toBe('Vacances');
    expect(updated.color).toBe('#EC407A');
    expect(updated.excludeFromStats).toBe(true);
    expect(updated.minBalanceCents).toBe(-50_00);
    expect(updated.maxBalanceCents).toBe(200_00);
    expect(updated.updatedAt).toEqual(later);
  });

  it('archives and unarchives', () => {
    const later = new Date('2026-09-20T12:00:00.000Z');
    const archived = cash().archive(later);
    expect(archived.archivedAt).toEqual(later);
    expect(archived.unarchive(later).archivedAt).toBeNull();
  });

  it('rejects bank details on cash and accepts them on bank', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    expect(() => cash().setBankDetails('FR76', 'CIC', later)).toThrow(AccountKindMismatch);
    const updated = bank().setBankDetails(' FR76 ', '  CIC ', later);
    expect(updated.iban).toBe('FR76');
    expect(updated.institutionName).toBe('CIC');
  });

  it('links a bank account to an AIS connection and records lastSyncedAt', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    const linked = bank({
      bankLinkId: 'link-1',
      externalAccountId: 'sandbox-checking',
    });
    expect(linked.bankLinkId).toBe('link-1');
    expect(linked.externalAccountId).toBe('sandbox-checking');
    expect(linked.markSynced(later).lastSyncedAt).toEqual(later);
    expect(cash().bankLinkId).toBeNull();
    expect(() => cash().markSynced(later)).toThrow(AccountKindMismatch);
    expect(() => bank({ bankLinkId: 'link-1' })).toThrow(InvalidAccount);
  });
});
