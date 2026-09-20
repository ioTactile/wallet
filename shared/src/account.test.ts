import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_COLORS,
  ACCOUNT_KINDS,
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_CURRENCY,
  DEFAULT_CASH_ACCOUNT_ID,
  canSyncFromBank,
  canTransferBetween,
  isHexColor,
  isManualLedger,
} from './account.js';
import { ACCOUNT_KIND_LABELS, accountKindLabel } from './account-labels.js';

describe('accounts', () => {
  it('supports several accounts of kind cash or bank', () => {
    expect(ACCOUNT_KINDS).toEqual(['cash', 'bank']);
  });

  it('exposes a short hex palette and EUR as the only V1 currency', () => {
    expect(DEFAULT_ACCOUNT_CURRENCY).toBe('EUR');
    expect(ACCOUNT_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(ACCOUNT_COLORS.length).toBeLessThanOrEqual(12);
    expect(ACCOUNT_COLORS.every(isHexColor)).toBe(true);
    expect(ACCOUNT_COLORS).toContain(DEFAULT_ACCOUNT_COLOR);
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('#42A5F5')).toBe(true);
  });

  it('keeps DEFAULT_CASH_ACCOUNT_ID as a legacy token, not a persisted UUID', () => {
    expect(DEFAULT_CASH_ACCOUNT_ID).toBe('cash');
    expect(DEFAULT_CASH_ACCOUNT_ID).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('treats cash as a manual ledger and bank as AIS-only sync', () => {
    expect(isManualLedger('cash')).toBe(true);
    expect(canSyncFromBank('cash')).toBe(false);
    expect(isManualLedger('bank')).toBe(false);
    expect(canSyncFromBank('bank')).toBe(true);
  });

  it('allows a PFM transfer between two distinct accounts, including cash', () => {
    expect(canTransferBetween('cash', 'bourso')).toBe(true);
    expect(canTransferBetween('bourso', 'ca-nord-est')).toBe(true);
    expect(canTransferBetween('cash', 'cash')).toBe(false);
  });

  it('labels cash as Espèces by default in French', () => {
    expect(accountKindLabel('cash', 'fr')).toBe('Espèces');
    expect(accountKindLabel('cash', 'en')).toBe('Cash');
    expect(ACCOUNT_KIND_LABELS.fr.bank).toBe('Banque');
  });
});
