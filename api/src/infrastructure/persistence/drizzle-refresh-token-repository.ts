import { and, eq, isNull } from 'drizzle-orm';

import type { RefreshTokenRepository } from '../../domain/ports.js';
import { RefreshToken } from '../../domain/refresh-token.js';
import type { AppDatabase } from './database.js';
import { refreshTokens } from './schema.js';

export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: AppDatabase) {}

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ? toToken(rows[0]) : null;
  }

  async save(token: RefreshToken): Promise<void> {
    await this.db
      .insert(refreshTokens)
      .values({
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: refreshTokens.id,
        set: {
          revokedAt: token.revokedAt,
          expiresAt: token.expiresAt,
        },
      });
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}

function toToken(row: typeof refreshTokens.$inferSelect): RefreshToken {
  return new RefreshToken(row.id, row.userId, row.tokenHash, row.expiresAt, row.revokedAt);
}
