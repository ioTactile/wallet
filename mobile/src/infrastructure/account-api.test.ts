import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { DEFAULT_ACCOUNT_COLOR } from '@wallet/shared';

import { AccountApiError, AuthApiError } from '@/domain/ports';

import { InMemorySessionVault, makeBankAccount, makeCashAccount } from '@/application/fakes';

import { HttpAccountApi } from './account-api';

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

describe('HttpAccountApi', () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  function authStub(
    refresh: () => Promise<typeof SESSION> = async () => {
      throw new AuthApiError('invalid_refresh_token');
    },
  ) {
    return { refresh: jest.fn(refresh) };
  }

  async function setup(
    response: { ok: boolean; status: number; json: () => Promise<unknown> },
    auth = authStub(),
  ) {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test/';
    const fetchMock = jest.fn(async () => response);
    global.fetch = fetchMock as typeof fetch;
    const sessions = new InMemorySessionVault();
    await sessions.save(SESSION);
    return { api: new HttpAccountApi(sessions, auth), fetchMock, sessions, auth };
  }

  it('lists accounts with a Bearer token and validates the payload', async () => {
    const cash = makeCashAccount();
    const { api, fetchMock } = await setup(jsonResponse(200, { accounts: [cash] }));

    await expect(api.list()).resolves.toEqual([cash]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/accounts',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('asks for archived accounts via the includeArchived query', async () => {
    const { api, fetchMock } = await setup(jsonResponse(200, { accounts: [] }));
    await api.list({ includeArchived: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/accounts?includeArchived=true',
      expect.anything(),
    );
  });

  it('loads one account', async () => {
    const cash = makeCashAccount();
    const { api, fetchMock } = await setup(jsonResponse(200, cash));
    await expect(api.getById(cash.id)).resolves.toEqual(cash);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.test/accounts/${cash.id}`,
      expect.anything(),
    );
  });

  it('creates a cash account', async () => {
    const created = makeCashAccount({ name: 'Coffre' });
    const { api, fetchMock } = await setup(jsonResponse(201, created));
    await expect(
      api.create({
        kind: 'cash',
        name: 'Coffre',
        currency: 'EUR',
        color: DEFAULT_ACCOUNT_COLOR,
        excludeFromStats: false,
      }),
    ).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/accounts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          kind: 'cash',
          name: 'Coffre',
          currency: 'EUR',
          color: DEFAULT_ACCOUNT_COLOR,
          excludeFromStats: false,
        }),
      }),
    );
  });

  it('patches, archives and deletes an account', async () => {
    const cash = makeCashAccount({ name: 'Vacances' });
    const { api, fetchMock } = await setup(jsonResponse(200, cash));
    await api.update(cash.id, { name: 'Vacances' });
    await api.archive(cash.id, true);
    await api.archive(cash.id, false);
    fetchMock.mockImplementationOnce(async () => jsonResponse(204, null));
    await api.delete(cash.id);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `http://api.test/accounts/${cash.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://api.test/accounts/${cash.id}/archive`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ archived: true }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `http://api.test/accounts/${cash.id}/archive`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ archived: false }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `http://api.test/accounts/${cash.id}`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.not.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('maps API errors and missing sessions', async () => {
    const cash = makeCashAccount();
    const { api } = await setup(jsonResponse(409, { error: 'cannot_delete_last_cash_account' }));
    await expect(api.delete(cash.id)).rejects.toMatchObject({
      code: 'cannot_delete_last_cash_account',
    });

    const { sessions } = await setup(jsonResponse(200, { accounts: [] }));
    await sessions.clear();
    await expect(new HttpAccountApi(sessions, authStub()).list()).rejects.toBeInstanceOf(
      AccountApiError,
    );
  });

  it('refreshes the session and retries once after a 401', async () => {
    const cash = makeCashAccount();
    const auth = authStub(async () => ({ ...SESSION, accessToken: 'next-access' }));
    const { api, fetchMock, sessions } = await setup(
      jsonResponse(401, { error: 'unauthorized' }),
      auth,
    );
    fetchMock
      .mockImplementationOnce(async () => jsonResponse(401, { error: 'unauthorized' }))
      .mockImplementationOnce(async () => jsonResponse(200, { accounts: [cash] }));

    await expect(api.list()).resolves.toEqual([cash]);
    expect(auth.refresh).toHaveBeenCalledWith('refresh-token');
    expect(await sessions.get()).toMatchObject({ accessToken: 'next-access' });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://api.test/accounts',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer next-access' }),
      }),
    );
  });

  it('shares a single refresh across parallel 401s', async () => {
    const cash = makeCashAccount();
    const auth = authStub(async () => {
      await Promise.resolve();
      return { ...SESSION, accessToken: 'shared-access' };
    });
    const { api, fetchMock } = await setup(jsonResponse(401, { error: 'unauthorized' }), auth);
    fetchMock.mockImplementation(async (_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      if (headers.Authorization === 'Bearer shared-access') {
        return jsonResponse(200, { accounts: [cash] });
      }
      return jsonResponse(401, { error: 'unauthorized' });
    });

    const [first, second] = await Promise.all([api.list(), api.list()]);
    expect(first).toEqual([cash]);
    expect(second).toEqual([cash]);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('rejects a response that does not match accountSchema', async () => {
    const { api } = await setup(jsonResponse(200, { accounts: [{ kind: 'cash' }] }));
    await expect(api.list()).rejects.toThrow();
  });

  it('round-trips a bank account with IBAN', async () => {
    const bank = makeBankAccount();
    const { api } = await setup(jsonResponse(200, bank));
    await expect(api.getById(bank.id)).resolves.toEqual(bank);
  });
});
