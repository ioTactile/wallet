import { describe, expect, it } from 'vitest';

import {
  ENABLEBANKING_ASPSP_NAME,
  EnableBankingBankConnection,
} from './enablebanking-bank-connection.js';
import { encodeEnableBankingState } from './enablebanking-mapper.js';

const PUBLIC_API = 'http://127.0.0.1:3000';
const ACCOUNT_ID = '07cc67f4-45d6-494b-adac-09b5cbc7e2b5';
const SESSION_ID = '4604aa90-f8a8-4180-92d8-0c3270846f0a';
const AUTH_ID = '73100c65-c54d-46a1-87d1-aa3effde435a';

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

function bank(fetchImpl: typeof fetch) {
  return new EnableBankingBankConnection({
    publicApiUrl: PUBLIC_API,
    applicationId: 'app-1',
    privateKeyPem: 'unused',
    stateSecret: 'test-secret-at-least-32-characters!',
    fetch: fetchImpl,
    signJwt: () => 'test-jwt',
    now: () => new Date('2026-09-21T10:00:00.000Z'),
  });
}

describe('EnableBankingBankConnection', () => {
  it('starts a BoursoBank AIS consent with encoded state', async () => {
    const { fetchImpl, calls } = createFetchMock([
      {
        method: 'POST',
        path: '/auth',
        handler: () =>
          json({
            url: 'https://auth.enablebanking.com/ais/start?sessionid=auth',
            authorization_id: AUTH_ID,
          }),
      },
    ]);
    const connection = bank(fetchImpl);
    expect(connection.provider).toBe('enablebanking');
    const consent = await connection.startConsent({
      userId: 'user-1',
      redirectUri: 'mobile://bank/callback',
      state: 'link-1',
    });
    expect(consent.providerConnectionId).toBe(AUTH_ID);
    expect(consent.authorizationUrl).toContain('auth.enablebanking.com');
    const started = calls[0];
    expect(started?.authorization).toBe('Bearer test-jwt');
    expect(started?.body).toMatchObject({
      aspsp: { name: ENABLEBANKING_ASPSP_NAME, country: 'FR' },
      psu_type: 'personal',
      language: 'fr',
      redirect_url: `${PUBLIC_API}/bank/enablebanking/return`,
    });
    expect(ENABLEBANKING_ASPSP_NAME).toBe('Boursorama Banque');
    expect((started?.body as { state: string }).state).toBe(
      encodeEnableBankingState({ connectionId: 'link-1' }, 'test-secret-at-least-32-characters!'),
    );
  });

  it('includes Enable Banking error body when /auth fails', async () => {
    const { fetchImpl } = createFetchMock([
      {
        method: 'POST',
        path: '/auth',
        handler: () =>
          json(
            { code: 422, message: 'Wrong ASPSP name provided', error: 'WRONG_ASPSP_PROVIDED' },
            422,
          ),
      },
    ]);
    await expect(
      bank(fetchImpl).startConsent({
        userId: 'user-1',
        redirectUri: 'mobile://bank/callback',
        state: 'link-1',
      }),
    ).rejects.toThrow(/Enable Banking \/auth failed: 422.*WRONG_ASPSP_PROVIDED/);
  });

  it('exchanges the authorization code, lists accounts and paginates transactions', async () => {
    const { fetchImpl, calls } = createFetchMock([
      {
        method: 'POST',
        path: '/sessions',
        handler: () => json({ session_id: SESSION_ID, accounts: [{ uid: ACCOUNT_ID }] }),
      },
      {
        method: 'GET',
        path: `/sessions/${SESSION_ID}`,
        handler: () => json({ accounts: [ACCOUNT_ID], aspsp: { name: 'BoursoBank' } }),
      },
      {
        method: 'GET',
        path: `/accounts/${ACCOUNT_ID}/details`,
        handler: () =>
          json({
            uid: ACCOUNT_ID,
            details: 'Compte courant',
            currency: 'EUR',
            account_id: { iban: 'FR7630001007941234567890185' },
          }),
      },
      {
        method: 'GET',
        path: `/accounts/${ACCOUNT_ID}/transactions`,
        handler: (url) => {
          if (!url.searchParams.get('continuation_key')) {
            expect(url.searchParams.get('date_from')).toBe('2026-09-18');
            return json({
              continuation_key: 'page-2',
              transactions: [
                {
                  transaction_id: 'tx-1',
                  transaction_amount: { currency: 'EUR', amount: '10.00' },
                  credit_debit_indicator: 'DBIT',
                  status: 'BOOK',
                  booking_date: '2026-09-10',
                  remittance_information: ['Spotify'],
                },
              ],
            });
          }
          return json({
            transactions: [
              {
                transaction_id: 'tx-2',
                transaction_amount: { currency: 'EUR', amount: '5.00' },
                credit_debit_indicator: 'CRDT',
                status: 'BOOK',
                booking_date: '2026-09-11',
                remittance_information: ['Remboursement'],
              },
            ],
          });
        },
      },
      {
        method: 'DELETE',
        path: `/sessions/${SESSION_ID}`,
        handler: () => new Response(null, { status: 204 }),
      },
    ]);
    const connection = bank(fetchImpl);
    expect(
      await connection.finalizeConsent({ code: 'auth-code', providerConnectionId: AUTH_ID }),
    ).toBe(SESSION_ID);
    expect(calls.find((call) => call.url.pathname === '/sessions')?.body).toEqual({
      code: 'auth-code',
      authorization_id: AUTH_ID,
    });
    const accounts = await connection.listAccounts(SESSION_ID);
    expect(accounts).toEqual([
      {
        externalId: ACCOUNT_ID,
        name: 'Compte courant',
        iban: 'FR7630001007941234567890185',
        institutionName: 'BoursoBank',
        currency: 'EUR',
      },
    ]);
    const transactions = await connection.listTransactions(SESSION_ID, ACCOUNT_ID, {
      from: new Date('2026-09-20T10:00:00.000Z'),
    });
    expect(transactions.map((transaction) => transaction.externalId)).toEqual(['tx-1', 'tx-2']);
    expect(transactions[0]?.signedAmountCents).toBe(-10_00);
    await connection.revoke(SESSION_ID);
    expect(
      calls.some(
        (call) => call.method === 'DELETE' && call.url.pathname === `/sessions/${SESSION_ID}`,
      ),
    ).toBe(true);
  });
});
