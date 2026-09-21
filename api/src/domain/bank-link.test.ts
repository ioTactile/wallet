import { describe, expect, it } from 'vitest';

import { BankLink } from './bank-link.js';
import { InvalidBankLink } from './errors.js';

const NOW = new Date('2026-09-20T10:00:00.000Z');

function pending() {
  return BankLink.start({
    id: 'link-1',
    userId: 'user-1',
    provider: 'sandbox',
    providerConnectionId: 'provider-1',
    now: NOW,
  });
}

describe('BankLink', () => {
  it('starts pending without a last sync', () => {
    const link = pending();
    expect(link.status).toBe('pending');
    expect(link.isActive).toBe(false);
    expect(link.lastSyncedAt).toBeNull();
    expect(link.provider).toBe('sandbox');
  });

  it('activates once and is idempotent afterwards', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    const active = pending().activate(later);
    expect(active.status).toBe('active');
    expect(active.isActive).toBe(true);
    expect(active.updatedAt).toEqual(later);
    expect(active.activate(new Date('2026-09-20T12:00:00.000Z'))).toBe(active);
  });

  it('marks lastSyncedAt only when active', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    expect(() => pending().markSynced(later)).toThrow(InvalidBankLink);
    const synced = pending().activate(later).markSynced(later);
    expect(synced.lastSyncedAt).toEqual(later);
  });

  it('revokes an active link and refuses to activate it again', () => {
    const later = new Date('2026-09-20T11:00:00.000Z');
    const revoked = pending().activate(later).revoke(later);
    expect(revoked.status).toBe('revoked');
    expect(revoked.revoke(later).status).toBe('revoked');
    expect(() => revoked.activate(later)).toThrow(InvalidBankLink);
  });

  it('rejects empty ids', () => {
    expect(() =>
      BankLink.start({
        id: '  ',
        userId: 'user-1',
        provider: 'sandbox',
        providerConnectionId: 'provider-1',
        now: NOW,
      }),
    ).toThrow(InvalidBankLink);
  });
});
