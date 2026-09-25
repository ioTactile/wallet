import type { Account } from './account.js';
import type { BankLink } from './bank-link.js';
import type { Email } from './email.js';
import type { IdempotencyClaimCommand, IdempotencyClaimResult } from './idempotency.js';
import type { LedgerRecord } from './record.js';
import type { IssuedRefresh, RefreshToken } from './refresh-token.js';
import type { User } from './user.js';

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface AccountRepository {
  listByUser(userId: string, options?: { includeArchived?: boolean }): Promise<Account[]>;
  listByBankLink(bankLinkId: string): Promise<Account[]>;
  getById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RecordRepository {
  getById(id: string): Promise<LedgerRecord | null>;
  findByExternalId(accountId: string, externalId: string): Promise<LedgerRecord | null>;
  save(record: LedgerRecord): Promise<void>;
  delete(id: string): Promise<void>;
  listByUser(userId: string): Promise<LedgerRecord[]>;
  existsForAccount(accountId: string): Promise<boolean>;
}

export interface BankLinkRepository {
  getById(id: string): Promise<BankLink | null>;
  save(link: BankLink): Promise<void>;
}

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  save(token: RefreshToken): Promise<void>;
  revokeIfActive(id: string, now: Date): Promise<boolean>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}

export interface Hasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(): string;
}

export interface TokenIssuer {
  issueAccess(userId: string): string;
  issueRefresh(): IssuedRefresh;
  hashRefresh(raw: string): string;
}

export interface IdempotencyStore {
  claim(input: IdempotencyClaimCommand): Promise<IdempotencyClaimResult>;
  complete(
    userId: string,
    key: string,
    responseStatus: number,
    responseBody: string,
  ): Promise<void>;
  abandon(userId: string, key: string): Promise<void>;
}
