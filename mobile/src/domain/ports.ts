import type { Account, CreateAccountBody, UpdateAccountBody } from '@wallet/shared';

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

export class AuthApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AuthApiError';
  }
}

export type ListAccountsOptions = {
  includeArchived?: boolean;
};

export interface AccountRepository {
  list(options?: ListAccountsOptions): Promise<Account[]>;
  getById(id: string): Promise<Account>;
  create(body: CreateAccountBody): Promise<Account>;
  update(id: string, body: UpdateAccountBody): Promise<Account>;
  archive(id: string, archived: boolean): Promise<Account>;
  delete(id: string): Promise<void>;
}

export class AccountApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AccountApiError';
  }
}
