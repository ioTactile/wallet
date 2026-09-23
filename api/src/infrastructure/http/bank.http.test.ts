import {
  accountSchema,
  accountsResponseSchema,
  bankConnectionOptionsSchema,
  recordSchema,
  recordsResponseSchema,
  startBankConnectionResponseSchema,
  syncBankAccountResponseSchema,
} from '@wallet/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { createServer, registerApi, type ApiDeps } from '../../app.js';
import { ArchiveAccount } from '../../application/archive-account.js';
import { CompleteBankConnection } from '../../application/complete-bank-connection.js';
import { CreateAccount } from '../../application/create-account.js';
import { CreateRecord } from '../../application/create-record.js';
import { DeleteAccount } from '../../application/delete-account.js';
import { DisconnectBankAccount } from '../../application/disconnect-bank-account.js';
import { EnsureDefaultCashAccount } from '../../application/ensure-default-cash-account.js';
import { FakeBankConnection } from '../../application/fake-bank-connection.js';
import {
  FakeHasher,
  FixedClock,
  InMemoryAccountRepository,
  InMemoryBankLinkRepository,
  InMemoryRecordRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../../application/fakes.js';
import { FinalizeBankAuthorization } from '../../application/finalize-bank-authorization.js';
import { GetAccount } from '../../application/get-account.js';
import { GetAccountBalances } from '../../application/get-account-balances.js';
import { GetBankConnectionOptions } from '../../application/get-bank-connection-options.js';
import { GetBankLinkRedirect } from '../../application/get-bank-link-redirect.js';
import { GetCurrentUser } from '../../application/get-current-user.js';
import { ListAccounts } from '../../application/list-accounts.js';
import { DeleteRecord, GetRecord, ListRecords } from '../../application/list-records.js';
import { LoginUser } from '../../application/login-user.js';
import { LogoutUser } from '../../application/logout-user.js';
import { RefreshSession } from '../../application/refresh-session.js';
import { RegisterUser } from '../../application/register-user.js';
import { StartBankConnection } from '../../application/start-bank-connection.js';
import { SyncBankAccount } from '../../application/sync-bank-account.js';
import { UpdateAccount } from '../../application/update-account.js';
import { UpdateProfile } from '../../application/update-profile.js';
import { UpdateRecord } from '../../application/update-record.js';
import { testEnv } from '../../config/env.js';
import { CryptoIdGenerator } from '../security/crypto-id-generator.js';
import { encodeEnableBankingState } from '../enablebanking-mapper.js';
import { FastifyJwtTokenIssuer } from './fastify-jwt-token-issuer.js';
import { startTestApp } from './test-server.js';

const FROM = '2026-09-01T00:00:00.000Z';
const TO = '2026-09-30T23:59:59.000Z';
const REDIRECT = 'mobile://bank/callback';
const STATE_SECRET = 'test-secret-at-least-32-characters!';

async function startEnableBankingTestApp() {
  const env = testEnv({ BANK_PROVIDER: 'enablebanking' });
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const accounts = new InMemoryAccountRepository();
  const records = new InMemoryRecordRepository();
  const links = new InMemoryBankLinkRepository();
  const hasher = new FakeHasher();
  const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));
  const ids = new CryptoIdGenerator();
  const bank = Object.assign(new FakeBankConnection(env.PUBLIC_API_URL), {
    provider: 'enablebanking' as const,
  });
  const app = await createServer(env);
  const tokens = new FastifyJwtTokenIssuer(app.jwt, clock, 7 * 24 * 60 * 60 * 1000);
  const ensureDefaultCash = new EnsureDefaultCashAccount(accounts, ids, clock);
  const syncBankAccount = new SyncBankAccount(accounts, records, links, bank, ids, clock);
  const deps: ApiDeps = {
    env,
    registerUser: new RegisterUser(
      users,
      refreshTokens,
      hasher,
      tokens,
      ids,
      clock,
      ensureDefaultCash,
    ),
    loginUser: new LoginUser(users, refreshTokens, hasher, tokens, ids, clock),
    refreshSession: new RefreshSession(users, refreshTokens, tokens, ids, clock),
    logoutUser: new LogoutUser(refreshTokens, tokens, clock),
    getCurrentUser: new GetCurrentUser(users),
    updateProfile: new UpdateProfile(users),
    listAccounts: new ListAccounts(accounts, ensureDefaultCash),
    getAccount: new GetAccount(accounts),
    createAccount: new CreateAccount(accounts, ids, clock),
    updateAccount: new UpdateAccount(accounts, clock),
    archiveAccount: new ArchiveAccount(accounts, clock),
    deleteAccount: new DeleteAccount(accounts, records),
    getAccountBalances: new GetAccountBalances(records),
    listRecords: new ListRecords(records),
    getRecord: new GetRecord(records),
    createRecord: new CreateRecord(records, accounts, ids, clock),
    updateRecord: new UpdateRecord(records, accounts, clock),
    deleteRecord: new DeleteRecord(records),
    startBankConnection: new StartBankConnection(links, bank, ids, clock),
    completeBankConnection: new CompleteBankConnection(
      links,
      accounts,
      bank,
      ids,
      clock,
      syncBankAccount,
    ),
    finalizeBankAuthorization: new FinalizeBankAuthorization(links, bank, clock),
    syncBankAccount,
    disconnectBankAccount: new DisconnectBankAccount(accounts, links, bank, clock),
    getBankLinkRedirect: new GetBankLinkRedirect(links),
    getBankConnectionOptions: new GetBankConnectionOptions(bank, env),
  };
  await registerApi(app, deps);
  return app;
}

describe('bank HTTP', () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('exposes connection options without a select URL in sandbox', async () => {
    app = await startTestApp();
    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const anonymous = await app.inject({ method: 'GET', url: '/bank/connection-options' });
    expect(anonymous.statusCode).toBe(401);
    const options = await app.inject({
      method: 'GET',
      url: '/bank/connection-options',
      headers: { authorization: `Bearer ${registered.json().accessToken}` },
    });
    expect(options.statusCode).toBe(200);
    expect(bankConnectionOptionsSchema.parse(options.json())).toEqual({
      provider: 'sandbox',
      selectUrl: null,
      country: 'FR',
    });
  });

  it('serves the Enable Banking ASPSP selection widget page', async () => {
    app = await startTestApp();
    const page = await app.inject({ method: 'GET', url: '/bank/enablebanking/select' });
    expect(page.statusCode).toBe(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.headers['content-security-policy']).toContain('frame-ancestors');
    expect(page.body).toContain('enablebanking-aspsp-list');
    expect(page.body).toContain('widgets.umd.min.js');
    expect(page.body).toContain('wallet.aspspSelected');
    expect(page.body).not.toContain('\n  sandbox');
  });

  it('requires ASPSP for Enable Banking and returns select URL in options', async () => {
    app = await startEnableBankingTestApp();
    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const auth = { authorization: `Bearer ${registered.json().accessToken}` };
    const options = bankConnectionOptionsSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/bank/connection-options',
          headers: auth,
        })
      ).json(),
    );
    expect(options).toEqual({
      provider: 'enablebanking',
      selectUrl: 'http://127.0.0.1:3000/bank/enablebanking/select',
      country: 'FR',
    });

    const missing = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      headers: auth,
      payload: { redirectUri: REDIRECT },
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ error: 'aspsp_required' });

    const started = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      headers: auth,
      payload: {
        redirectUri: REDIRECT,
        aspsp: { name: 'Boursorama Banque', country: 'FR' },
      },
    });
    expect(started.statusCode).toBe(201);
    const consent = startBankConnectionResponseSchema.parse(started.json());
    expect(consent.authorizationUrl).toContain('/bank/sandbox/authorize');
  });

  it('connects the sandbox bank, imports records, resyncs and disconnects', async () => {
    app = await startTestApp();

    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const session = registered.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };

    const anonymous = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      payload: { redirectUri: REDIRECT },
    });
    expect(anonymous.statusCode).toBe(401);

    const started = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      headers: auth,
      payload: { redirectUri: REDIRECT },
    });
    expect(started.statusCode).toBe(201);
    const consent = startBankConnectionResponseSchema.parse(started.json());
    expect(consent.authorizationUrl).toContain('/bank/sandbox/authorize');
    expect(consent.authorizationUrl).not.toContain('redirect_uri=');

    const authorize = await app.inject({
      method: 'GET',
      url: `/bank/sandbox/authorize?connectionId=${consent.id}`,
    });
    expect(authorize.statusCode).toBe(200);
    expect(authorize.headers['content-type']).toContain('text/html');
    expect(authorize.body).toContain('Banque démo');
    expect(authorize.body).toContain('target="_top"');
    expect(authorize.body).toContain(`connectionId=${consent.id}`);
    expect(authorize.body).toContain('mobile://bank/callback');
    expect(authorize.headers['content-security-policy']).toContain('frame-ancestors');

    const rejectedRedirect = await app.inject({
      method: 'GET',
      url: `/bank/sandbox/authorize?connectionId=${consent.id}&redirect_uri=${encodeURIComponent('https://attacker.example/')}`,
    });
    expect(rejectedRedirect.statusCode).toBe(400);

    const completed = await app.inject({
      method: 'POST',
      url: `/bank/connections/${consent.id}/complete`,
      headers: auth,
    });
    expect(completed.statusCode).toBe(200);
    const connected = accountsResponseSchema.parse(completed.json());
    expect(connected.accounts).toHaveLength(1);
    const bank = connected.accounts[0];
    expect(bank?.kind).toBe('bank');
    if (bank?.kind !== 'bank') throw new Error('expected bank');
    expect(bank.name).toBe('Compte courant');
    expect(bank.lastSyncedAt).toBeTruthy();

    const listed = recordsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/records?from=${FROM}&to=${TO}`,
          headers: auth,
        })
      ).json(),
    );
    expect(listed.records).toHaveLength(8);
    const expense = listed.records.find((record) => record.kind === 'expense');
    expect(expense?.kind).toBe('expense');
    if (expense?.kind !== 'expense') throw new Error('expected expense');

    const recategorized = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { categoryId: 'food_drinks.groceries' },
    });
    expect(recategorized.statusCode).toBe(200);
    expect(recordSchema.parse(recategorized.json())).toMatchObject({
      categoryId: 'food_drinks.groceries',
    });

    const blockedAmount = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { amountCents: 10 },
    });
    expect(blockedAmount.statusCode).toBe(400);
    expect(blockedAmount.json()).toEqual({ error: 'cannot_mutate_ais_record' });

    const blockedDelete = await app.inject({
      method: 'DELETE',
      url: `/records/${expense.id}`,
      headers: auth,
    });
    expect(blockedDelete.statusCode).toBe(409);
    expect(blockedDelete.json()).toEqual({ error: 'cannot_delete_ais_record' });

    const synced = await app.inject({
      method: 'POST',
      url: `/accounts/${bank.id}/sync`,
      headers: auth,
    });
    expect(synced.statusCode).toBe(200);
    expect(syncBankAccountResponseSchema.parse(synced.json())).toEqual({ importedCount: 0 });

    const again = recordsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/records?from=${FROM}&to=${TO}`,
          headers: auth,
        })
      ).json(),
    );
    expect(again.records.find((record) => record.id === expense.id)).toMatchObject({
      categoryId: 'food_drinks.groceries',
    });

    const disconnected = await app.inject({
      method: 'POST',
      url: `/accounts/${bank.id}/disconnect`,
      headers: auth,
    });
    expect(disconnected.statusCode).toBe(200);
    expect(accountSchema.parse(disconnected.json()).archivedAt).toBeTruthy();

    const resync = await app.inject({
      method: 'POST',
      url: `/accounts/${bank.id}/sync`,
      headers: auth,
    });
    expect(resync.statusCode).toBe(400);
    expect(resync.json()).toEqual({ error: 'cannot_sync_account' });
  });

  it('redirects the GoCardless return using the stored BankLink URI', async () => {
    app = await startTestApp();
    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const started = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      headers: { authorization: `Bearer ${registered.json().accessToken}` },
      payload: { redirectUri: REDIRECT },
    });
    const consent = startBankConnectionResponseSchema.parse(started.json());

    const redirect = await app.inject({
      method: 'GET',
      url: `/bank/gocardless/return?connectionId=${consent.id}&redirect_uri=${encodeURIComponent('https://attacker.example/')}`,
    });
    expect(redirect.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'GET',
      url: `/bank/gocardless/return?connectionId=${consent.id}`,
    });
    expect(ok.statusCode).toBe(302);
    expect(ok.headers.location).toBe(`${REDIRECT}?connectionId=${consent.id}`);

    const fromRef = await app.inject({
      method: 'GET',
      url: `/bank/gocardless/return?ref=${consent.id}`,
    });
    expect(fromRef.statusCode).toBe(302);
    expect(fromRef.headers.location).toBe(`${REDIRECT}?connectionId=${consent.id}`);
  });

  it('exchanges Enable Banking state and redirects to the stored callback', async () => {
    app = await startTestApp();
    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const started = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      headers: { authorization: `Bearer ${registered.json().accessToken}` },
      payload: { redirectUri: REDIRECT },
    });
    const consent = startBankConnectionResponseSchema.parse(started.json());
    const state = encodeEnableBankingState({ connectionId: consent.id }, STATE_SECRET);
    const returned = await app.inject({
      method: 'GET',
      url: `/bank/enablebanking/return?code=auth-code&state=${encodeURIComponent(state)}`,
    });
    expect(returned.statusCode).toBe(302);
    expect(returned.headers.location).toBe(`${REDIRECT}?connectionId=${consent.id}`);

    const forged = encodeEnableBankingState(
      { connectionId: consent.id },
      'other-secret-at-least-32-chars!!',
    );
    const rejected = await app.inject({
      method: 'GET',
      url: `/bank/enablebanking/return?code=auth-code&state=${encodeURIComponent(forged)}`,
    });
    expect(rejected.statusCode).toBe(400);
  });
});
