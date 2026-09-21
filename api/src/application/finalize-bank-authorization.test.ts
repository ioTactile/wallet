import { describe, expect, it } from 'vitest';

import { BankLink } from '../domain/bank-link.js';
import { BankLinkNotFound } from '../domain/errors.js';
import { FakeBankConnection } from './fake-bank-connection.js';
import { FinalizeBankAuthorization } from './finalize-bank-authorization.js';
import { FixedClock, InMemoryBankLinkRepository } from './fakes.js';

describe('FinalizeBankAuthorization', () => {
  it('replaces the pending provider id with the session returned by the adapter', async () => {
    const links = new InMemoryBankLinkRepository();
    const clock = new FixedClock(new Date('2026-09-21T10:00:00.000Z'));
    const bank = new FakeBankConnection('http://127.0.0.1:3000');
    bank.finalizeConsent = async () => 'session-1';
    const link = BankLink.start({
      id: 'link-1',
      userId: 'user-1',
      provider: 'enablebanking',
      providerConnectionId: 'auth-1',
      now: clock.now(),
    });
    await links.save(link);
    await new FinalizeBankAuthorization(links, bank, clock).execute('link-1', 'auth-code');
    expect((await links.getById('link-1'))?.providerConnectionId).toBe('session-1');
  });

  it('rejects an unknown connection', async () => {
    const links = new InMemoryBankLinkRepository();
    const clock = new FixedClock(new Date('2026-09-21T10:00:00.000Z'));
    const bank = new FakeBankConnection('http://127.0.0.1:3000');
    await expect(
      new FinalizeBankAuthorization(links, bank, clock).execute('missing', 'code'),
    ).rejects.toBeInstanceOf(BankLinkNotFound);
  });
});
