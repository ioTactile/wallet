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
import { FastifyJwtTokenIssuer } from './fastify-jwt-token-issuer.js';

export async function startTestApp(now = new Date('2026-09-20T10:00:00.000Z')) {
  const env = testEnv();
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const accounts = new InMemoryAccountRepository();
  const records = new InMemoryRecordRepository();
  const links = new InMemoryBankLinkRepository();
  const hasher = new FakeHasher();
  const clock = new FixedClock(now);
  const ids = new CryptoIdGenerator();
  const bank = new FakeBankConnection(env.PUBLIC_API_URL);
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
    bankLinks: links,
    enableBankingStateSecret: env.JWT_SECRET,
  };

  await registerApi(app, deps);
  return app;
}
