import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const bankLinks = pgTable(
  'bank_links',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider').notNull(),
    providerConnectionId: text('provider_connection_id').notNull(),
    redirectUri: text('redirect_uri').notNull(),
    status: text('status').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('bank_links_user_id_idx').on(table.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    currency: text('currency').notNull(),
    color: text('color').notNull(),
    excludeFromStats: boolean('exclude_from_stats').notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    iban: text('iban'),
    institutionName: text('institution_name'),
    minBalanceCents: integer('min_balance_cents'),
    maxBalanceCents: integer('max_balance_cents'),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
    bankLinkId: uuid('bank_link_id').references(() => bankLinks.id),
    externalAccountId: text('external_account_id'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    uniqueIndex('accounts_bank_link_external_uidx')
      .on(table.bankLinkId, table.externalAccountId)
      .where(sql`${table.bankLinkId} is not null`),
  ],
);

export const records = pgTable(
  'records',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    counterpartyAccountId: uuid('counterparty_account_id').references(() => accounts.id),
    categoryId: text('category_id'),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    bookedAt: timestamp('booked_at', { withTimezone: true, mode: 'date' }).notNull(),
    clearing: text('clearing').notNull(),
    categoryConfirmed: boolean('category_confirmed').notNull().default(false),
    note: text('note').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
    externalId: text('external_id'),
  },
  (table) => [
    index('records_user_id_booked_at_idx').on(table.userId, table.bookedAt),
    index('records_account_id_idx').on(table.accountId),
    index('records_counterparty_account_id_idx').on(table.counterpartyAccountId),
    uniqueIndex('records_account_external_id_uidx')
      .on(table.accountId, table.externalId)
      .where(sql`${table.externalId} is not null`),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    key: text('key').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [uniqueIndex('idempotency_keys_user_key_uidx').on(table.userId, table.key)],
);
