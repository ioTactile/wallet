import { describe, expect, it } from 'vitest';

import {
  FakeBankConnection,
  SANDBOX_CHECKING_EXTERNAL_ID,
  SANDBOX_TRANSACTIONS,
} from './fake-bank-connection.js';

describe('FakeBankConnection', () => {
  it('builds a sandbox authorize URL that carries the wallet connection id', async () => {
    const bank = new FakeBankConnection('http://127.0.0.1:3000');
    const consent = await bank.startConsent({
      userId: 'user-1',
      redirectUri: 'mobile://bank/callback',
      state: 'link-1',
    });
    expect(consent.providerConnectionId).toBe('sandbox:link-1');
    const url = new URL(consent.authorizationUrl);
    expect(url.origin).toBe('http://127.0.0.1:3000');
    expect(url.pathname).toBe('/bank/sandbox/authorize');
    expect(url.searchParams.get('connectionId')).toBe('link-1');
    expect(url.searchParams.has('redirect_uri')).toBe(false);
    expect(bank.provider).toBe('sandbox');
  });

  it('exposes the demo checking account and eight transactions including one pending', async () => {
    const bank = new FakeBankConnection('http://127.0.0.1:3000');
    const consent = await bank.startConsent({
      userId: 'user-1',
      redirectUri: 'mobile://bank/callback',
      state: 'link-1',
    });
    const accounts = await bank.listAccounts(consent.providerConnectionId);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.externalId).toBe(SANDBOX_CHECKING_EXTERNAL_ID);
    expect(accounts[0]?.institutionName).toBe('Banque démo');

    const transactions = await bank.listTransactions(
      consent.providerConnectionId,
      SANDBOX_CHECKING_EXTERNAL_ID,
    );
    expect(transactions).toHaveLength(8);
    expect(transactions).toEqual([...SANDBOX_TRANSACTIONS]);
    expect(transactions.filter((transaction) => transaction.pending)).toHaveLength(1);
  });
});
