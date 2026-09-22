import { eq } from 'drizzle-orm';

import {
  BANK_PROVIDERS,
  BankLink,
  type BankLinkStatus,
  type BankProvider,
} from '../../domain/bank-link.js';
import type { BankLinkRepository } from '../../domain/ports.js';
import type { AppDatabase } from './database.js';
import { bankLinks } from './schema.js';

export class DrizzleBankLinkRepository implements BankLinkRepository {
  constructor(private readonly db: AppDatabase) {}

  async getById(id: string): Promise<BankLink | null> {
    const rows = await this.db.select().from(bankLinks).where(eq(bankLinks.id, id)).limit(1);
    return rows[0] ? toBankLink(rows[0]) : null;
  }

  async save(link: BankLink): Promise<void> {
    await this.db
      .insert(bankLinks)
      .values({
        id: link.id,
        userId: link.userId,
        provider: link.provider,
        providerConnectionId: link.providerConnectionId,
        redirectUri: link.redirectUri,
        status: link.status,
        lastSyncedAt: link.lastSyncedAt,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      })
      .onConflictDoUpdate({
        target: bankLinks.id,
        set: {
          provider: link.provider,
          providerConnectionId: link.providerConnectionId,
          redirectUri: link.redirectUri,
          status: link.status,
          lastSyncedAt: link.lastSyncedAt,
          updatedAt: link.updatedAt,
        },
      });
  }
}

function toBankLink(row: typeof bankLinks.$inferSelect): BankLink {
  return new BankLink({
    id: row.id,
    userId: row.userId,
    provider: toProvider(row.provider),
    providerConnectionId: row.providerConnectionId,
    redirectUri: row.redirectUri,
    status: toStatus(row.status),
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toProvider(value: string): BankProvider {
  if ((BANK_PROVIDERS as readonly string[]).includes(value)) {
    return value as BankProvider;
  }
  throw new Error(`Invalid bank provider: ${value}`);
}

function toStatus(value: string): BankLinkStatus {
  if (value === 'pending' || value === 'active' || value === 'revoked') {
    return value;
  }
  throw new Error(`Invalid bank link status: ${value}`);
}
