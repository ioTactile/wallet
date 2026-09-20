import {
  accountSchema,
  accountsResponseSchema,
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_CASH_ACCOUNT_ID,
} from '@wallet/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { createServer, registerApi } from '../../app.js';
import { ArchiveAccount } from '../../application/archive-account.js';
import { CreateAccount } from '../../application/create-account.js';
import { DeleteAccount } from '../../application/delete-account.js';
import { EnsureDefaultCashAccount } from '../../application/ensure-default-cash-account.js';
import {
  FakeHasher,
  FixedClock,
  InMemoryAccountRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../../application/fakes.js';
import { GetAccount } from '../../application/get-account.js';
import { GetCurrentUser } from '../../application/get-current-user.js';
import { ListAccounts } from '../../application/list-accounts.js';
import { LoginUser } from '../../application/login-user.js';
import { LogoutUser } from '../../application/logout-user.js';
import { RefreshSession } from '../../application/refresh-session.js';
import { RegisterUser } from '../../application/register-user.js';
import { UpdateAccount } from '../../application/update-account.js';
import { UpdateProfile } from '../../application/update-profile.js';
import { testEnv } from '../../config/env.js';
import { CryptoIdGenerator } from '../security/crypto-id-generator.js';
import { FastifyJwtTokenIssuer } from './fastify-jwt-token-issuer.js';

async function startApp() {
  const env = testEnv();
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const accounts = new InMemoryAccountRepository();
  const hasher = new FakeHasher();
  const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));
  const ids = new CryptoIdGenerator();
  const app = await createServer(env);
  const tokens = new FastifyJwtTokenIssuer(app.jwt, clock, 7 * 24 * 60 * 60 * 1000);
  const ensureDefaultCash = new EnsureDefaultCashAccount(accounts, ids, clock);

  await registerApi(app, {
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
    deleteAccount: new DeleteAccount(accounts),
  });

  return app;
}

describe('accounts HTTP', () => {
  let app: Awaited<ReturnType<typeof startApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('registers a default Espèces account, supports cash CRUD, and rejects deleting the last cash', async () => {
    app = await startApp();

    const created = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    expect(created.statusCode).toBe(201);
    const session = created.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };

    const anonymous = await app.inject({ method: 'GET', url: '/accounts' });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.json()).toEqual({ error: 'unauthorized' });

    const listed = await app.inject({ method: 'GET', url: '/accounts', headers: auth });
    expect(listed.statusCode).toBe(200);
    const listBody = accountsResponseSchema.parse(listed.json());
    expect(listBody.accounts).toHaveLength(1);
    const species = listBody.accounts[0];
    expect(species?.kind).toBe('cash');
    expect(species?.name).toBe('Espèces');
    expect(species?.color).toBe(DEFAULT_ACCOUNT_COLOR);
    expect(species?.balanceCents).toBe(0);
    expect(species?.id).not.toBe(DEFAULT_CASH_ACCOUNT_ID);
    expect(species).not.toHaveProperty('iban');

    const posted = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: auth,
      payload: { kind: 'cash', name: 'Coffre' },
    });
    expect(posted.statusCode).toBe(201);
    const coffre = accountSchema.parse(posted.json());
    expect(coffre.kind).toBe('cash');
    expect(coffre.name).toBe('Coffre');
    expect(coffre.balanceCents).toBe(0);

    const fetched = await app.inject({
      method: 'GET',
      url: `/accounts/${coffre.id}`,
      headers: auth,
    });
    expect(fetched.statusCode).toBe(200);
    expect(accountSchema.parse(fetched.json()).id).toBe(coffre.id);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/accounts/${coffre.id}`,
      headers: auth,
      payload: { name: 'Vacances', color: '#42a5f5' },
    });
    expect(patched.statusCode).toBe(200);
    expect(accountSchema.parse(patched.json())).toMatchObject({
      name: 'Vacances',
      color: '#42A5F5',
      kind: 'cash',
    });

    const archived = await app.inject({
      method: 'POST',
      url: `/accounts/${coffre.id}/archive`,
      headers: auth,
      payload: { archived: true },
    });
    expect(archived.statusCode).toBe(200);
    expect(accountSchema.parse(archived.json()).archivedAt).toBeTruthy();

    const afterArchive = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    expect(afterArchive.accounts.map((account) => account.id)).toEqual([species?.id]);

    const withArchived = accountsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/accounts?includeArchived=true',
          headers: auth,
        })
      ).json(),
    );
    expect(withArchived.accounts.map((account) => account.id)).toEqual([species?.id, coffre.id]);
    expect(withArchived.accounts.find((account) => account.id === coffre.id)?.archivedAt).toBeTruthy();

    const restored = await app.inject({
      method: 'POST',
      url: `/accounts/${coffre.id}/archive`,
      headers: auth,
      payload: { archived: false },
    });
    expect(restored.statusCode).toBe(200);
    expect(accountSchema.parse(restored.json()).archivedAt).toBeNull();

    const afterRestore = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    expect(afterRestore.accounts.map((account) => account.id)).toEqual([species?.id, coffre.id]);

    const deletedExtra = await app.inject({
      method: 'DELETE',
      url: `/accounts/${coffre.id}`,
      headers: auth,
    });
    expect(deletedExtra.statusCode).toBe(204);

    const deletedLast = await app.inject({
      method: 'DELETE',
      url: `/accounts/${species?.id}`,
      headers: auth,
    });
    expect(deletedLast.statusCode).toBe(409);
    expect(deletedLast.json()).toEqual({ error: 'cannot_delete_last_cash_account' });
  });
});
