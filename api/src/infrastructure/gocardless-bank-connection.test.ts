import { describe, expect, it } from 'vitest';

import {
  BOURSORAMA_INSTITUTION_ID,
  GoCardlessBankConnection,
} from './gocardless-bank-connection.js';

const SECRET = { secretId: 'secret-id', secretKey: 'secret-key' };
const PUBLIC_API = 'http://127.0.0.1:3000';
const ACCOUNT_ID = '065da497-e6af-4950-88ed-2edbc0577d20';
const REQUISITION_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

type Route = {
  method: string;
  path: string;
  handler: (url: URL, init: RequestInit) => Response | Promise<Response>;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createFetchMock(routes: Route[]) {
  const calls: Array<{ method: string; url: URL; body: unknown; authorization: string | null }> =
    [];
  const fetchImpl: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({
      method,
      url,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init.headers).get('authorization'),
    });
    const route = routes.find(
      (candidate) => candidate.method === method && candidate.path === url.pathname,
    );
    if (!route) {
      return new Response(`missing ${method} ${url.pathname}`, { status: 404 });
    }
    return route.handler(url, init);
  };
  return { fetchImpl, calls };
}

function tokenRoute(): Route {
  return {
    method: 'POST',
    path: '/api/v2/token/new/',
    handler: () => json({ access: 'access-token', access_expires: 86400, refresh: 'refresh' }),
  };
}

function bank(fetchImpl: typeof fetch, sleep: (ms: number) => Promise<void> = async () => {}) {
  return new GoCardlessBankConnection({
    publicApiUrl: PUBLIC_API,
    ...SECRET,
    fetch: fetchImpl,
    sleep,
  });
}

describe('GoCardlessBankConnection', () => {
  it('exposes the gocardless provider and starts a BoursoBank AIS consent', async () => {
    const { fetchImpl, calls } = createFetchMock([
      tokenRoute(),
      {
        method: 'POST',
        path: '/api/v2/agreements/enduser/',
        handler: () => json({ id: 'agreement-1' }),
      },
      {
        method: 'POST',
        path: '/api/v2/requisitions/',
        handler: () =>
          json({
            id: REQUISITION_ID,
            link: 'https://ob.gocardless.com/psd2/start/req/BOURSORAMA_BOUSFRPPXXX',
          }),
      },
    ]);
    const connection = bank(fetchImpl);
    expect(connection.provider).toBe('gocardless');

    const consent = await connection.startConsent({
      userId: 'user-1',
      redirectUri: 'mobile://bank/callback',
      state: 'link-1',
    });
    expect(consent.providerConnectionId).toBe(REQUISITION_ID);
    expect(consent.authorizationUrl).toContain('ob.gocardless.com');

    const agreement = calls.find((call) => call.url.pathname === '/api/v2/agreements/enduser/');
    expect(agreement?.body).toMatchObject({
      institution_id: BOURSORAMA_INSTITUTION_ID,
      access_scope: ['balances', 'details', 'transactions'],
    });
    const requisition = calls.find((call) => call.url.pathname === '/api/v2/requisitions/');
    expect(requisition?.authorization).toBe('Bearer access-token');
    expect(requisition?.body).toMatchObject({
      institution_id: BOURSORAMA_INSTITUTION_ID,
      reference: 'user-1:link-1',
      agreement: 'agreement-1',
      user_language: 'FR',
    });
    const redirect = new URL(String((requisition?.body as { redirect: string }).redirect));
    expect(redirect.origin).toBe(PUBLIC_API);
    expect(redirect.pathname).toBe('/bank/gocardless/return');
    expect(redirect.searchParams.get('connectionId')).toBe('link-1');
    expect(redirect.searchParams.has('redirect_uri')).toBe(false);
  });

  it('lists EUR accounts after retrying AccountProcessing and maps transactions', async () => {
    let detailsCalls = 0;
    const { fetchImpl, calls } = createFetchMock([
      tokenRoute(),
      {
        method: 'GET',
        path: `/api/v2/requisitions/${REQUISITION_ID}/`,
        handler: () =>
          json({ id: REQUISITION_ID, link: 'https://ob.gocardless.com', accounts: [ACCOUNT_ID] }),
      },
      {
        method: 'GET',
        path: `/api/v2/accounts/${ACCOUNT_ID}/details/`,
        handler: () => {
          detailsCalls += 1;
          if (detailsCalls === 1) {
            return json({ summary: 'AccountProcessing' }, 409);
          }
          return json({
            account: {
              iban: 'FR7630001007941234567890185',
              currency: 'EUR',
              name: 'Compte courant',
            },
          });
        },
      },
      {
        method: 'GET',
        path: `/api/v2/accounts/${ACCOUNT_ID}/transactions/`,
        handler: (url) => {
          expect(url.searchParams.get('date_from')).toBe('2026-09-18');
          return json({
            transactions: {
              booked: [
                {
                  transactionId: 'tx-1',
                  transactionAmount: { currency: 'EUR', amount: '-10.99' },
                  bookingDate: '2026-09-10',
                  remittanceInformationUnstructured: 'Spotify',
                },
              ],
              pending: [],
            },
          });
        },
      },
      {
        method: 'DELETE',
        path: `/api/v2/requisitions/${REQUISITION_ID}/`,
        handler: () => new Response(null, { status: 204 }),
      },
    ]);
    const slept: number[] = [];
    const connection = bank(fetchImpl, async (ms) => {
      slept.push(ms);
    });

    const accounts = await connection.listAccounts(REQUISITION_ID);
    expect(accounts).toEqual([
      {
        externalId: ACCOUNT_ID,
        name: 'Compte courant',
        iban: 'FR7630001007941234567890185',
        institutionName: 'BoursoBank',
        currency: 'EUR',
      },
    ]);
    expect(detailsCalls).toBe(2);
    expect(slept).toEqual([200]);

    const transactions = await connection.listTransactions(REQUISITION_ID, ACCOUNT_ID, {
      from: new Date('2026-09-20T10:00:00.000Z'),
    });
    expect(transactions).toEqual([
      {
        externalId: 'tx-1',
        accountExternalId: ACCOUNT_ID,
        signedAmountCents: -10_99,
        bookedAt: new Date('2026-09-10T00:00:00.000Z'),
        label: 'Spotify',
        pending: false,
      },
    ]);

    await connection.revoke(REQUISITION_ID);
    expect(calls.filter((call) => call.url.pathname === '/api/v2/token/new/')).toHaveLength(1);
    expect(
      calls.some(
        (call) =>
          call.method === 'DELETE' &&
          call.url.pathname === `/api/v2/requisitions/${REQUISITION_ID}/`,
      ),
    ).toBe(true);
  });

  it('omits date_from on the first full transaction pull', async () => {
    const { fetchImpl, calls } = createFetchMock([
      tokenRoute(),
      {
        method: 'GET',
        path: `/api/v2/accounts/${ACCOUNT_ID}/transactions/`,
        handler: () => json({ transactions: { booked: [], pending: [] } }),
      },
    ]);
    await bank(fetchImpl).listTransactions(REQUISITION_ID, ACCOUNT_ID);
    const listed = calls.find((call) => call.url.pathname.includes('/transactions/'));
    expect(listed?.url.searchParams.get('date_from')).toBeNull();
  });
});
