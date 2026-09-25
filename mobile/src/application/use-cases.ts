import { HttpAccountApi } from '@/infrastructure/account-api';
import { AsyncStorageWriteQueue } from '@/infrastructure/async-storage-write-queue';
import { HttpAuthApi } from '@/infrastructure/auth-api';
import { HttpBankApi } from '@/infrastructure/bank-api';
import { ExpoBankAuthSession } from '@/infrastructure/expo-bank-auth-session';
import { ExpoIdGenerator } from '@/infrastructure/expo-id-generator';
import { ExpoPinHasher } from '@/infrastructure/expo-pin-hasher';
import { secretStore } from '@/infrastructure/expo-secret-store';
import { HttpRecordApi } from '@/infrastructure/record-api';
import { SecurePinVault, SecureSessionVault } from '@/infrastructure/secure-vaults';
import { SystemClock } from '@/infrastructure/system-clock';

import {
  CompleteBankConnection,
  ConnectBank,
  DisconnectBankAccount,
  DismissBankAuth,
  GetBankConnectionOptions,
  NotifyBankAuthFromWindow,
  StartBankConnection,
  SyncBankAccount,
} from './bank';
import {
  ArchiveAccount,
  CreateCashAccount,
  DeleteAccount,
  GetAccount,
  ListAccounts,
  UpdateAccount,
} from './accounts';
import { CreateRecord, DeleteRecord, GetRecord, ListRecords, UpdateRecord } from './records';
import {
  HydrateAuth,
  LoginAccount,
  LogoutAccount,
  RegisterAccount,
  UpdateAccountProfile,
} from './authenticate';
import { CreatePin } from './create-pin';
import { VerifyPin } from './verify-pin';
import { FlushWriteQueue } from './write-queue';

const pinVault = new SecurePinVault(secretStore);
const sessionVault = new SecureSessionVault(secretStore);
const pinHasher = new ExpoPinHasher();
const authApi = new HttpAuthApi();
const accountApi = new HttpAccountApi(sessionVault, authApi);
const recordApi = new HttpRecordApi(sessionVault, authApi);
const bankApi = new HttpBankApi(sessionVault, authApi);
const bankAuthSession = new ExpoBankAuthSession();
const writeQueue = new AsyncStorageWriteQueue();
const ids = new ExpoIdGenerator();
const clock = new SystemClock();

export const authUseCases = {
  pinVault,
  sessionVault,
  createPin: new CreatePin(pinVault, pinHasher),
  verifyPin: new VerifyPin(pinVault, pinHasher),
  register: new RegisterAccount(authApi, sessionVault),
  login: new LoginAccount(authApi, sessionVault),
  logout: new LogoutAccount(authApi, sessionVault),
  updateProfile: new UpdateAccountProfile(authApi, sessionVault),
  hydrate: new HydrateAuth(pinVault, sessionVault),
};

export const accountUseCases = {
  list: new ListAccounts(accountApi),
  get: new GetAccount(accountApi),
  createCash: new CreateCashAccount(accountApi, writeQueue, ids, clock),
  update: new UpdateAccount(accountApi),
  archive: new ArchiveAccount(accountApi),
  delete: new DeleteAccount(accountApi),
};

export const bankUseCases = {
  start: new StartBankConnection(bankApi),
  complete: new CompleteBankConnection(bankApi),
  connectionOptions: new GetBankConnectionOptions(bankApi),
  connect: new ConnectBank(bankApi, bankAuthSession),
  /** @deprecated Prefer connect */
  connectDemo: new ConnectBank(bankApi, bankAuthSession),
  sync: new SyncBankAccount(bankApi),
  disconnect: new DisconnectBankAccount(bankApi),
  dismissAuth: new DismissBankAuth(bankAuthSession),
  notifyAuthFromWindow: new NotifyBankAuthFromWindow(bankAuthSession),
};

export const recordUseCases = {
  list: new ListRecords(recordApi),
  get: new GetRecord(recordApi),
  create: new CreateRecord(recordApi, writeQueue, ids, clock),
  update: new UpdateRecord(recordApi),
  delete: new DeleteRecord(recordApi),
};

export const writeQueueUseCases = {
  flush: new FlushWriteQueue(recordApi, accountApi, writeQueue),
};
