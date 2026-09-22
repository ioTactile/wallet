import { describe, expect, it } from 'vitest';

import { BankLink } from '../domain/bank-link.js';
import { BankLinkNotFound } from '../domain/errors.js';
import { FixedClock, InMemoryBankLinkRepository } from './fakes.js';
import { GetBankLinkRedirect } from './get-bank-link-redirect.js';

describe('GetBankLinkRedirect', () => {
  it('returns id and redirectUri for a pending link', async () => {
    const links = new InMemoryBankLinkRepository();
    const clock = new FixedClock(new Date('2026-09-21T10:00:00.000Z'));
    await links.save(
      BankLink.start({
        id: 'link-1',
        userId: 'user-1',
        provider: 'sandbox',
        providerConnectionId: 'sandbox-1',
        redirectUri: 'mobile://bank/callback',
        now: clock.now(),
      }),
    );

    const result = await new GetBankLinkRedirect(links).execute('link-1');

    expect(result).toEqual({ id: 'link-1', redirectUri: 'mobile://bank/callback' });
  });

  it('rejects an unknown connection', async () => {
    const links = new InMemoryBankLinkRepository();
    await expect(new GetBankLinkRedirect(links).execute('missing')).rejects.toBeInstanceOf(
      BankLinkNotFound,
    );
  });

  it('rejects a revoked connection', async () => {
    const links = new InMemoryBankLinkRepository();
    const clock = new FixedClock(new Date('2026-09-21T10:00:00.000Z'));
    const link = BankLink.start({
      id: 'link-1',
      userId: 'user-1',
      provider: 'sandbox',
      providerConnectionId: 'sandbox-1',
      redirectUri: 'mobile://bank/callback',
      now: clock.now(),
    }).revoke(clock.now());
    await links.save(link);

    await expect(new GetBankLinkRedirect(links).execute('link-1')).rejects.toBeInstanceOf(
      BankLinkNotFound,
    );
  });
});
