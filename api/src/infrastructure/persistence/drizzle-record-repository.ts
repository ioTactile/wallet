import { and, desc, eq, or } from 'drizzle-orm';
import type { RecordClearing, RecordKind } from '@wallet/shared';

import type { RecordRepository } from '../../domain/ports.js';
import { LedgerRecord } from '../../domain/record.js';
import type { AppDatabase } from './database.js';
import { records } from './schema.js';

export class DrizzleRecordRepository implements RecordRepository {
  constructor(private readonly db: AppDatabase) {}

  async getById(id: string): Promise<LedgerRecord | null> {
    const rows = await this.db.select().from(records).where(eq(records.id, id)).limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findByExternalId(accountId: string, externalId: string): Promise<LedgerRecord | null> {
    const rows = await this.db
      .select()
      .from(records)
      .where(
        and(
          eq(records.externalId, externalId),
          or(eq(records.accountId, accountId), eq(records.counterpartyAccountId, accountId)),
        ),
      )
      .limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async save(record: LedgerRecord): Promise<void> {
    await this.db
      .insert(records)
      .values({
        id: record.id,
        userId: record.userId,
        kind: record.kind,
        accountId: record.accountId,
        counterpartyAccountId: record.counterpartyAccountId,
        categoryId: record.categoryId,
        amountCents: record.amountCents,
        currency: record.currency,
        bookedAt: record.bookedAt,
        clearing: record.clearing,
        note: record.note,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        externalId: record.externalId,
      })
      .onConflictDoUpdate({
        target: records.id,
        set: {
          kind: record.kind,
          accountId: record.accountId,
          counterpartyAccountId: record.counterpartyAccountId,
          categoryId: record.categoryId,
          amountCents: record.amountCents,
          currency: record.currency,
          bookedAt: record.bookedAt,
          clearing: record.clearing,
          note: record.note,
          updatedAt: record.updatedAt,
          externalId: record.externalId,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(records).where(eq(records.id, id));
  }

  async listByUser(userId: string): Promise<LedgerRecord[]> {
    const rows = await this.db
      .select()
      .from(records)
      .where(eq(records.userId, userId))
      .orderBy(desc(records.bookedAt), desc(records.id));
    return rows.map(toRecord);
  }

  async existsForAccount(accountId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: records.id })
      .from(records)
      .where(or(eq(records.accountId, accountId), eq(records.counterpartyAccountId, accountId)))
      .limit(1);
    return rows.length > 0;
  }
}

function toRecord(row: typeof records.$inferSelect): LedgerRecord {
  return new LedgerRecord({
    id: row.id,
    userId: row.userId,
    kind: toKind(row.kind),
    accountId: row.accountId,
    counterpartyAccountId: row.counterpartyAccountId,
    categoryId: row.categoryId,
    amountCents: row.amountCents,
    currency: row.currency,
    bookedAt: row.bookedAt,
    clearing: toClearing(row.clearing),
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    externalId: row.externalId,
  });
}

function toKind(value: string): RecordKind {
  if (value === 'expense' || value === 'income' || value === 'transfer') {
    return value;
  }
  throw new Error(`Invalid record kind: ${value}`);
}

function toClearing(value: string): RecordClearing {
  if (value === 'cleared' || value === 'uncleared') {
    return value;
  }
  throw new Error(`Invalid clearing: ${value}`);
}
