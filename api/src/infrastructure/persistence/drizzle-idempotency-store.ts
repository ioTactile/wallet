import { and, eq, lt } from 'drizzle-orm';

import type {
  IdempotencyClaimCommand,
  IdempotencyClaimResult,
  IdempotencyRecord,
} from '../../domain/idempotency.js';
import type { IdempotencyStore } from '../../domain/ports.js';
import type { AppDatabase } from './database.js';
import { idempotencyKeys } from './schema.js';

export class DrizzleIdempotencyStore implements IdempotencyStore {
  constructor(private readonly db: AppDatabase) {}

  async claim(input: IdempotencyClaimCommand): Promise<IdempotencyClaimResult> {
    const inserted = await this.db
      .insert(idempotencyKeys)
      .values({
        userId: input.userId,
        key: input.key,
        method: input.method,
        path: input.path,
        requestHash: input.requestHash,
        status: 'processing',
        responseStatus: null,
        responseBody: null,
        createdAt: input.now,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      return { type: 'claimed' };
    }

    const rows = await this.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, input.userId), eq(idempotencyKeys.key, input.key)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      return { type: 'in_progress' };
    }
    if (existing.requestHash !== input.requestHash) {
      return { type: 'conflict_body' };
    }
    if (existing.status === 'completed') {
      return { type: 'replay', entry: toEntry(existing) };
    }

    const reclaimBefore = new Date(input.now.getTime() - input.reclaimAfterMs);
    const reclaimed = await this.db
      .update(idempotencyKeys)
      .set({
        status: 'processing',
        responseStatus: null,
        responseBody: null,
        createdAt: input.now,
        method: input.method,
        path: input.path,
      })
      .where(
        and(
          eq(idempotencyKeys.userId, input.userId),
          eq(idempotencyKeys.key, input.key),
          eq(idempotencyKeys.status, 'processing'),
          lt(idempotencyKeys.createdAt, reclaimBefore),
        ),
      )
      .returning();

    if (reclaimed.length > 0) {
      return { type: 'claimed' };
    }
    return { type: 'in_progress' };
  }

  async complete(
    userId: string,
    key: string,
    responseStatus: number,
    responseBody: string,
  ): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({
        status: 'completed',
        responseStatus,
        responseBody,
      })
      .where(
        and(
          eq(idempotencyKeys.userId, userId),
          eq(idempotencyKeys.key, key),
          eq(idempotencyKeys.status, 'processing'),
        ),
      );
  }

  async abandon(userId: string, key: string): Promise<void> {
    await this.db
      .delete(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.userId, userId),
          eq(idempotencyKeys.key, key),
          eq(idempotencyKeys.status, 'processing'),
        ),
      );
  }
}

function toEntry(row: typeof idempotencyKeys.$inferSelect): IdempotencyRecord {
  return {
    userId: row.userId,
    key: row.key,
    method: row.method,
    path: row.path,
    requestHash: row.requestHash,
    status: row.status as IdempotencyRecord['status'],
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
    createdAt: row.createdAt,
  };
}
