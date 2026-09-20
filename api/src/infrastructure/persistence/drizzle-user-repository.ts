import { eq } from 'drizzle-orm';

import { Email } from '../../domain/email.js';
import type { UserRepository } from '../../domain/ports.js';
import { User } from '../../domain/user.js';
import type { AppDatabase } from './database.js';
import { users } from './schema.js';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: AppDatabase) {}

  async findByEmail(email: Email): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email.value)).limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async save(user: User): Promise<void> {
    await this.db
      .insert(users)
      .values({
        id: user.id,
        email: user.email.value,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email.value,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
  }
}

function toUser(row: typeof users.$inferSelect): User {
  return new User(
    row.id,
    Email.parse(row.email),
    row.passwordHash,
    row.createdAt,
    row.firstName,
    row.lastName,
  );
}
