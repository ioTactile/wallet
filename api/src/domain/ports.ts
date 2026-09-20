import type { Account } from './account.js';
import type { Email } from './email.js';
import type { IssuedRefresh, RefreshToken } from './refresh-token.js';
import type { User } from './user.js';

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface AccountRepository {
  listByUser(userId: string, options?: { includeArchived?: boolean }): Promise<Account[]>;
  getById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  save(token: RefreshToken): Promise<void>;
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
