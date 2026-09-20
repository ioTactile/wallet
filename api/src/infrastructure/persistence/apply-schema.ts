import type { AppDatabase } from './database.js';

export async function applyAuthSchema(db: AppDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      first_name text NOT NULL DEFAULT '',
      last_name text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL
    )
  `);
  await db.execute(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT ''
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id),
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id),
      kind text NOT NULL,
      name text NOT NULL,
      currency text NOT NULL,
      color text NOT NULL,
      exclude_from_stats boolean NOT NULL,
      archived_at timestamptz,
      iban text,
      institution_name text,
      min_balance_cents integer,
      max_balance_cents integer,
      position integer NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id)
  `);
}
