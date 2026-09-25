import type {
  Account,
  AspspRef,
  BankConnectionOptions,
  CreateAccountBody,
  CreateRecordBody,
  Record as WalletRecord,
  RecordsResponse,
  UpdateAccountBody,
  UpdateRecordBody,
} from '@wallet/shared';

import type { StartBankConnectionResult, SyncBankAccountResult } from './bank';
import type { ListAccountsOptions, ListRecordsOptions } from './list-options';
import type { PendingWrite } from './pending-write';
import type { PinRecord, Session } from './session';

export interface PinVault {
  get(): Promise<PinRecord | null>;
  save(record: PinRecord): Promise<void>;
}

export interface SessionVault {
  get(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

export interface PinHasher {
  generateSalt(): Promise<string>;
  hash(pin: string, salt: string): Promise<string>;
}

export interface AuthApi {
  register(email: string, password: string): Promise<Session>;
  login(email: string, password: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  logout(refreshToken: string): Promise<void>;
  me(accessToken: string): Promise<Session['user']>;
  updateProfile(
    accessToken: string,
    profile: { firstName: string; lastName: string },
  ): Promise<Session['user']>;
}

export interface RecordRepository {
  list(options: ListRecordsOptions): Promise<RecordsResponse>;
  getById(id: string): Promise<WalletRecord>;
  create(body: CreateRecordBody, idempotencyKey: string): Promise<WalletRecord>;
  update(id: string, body: UpdateRecordBody): Promise<WalletRecord>;
  delete(id: string): Promise<void>;
}

export interface AccountRepository {
  list(options?: ListAccountsOptions): Promise<Account[]>;
  getById(id: string): Promise<Account>;
  create(body: CreateAccountBody, idempotencyKey: string): Promise<Account>;
  update(id: string, body: UpdateAccountBody): Promise<Account>;
  archive(id: string, archived: boolean): Promise<Account>;
  delete(id: string): Promise<void>;
}

export interface WriteQueue {
  list(): Promise<PendingWrite[]>;
  enqueue(item: PendingWrite): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  nowIso(): string;
}

export interface BankApi {
  connectionOptions(): Promise<BankConnectionOptions>;
  start(redirectUri: string, aspsp?: AspspRef): Promise<StartBankConnectionResult>;
  complete(connectionId: string): Promise<Account[]>;
  sync(accountId: string): Promise<SyncBankAccountResult>;
  disconnect(accountId: string): Promise<Account>;
}

export interface BankAuthSession {
  redirectUri(): string;
  open(authorizationUrl: string, redirectUri: string): Promise<'success' | 'cancel'>;
  dismissPending(): void;
  notifyFromCallbackWindow(): boolean;
}
