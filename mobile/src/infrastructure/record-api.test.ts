import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { AuthApiError, RecordApiError } from '@/domain/errors';
import { InMemorySessionVault, makeExpenseRecord } from '@/application/fakes';

import { HttpRecordApi } from './record-api';

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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('HttpRecordApi', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  async function setup(response: Response) {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test/';
    const fetchMock = jest.fn<typeof fetch>(async () => response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const sessions = new InMemorySessionVault();
    await sessions.save(SESSION);
    return {
      api: new HttpRecordApi(sessions, {
        refresh: jest.fn(async () => {
          throw new AuthApiError('invalid_refresh_token');
        }),
      }),
      fetchMock,
    };
  }

  it('lists records for a period with a Bearer token', async () => {
    const expense = makeExpenseRecord();
    const { api, fetchMock } = await setup(
      jsonResponse(200, {
        records: [expense],
        openingBalanceCents: 0,
        periodNetCents: -199,
      }),
    );

    await expect(
      api.list({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.000Z' }),
    ).resolves.toMatchObject({ periodNetCents: -199 });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/records?from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-30T23%3A59%3A59.000Z',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('creates an expense and maps API errors', async () => {
    const { api, fetchMock } = await setup(jsonResponse(400, { error: 'manual_record_on_bank' }));
    await expect(
      api.create(
        {
          kind: 'expense',
          accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          categoryId: 'food_drinks',
          amountCents: 100,
        },
        'idem-key-1',
      ),
    ).rejects.toBeInstanceOf(RecordApiError);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/records',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'idem-key-1' }),
      }),
    );
  });
});
