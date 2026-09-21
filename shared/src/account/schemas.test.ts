import { describe, expect, it } from 'vitest';

import { ACCOUNT_COLORS, DEFAULT_ACCOUNT_COLOR, DEFAULT_ACCOUNT_CURRENCY } from '../account.js';
import {
  accountSchema,
  accountsResponseSchema,
  archiveAccountBodySchema,
  createAccountBodySchema,
  listAccountsQuerySchema,
  updateAccountBodySchema,
} from './schemas.js';

const ACCOUNT_ID = '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12';
const USER_ID = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';
const NOW = '2026-09-20T10:00:00.000Z';

function cashDto(overrides: Record<string, unknown> = {}) {
  return {
    id: ACCOUNT_ID,
    userId: USER_ID,
    kind: 'cash',
    name: 'Espèces',
    currency: DEFAULT_ACCOUNT_CURRENCY,
    color: DEFAULT_ACCOUNT_COLOR,
    excludeFromStats: false,
    archivedAt: null,
    position: 0,
    createdAt: NOW,
    updatedAt: NOW,
    minBalanceCents: null,
    maxBalanceCents: null,
    balanceCents: 0,
    ...overrides,
  };
}

function bankDto(overrides: Record<string, unknown> = {}) {
  return {
    ...cashDto({
      kind: 'bank',
      name: 'BoursoBank',
      iban: 'FR7630001007941234567890185',
      institutionName: 'BoursoBank',
      lastSyncedAt: null,
    }),
    ...overrides,
  };
}

describe('accountSchema', () => {
  it('parses a cash account DTO with integer balanceCents', () => {
    const parsed = accountSchema.parse(cashDto());
    expect(parsed.kind).toBe('cash');
    expect(parsed.balanceCents).toBe(0);
    expect(parsed.currency).toBe('EUR');
    expect(parsed.archivedAt).toBeNull();
    expect(parsed).not.toHaveProperty('iban');
    expect(parsed).not.toHaveProperty('institutionName');
  });

  it('parses a bank account DTO with optional iban and institution', () => {
    const parsed = accountSchema.parse(bankDto({ iban: null, institutionName: null }));
    expect(parsed.kind).toBe('bank');
    if (parsed.kind !== 'bank') throw new Error('expected bank');
    expect(parsed.iban).toBeNull();
    expect(parsed.institutionName).toBeNull();
    expect(parsed.lastSyncedAt).toBeNull();
  });

  it('requires balanceCents as an integer even before records exist', () => {
    expect(() => accountSchema.parse(cashDto({ balanceCents: undefined }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ balanceCents: 10.5 }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ balanceCents: '0' }))).toThrow();
  });

  it('rejects non-EUR currency, invalid hex, empty name and unknown kinds', () => {
    expect(() => accountSchema.parse(cashDto({ currency: 'USD' }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ color: 'blue' }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ color: '#FFF' }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ name: '   ' }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ kind: 'google_pay' }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ kind: 'checking' }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ id: 'cash' }))).toThrow();
  });

  it('rejects float thresholds and trims the name', () => {
    expect(() => accountSchema.parse(cashDto({ minBalanceCents: 10.25 }))).toThrow();
    expect(() => accountSchema.parse(cashDto({ maxBalanceCents: 99.9 }))).toThrow();
    expect(accountSchema.parse(cashDto({ name: '  Espèces ' })).name).toBe('Espèces');
  });

  it('normalizes hex color to uppercase', () => {
    expect(accountSchema.parse(cashDto({ color: '#42a5f5' })).color).toBe('#42A5F5');
  });
});

describe('createAccountBodySchema', () => {
  it('accepts a cash payload and defaults currency, color and excludeFromStats', () => {
    const parsed = createAccountBodySchema.parse({ kind: 'cash', name: '  Coffre ' });
    expect(parsed).toEqual({
      kind: 'cash',
      name: 'Coffre',
      currency: 'EUR',
      color: DEFAULT_ACCOUNT_COLOR,
      excludeFromStats: false,
    });
  });

  it('accepts a bank payload with trimmed iban and institution', () => {
    const parsed = createAccountBodySchema.parse({
      kind: 'bank',
      name: 'Livret',
      color: ACCOUNT_COLORS[1],
      iban: '  FR7630001007941234567890185 ',
      institutionName: '  Banque Postale ',
      minBalanceCents: 0,
      maxBalanceCents: 100_00,
    });
    expect(parsed.kind).toBe('bank');
    if (parsed.kind !== 'bank') throw new Error('expected bank');
    expect(parsed.iban).toBe('FR7630001007941234567890185');
    expect(parsed.institutionName).toBe('Banque Postale');
    expect(parsed.minBalanceCents).toBe(0);
    expect(parsed.maxBalanceCents).toBe(100_00);
    expect(parsed).not.toHaveProperty('balanceCents');
  });

  it('rejects cash bodies that include bank-only fields', () => {
    expect(() =>
      createAccountBodySchema.parse({ kind: 'cash', name: 'Espèces', iban: 'FR76' }),
    ).toThrow();
  });

  it('rejects unknown kinds, floats, oversized iban and inverted thresholds', () => {
    expect(() => createAccountBodySchema.parse({ kind: 'wallet', name: 'X' })).toThrow();
    expect(() =>
      createAccountBodySchema.parse({ kind: 'cash', name: 'X', minBalanceCents: 1.5 }),
    ).toThrow();
    expect(() =>
      createAccountBodySchema.parse({
        kind: 'bank',
        name: 'X',
        iban: 'FR'.padEnd(35, '0'),
      }),
    ).toThrow();
    expect(() =>
      createAccountBodySchema.parse({
        kind: 'cash',
        name: 'X',
        minBalanceCents: 100,
        maxBalanceCents: 100,
      }),
    ).toThrow();
    expect(() =>
      createAccountBodySchema.parse({
        kind: 'cash',
        name: 'X',
        minBalanceCents: 200,
        maxBalanceCents: 100,
      }),
    ).toThrow();
  });
});

describe('updateAccountBodySchema', () => {
  it('accepts a partial update and trims name', () => {
    expect(updateAccountBodySchema.parse({ name: '  Vacances ' })).toEqual({ name: 'Vacances' });
    expect(updateAccountBodySchema.parse({})).toEqual({});
  });

  it('rejects kind mutation, floats and inverted thresholds', () => {
    expect(() => updateAccountBodySchema.parse({ kind: 'bank' })).toThrow();
    expect(() => updateAccountBodySchema.parse({ excludeFromStats: true, kind: 'cash' })).toThrow();
    expect(() => updateAccountBodySchema.parse({ minBalanceCents: 3.14 })).toThrow();
    expect(() =>
      updateAccountBodySchema.parse({ minBalanceCents: 500, maxBalanceCents: 100 }),
    ).toThrow();
  });

  it('allows clearing and setting bank details', () => {
    expect(updateAccountBodySchema.parse({ iban: null, institutionName: '  CIC ' })).toEqual({
      iban: null,
      institutionName: 'CIC',
    });
  });
});

describe('archiveAccountBodySchema', () => {
  it('accepts a boolean archived flag', () => {
    expect(archiveAccountBodySchema.parse({ archived: true })).toEqual({ archived: true });
    expect(archiveAccountBodySchema.parse({ archived: false })).toEqual({ archived: false });
  });

  it('rejects missing, coerced or extra fields', () => {
    expect(() => archiveAccountBodySchema.parse({})).toThrow();
    expect(() => archiveAccountBodySchema.parse({ archived: 'true' })).toThrow();
    expect(() => archiveAccountBodySchema.parse({ archived: true, extra: 1 })).toThrow();
  });
});

describe('listAccountsQuerySchema', () => {
  it('treats includeArchived=true as a boolean flag and defaults to false', () => {
    expect(listAccountsQuerySchema.parse({ includeArchived: 'true' })).toEqual({
      includeArchived: true,
    });
    expect(listAccountsQuerySchema.parse({ includeArchived: 'false' })).toEqual({
      includeArchived: false,
    });
    expect(listAccountsQuerySchema.parse({})).toEqual({ includeArchived: false });
  });
});

describe('accountsResponseSchema', () => {
  it('wraps a list of cash and bank accounts', () => {
    const parsed = accountsResponseSchema.parse({
      accounts: [cashDto(), bankDto()],
    });
    expect(parsed.accounts).toHaveLength(2);
    expect(parsed.accounts[0]?.kind).toBe('cash');
    expect(parsed.accounts[1]?.kind).toBe('bank');
    expect(parsed.accounts.every((account) => Number.isInteger(account.balanceCents))).toBe(true);
  });

  it('accepts an empty list', () => {
    expect(accountsResponseSchema.parse({ accounts: [] })).toEqual({ accounts: [] });
  });
});
