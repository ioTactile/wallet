import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { BankApiError } from '@/domain/ports';
import { InMemorySessionVault, makeBankAccount } from '@/application/fakes';

import { HttpBankApi } from './bank-api';

const SESSION = {
  user: {
    id: '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d',
    email: 'jordan@example.com',
    firstName: 'Jordan',
    lastName: 'Dupont',
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('HttpBankApi', () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  async function setup(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test/';
    const fetchMock = jest.fn(async () => response);
    global.fetch = fetchMock as typeof fetch;
    const sessions = new InMemorySessionVault();
    await sessions.save(SESSION);
    return {
      api: new HttpBankApi(sessions, {
        refresh: jest.fn(async () => {
          throw new Error('unused');
        }),
      }),
      fetchMock,
    };
  }

  it('starts a bank connection with the redirect URI', async () => {
    const { api, fetchMock } = await setup(
      jsonResponse(201, {
        id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
        authorizationUrl: 'http://127.0.0.1:3000/bank/sandbox/authorize?connectionId=x',
      }),
    );
    await expect(api.start('mobile://bank/callback')).resolves.toMatchObject({
      id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/bank/connections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ redirectUri: 'mobile://bank/callback' }),
      }),
    );
  });

  it('completes a connection and returns bank accounts', async () => {
    const bank = makeBankAccount({ lastSyncedAt: '2026-09-20T10:00:00.000Z' });
    const { api } = await setup(jsonResponse(200, { accounts: [bank] }));
    await expect(api.complete(bank.id)).resolves.toEqual([bank]);
  });

  it('syncs and disconnects a bank account', async () => {
    const bank = makeBankAccount({ archivedAt: '2026-09-20T10:00:00.000Z' });
    const { api, fetchMock } = await setup(jsonResponse(200, { importedCount: 2 }));
    await expect(api.sync(bank.id)).resolves.toEqual({ importedCount: 2 });
    fetchMock.mockImplementationOnce(async () => jsonResponse(200, bank));
    await expect(api.disconnect(bank.id)).resolves.toEqual(bank);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://api.test/accounts/${bank.id}/sync`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://api.test/accounts/${bank.id}/disconnect`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('maps a network failure to network_error', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test/';
    global.fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    const sessions = new InMemorySessionVault();
    await sessions.save(SESSION);
    const api = new HttpBankApi(sessions, {
      refresh: jest.fn(async () => {
        throw new Error('unused');
      }),
    });
    await expect(api.start('mobile://bank/callback')).rejects.toBeInstanceOf(BankApiError);
    await expect(api.start('mobile://bank/callback')).rejects.toMatchObject({
      code: 'network_error',
    });
  });
});
