import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AccountKind } from '@wallet/shared';

import { Account } from '../../domain/account.js';
import type { AccountRepository } from '../../domain/ports.js';
import type { AppDatabase } from './database.js';
import { accounts } from './schema.js';

export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly db: AppDatabase) {}

  async listByUser(userId: string, options?: { includeArchived?: boolean }): Promise<Account[]> {
    const includeArchived = options?.includeArchived ?? false;
    const rows = await this.db
      .select()
      .from(accounts)
      .where(
        includeArchived
          ? eq(accounts.userId, userId)
          : and(eq(accounts.userId, userId), isNull(accounts.archivedAt)),
      )
      .orderBy(asc(accounts.position), asc(accounts.createdAt));
    return rows.map(toAccount);
  }

  async getById(id: string): Promise<Account | null> {
    const rows = await this.db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return rows[0] ? toAccount(rows[0]) : null;
  }

  async listByBankLink(bankLinkId: string): Promise<Account[]> {
    const rows = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.bankLinkId, bankLinkId))
      .orderBy(asc(accounts.position), asc(accounts.createdAt));
    return rows.map(toAccount);
  }

  async save(account: Account): Promise<void> {
    await this.db
      .insert(accounts)
      .values({
        id: account.id,
        userId: account.userId,
        kind: account.kind,
        name: account.name,
        currency: account.currency,
        color: account.color,
        excludeFromStats: account.excludeFromStats,
        archivedAt: account.archivedAt,
        iban: account.iban,
        institutionName: account.institutionName,
        minBalanceCents: account.minBalanceCents,
        maxBalanceCents: account.maxBalanceCents,
        position: account.position,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        bankLinkId: account.bankLinkId,
        externalAccountId: account.externalAccountId,
        lastSyncedAt: account.lastSyncedAt,
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: {
          name: account.name,
          currency: account.currency,
          color: account.color,
          excludeFromStats: account.excludeFromStats,
          archivedAt: account.archivedAt,
          iban: account.iban,
          institutionName: account.institutionName,
          minBalanceCents: account.minBalanceCents,
          maxBalanceCents: account.maxBalanceCents,
          position: account.position,
          updatedAt: account.updatedAt,
          bankLinkId: account.bankLinkId,
          externalAccountId: account.externalAccountId,
          lastSyncedAt: account.lastSyncedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(accounts).where(eq(accounts.id, id));
  }
}

function toAccount(row: typeof accounts.$inferSelect): Account {
  return new Account({
    id: row.id,
    userId: row.userId,
    kind: toKind(row.kind),
    name: row.name,
    currency: row.currency,
    color: row.color,
    excludeFromStats: row.excludeFromStats,
    archivedAt: row.archivedAt,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    minBalanceCents: row.minBalanceCents,
    maxBalanceCents: row.maxBalanceCents,
    iban: row.iban,
    institutionName: row.institutionName,
    bankLinkId: row.bankLinkId,
    externalAccountId: row.externalAccountId,
    lastSyncedAt: row.lastSyncedAt,
  });
}

function toKind(value: string): AccountKind {
  if (value === 'cash' || value === 'bank') {
    return value;
  }
  throw new Error(`Invalid account kind: ${value}`);
}
