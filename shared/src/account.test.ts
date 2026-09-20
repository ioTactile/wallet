import { describe, expect, it } from 'vitest';

import { ACCOUNT_KINDS, canSyncFromBank, canTransferBetween, isManualLedger } from './account.js';
import { ACCOUNT_KIND_LABELS, accountKindLabel } from './account-labels.js';

describe('accounts', () => {
  it('supports several accounts of kind cash or bank', () => {
    expect(ACCOUNT_KINDS).toEqual(['cash', 'bank']);
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
