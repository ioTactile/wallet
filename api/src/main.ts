import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { ArchiveAccount } from './application/archive-account.js';
import { CompleteBankConnection } from './application/complete-bank-connection.js';
import { CreateAccount } from './application/create-account.js';
import { CreateRecord } from './application/create-record.js';
import { DeleteAccount } from './application/delete-account.js';
import { DisconnectBankAccount } from './application/disconnect-bank-account.js';
import { EnsureDefaultCashAccount } from './application/ensure-default-cash-account.js';
import { FinalizeBankAuthorization } from './application/finalize-bank-authorization.js';
import { GetAccount } from './application/get-account.js';
import { GetAccountBalances } from './application/get-account-balances.js';
import { GetBankLinkRedirect } from './application/get-bank-link-redirect.js';
import { GetCurrentUser } from './application/get-current-user.js';
import { ListAccounts } from './application/list-accounts.js';
import { DeleteRecord, GetRecord, ListRecords } from './application/list-records.js';
import { LoginUser } from './application/login-user.js';
import { LogoutUser } from './application/logout-user.js';
import { RefreshSession } from './application/refresh-session.js';
import { RegisterUser } from './application/register-user.js';
import { StartBankConnection } from './application/start-bank-connection.js';
import { SyncBankAccount } from './application/sync-bank-account.js';
import { UpdateAccount } from './application/update-account.js';
import { UpdateProfile } from './application/update-profile.js';
import { UpdateRecord } from './application/update-record.js';
import { createServer, registerApi } from './app.js';
import { loadEnv } from './config/env.js';
import { createBankConnection } from './infrastructure/create-bank-connection.js';
import { FastifyJwtTokenIssuer } from './infrastructure/http/fastify-jwt-token-issuer.js';
import { applyAuthSchema } from './infrastructure/persistence/apply-schema.js';
import { DrizzleAccountRepository } from './infrastructure/persistence/drizzle-account-repository.js';
import { DrizzleBankLinkRepository } from './infrastructure/persistence/drizzle-bank-link-repository.js';
import { DrizzleRecordRepository } from './infrastructure/persistence/drizzle-record-repository.js';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token-repository.js';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user-repository.js';
import * as schema from './infrastructure/persistence/schema.js';
import { Argon2Hasher } from './infrastructure/security/argon2-hasher.js';
import { CryptoIdGenerator } from './infrastructure/security/crypto-id-generator.js';
import { SystemClock } from './infrastructure/security/system-clock.js';

async function main() {
  const env = loadEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = postgres(env.DATABASE_URL);
  const db = drizzle(client, { schema });
  await applyAuthSchema(db);

  const users = new DrizzleUserRepository(db);
  const refreshTokens = new DrizzleRefreshTokenRepository(db);
  const accounts = new DrizzleAccountRepository(db);
  const records = new DrizzleRecordRepository(db);
  const links = new DrizzleBankLinkRepository(db);
  const hasher = new Argon2Hasher();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const bank = createBankConnection(env);
  const ensureDefaultCash = new EnsureDefaultCashAccount(accounts, ids, clock);
  const syncBankAccount = new SyncBankAccount(accounts, records, links, bank, ids, clock);

  const app = await createServer(env);
  const tokens = new FastifyJwtTokenIssuer(
    app.jwt,
    clock,
    env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

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
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
