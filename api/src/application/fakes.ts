import { createHash } from 'node:crypto';

import type { Account } from '../domain/account.js';
import type { Email } from '../domain/email.js';
import type {
  AccountRepository,
  Clock,
  Hasher,
  IdGenerator,
  RecordRepository,
  RefreshTokenRepository,
  TokenIssuer,
  UserRepository,
} from '../domain/ports.js';
import type { LedgerRecord } from '../domain/record.js';
import type { IssuedRefresh, RefreshToken } from '../domain/refresh-token.js';
import type { User } from '../domain/user.js';

export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  async listByUser(userId: string, options?: { includeArchived?: boolean }): Promise<Account[]> {
    const includeArchived = options?.includeArchived ?? false;
    return [...this.accounts.values()]
      .filter((account) => account.userId === userId)
      .filter((account) => includeArchived || account.archivedAt === null)
      .sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null;
  }

  async save(account: Account): Promise<void> {
    this.accounts.set(account.id, account);
  }

  async delete(id: string): Promise<void> {
    this.accounts.delete(id);
  }
}

export class InMemoryRecordRepository implements RecordRepository {
  private readonly records = new Map<string, LedgerRecord>();

  async getById(id: string): Promise<LedgerRecord | null> {
    return this.records.get(id) ?? null;
  }

  async save(record: LedgerRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async listByUser(userId: string): Promise<LedgerRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.bookedAt.getTime() - a.bookedAt.getTime() || a.id.localeCompare(b.id));
  }

  async existsForAccount(accountId: string): Promise<boolean> {
    return [...this.records.values()].some(
      (record) => record.accountId === accountId || record.counterpartyAccountId === accountId,
    );
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByEmail(email: Email): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email.value === email.value) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Map<string, RefreshToken>();

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return [...this.tokens.values()].find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async save(token: RefreshToken): Promise<void> {
    this.tokens.set(token.id, token);
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId === userId && !token.isRevoked) {
        this.tokens.set(token.id, token.revoke(now));
      }
    }
  }
}

export class FakeHasher implements Hasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class SequentialIds implements IdGenerator {
  private n = 0;

  generate(): string {
    this.n += 1;
    return `id-${this.n}`;
  }
}

export class FakeTokenIssuer implements TokenIssuer {
  private n = 0;

  issueAccess(userId: string): string {
    return `access:${userId}`;
  }

  issueRefresh(): IssuedRefresh {
    this.n += 1;
    const raw = `refresh-${this.n}`;
    return {
      raw,
      tokenHash: this.hashRefresh(raw),
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
    };
  }

  hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
