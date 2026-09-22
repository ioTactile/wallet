import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, describe, expect, it } from 'vitest';

import { Email } from '../../domain/email.js';
import { RefreshToken } from '../../domain/refresh-token.js';
import { User } from '../../domain/user.js';
import { Account } from '../../domain/account.js';
import { BankLink } from '../../domain/bank-link.js';
import { LedgerRecord } from '../../domain/record.js';
import { applyAuthSchema } from './apply-schema.js';
import { DrizzleAccountRepository } from './drizzle-account-repository.js';
import { DrizzleBankLinkRepository } from './drizzle-bank-link-repository.js';
import { DrizzleRecordRepository } from './drizzle-record-repository.js';
import { DrizzleRefreshTokenRepository } from './drizzle-refresh-token-repository.js';
import { DrizzleUserRepository } from './drizzle-user-repository.js';
import * as schema from './schema.js';

describe('drizzle repositories (pglite)', () => {
  let client: PGlite;

  afterEach(async () => {
    await client?.close();
  });

  it('persists a user and finds them by email', async () => {
    client = new PGlite();
    const db = drizzle(client, { schema });
    await applyAuthSchema(db);
    const users = new DrizzleUserRepository(db);

    const user = new User(
      '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      Email.parse('jordan@example.com'),
      'hashed:secret',
      new Date('2026-09-19T20:00:00.000Z'),
      'Jordan',
      'Dupont',
    );
    await users.save(user);

    const found = await users.findByEmail(Email.parse('JORDAN@example.com'));
    expect(found?.id).toBe(user.id);
    expect(found?.email.value).toBe('jordan@example.com');
    expect(found?.firstName).toBe('Jordan');
    expect(found?.lastName).toBe('Dupont');
  });

  it('revokes every active refresh token for a user', async () => {
    client = new PGlite();
    const db = drizzle(client, { schema });
    await applyAuthSchema(db);
    const users = new DrizzleUserRepository(db);
    const tokens = new DrizzleRefreshTokenRepository(db);

    const user = new User(
      '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      Email.parse('jordan@example.com'),
      'hashed:secret',
      new Date('2026-09-19T20:00:00.000Z'),
    );
    await users.save(user);

    const first = new RefreshToken(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      user.id,
      'hash-1',
      new Date('2026-10-01T00:00:00.000Z'),
      null,
    );
    const second = new RefreshToken(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      user.id,
      'hash-2',
      new Date('2026-10-01T00:00:00.000Z'),
      null,
    );
    await tokens.save(first);
    await tokens.save(second);

    await tokens.revokeAllForUser(user.id, new Date('2026-09-20T00:00:00.000Z'));

    expect((await tokens.findByHash('hash-1'))?.isRevoked).toBe(true);
    expect((await tokens.findByHash('hash-2'))?.isRevoked).toBe(true);
  });

  it('persists cash and bank accounts without a balance column', async () => {
    client = new PGlite();
    const db = drizzle(client, { schema });
    await applyAuthSchema(db);
    const users = new DrizzleUserRepository(db);
    const accounts = new DrizzleAccountRepository(db);

    const user = new User(
      '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      Email.parse('jordan@example.com'),
      'hashed:secret',
      new Date('2026-09-19T20:00:00.000Z'),
    );
    await users.save(user);

    const cash = Account.createCash({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      userId: user.id,
      name: 'Espèces',
      now: new Date('2026-09-20T10:00:00.000Z'),
      position: 0,
    });
    const bank = Account.createBank({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      userId: user.id,
      name: 'BoursoBank',
      now: new Date('2026-09-20T10:01:00.000Z'),
      position: 1,
      iban: 'FR7630001007941234567890185',
      institutionName: 'BoursoBank',
    });
    await accounts.save(cash);
    await accounts.save(bank);

    const listed = await accounts.listByUser(user.id);
    expect(listed.map((account) => account.kind)).toEqual(['cash', 'bank']);
    expect(listed[0]?.iban).toBeNull();
    expect(listed[1]?.iban).toBe('FR7630001007941234567890185');

    const renamed = cash.rename('Coffre', new Date('2026-09-20T11:00:00.000Z'));
    await accounts.save(renamed);
    expect((await accounts.getById(cash.id))?.name).toBe('Coffre');

    const archived = renamed.archive(new Date('2026-09-20T12:00:00.000Z'));
    await accounts.save(archived);
    expect(await accounts.listByUser(user.id)).toHaveLength(1);
    expect(await accounts.listByUser(user.id, { includeArchived: true })).toHaveLength(2);

    await accounts.delete(bank.id);
    expect(await accounts.getById(bank.id)).toBeNull();
  });

  it('persists expense and transfer records and detects account usage', async () => {
    client = new PGlite();
    const db = drizzle(client, { schema });
    await applyAuthSchema(db);
    const users = new DrizzleUserRepository(db);
    const accounts = new DrizzleAccountRepository(db);
    const records = new DrizzleRecordRepository(db);

    const user = new User(
      '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      Email.parse('jordan@example.com'),
      'hashed:secret',
      new Date('2026-09-19T20:00:00.000Z'),
    );
    await users.save(user);
    const cash = Account.createCash({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      userId: user.id,
      name: 'Espèces',
      now: new Date('2026-09-20T10:00:00.000Z'),
    });
    const bank = Account.createBank({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      userId: user.id,
      name: 'CIC',
      now: new Date('2026-09-20T10:01:00.000Z'),
      position: 1,
    });
    await accounts.save(cash);
    await accounts.save(bank);

    const expense = LedgerRecord.createExpense({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      userId: user.id,
      accountId: cash.id,
      categoryId: 'food_drinks.groceries',
      amountCents: 199,
      now: new Date('2026-09-20T10:00:00.000Z'),
    });
    const transfer = LedgerRecord.createTransfer({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      userId: user.id,
      accountId: cash.id,
      counterpartyAccountId: bank.id,
      amountCents: 500,
      now: new Date('2026-09-21T10:00:00.000Z'),
    });
    await records.save(expense);
    await records.save(transfer);

    const listed = await records.listByUser(user.id);
    expect(listed.map((record) => record.kind)).toEqual(['transfer', 'expense']);
    expect(await records.existsForAccount(bank.id)).toBe(true);

    const updated = expense.setNote('Courses', new Date('2026-09-20T11:00:00.000Z'));
    await records.save(updated);
    expect((await records.getById(expense.id))?.note).toBe('Courses');

    await records.delete(transfer.id);
    expect(await records.getById(transfer.id)).toBeNull();
    expect(await records.existsForAccount(bank.id)).toBe(false);
  });

  it('persists a bank link, AIS account identity and unique external records', async () => {
    client = new PGlite();
    const db = drizzle(client, { schema });
    await applyAuthSchema(db);
    const users = new DrizzleUserRepository(db);
    const links = new DrizzleBankLinkRepository(db);
    const accounts = new DrizzleAccountRepository(db);
    const records = new DrizzleRecordRepository(db);

    const user = new User(
      '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      Email.parse('jordan@example.com'),
      'hashed:secret',
      new Date('2026-09-19T20:00:00.000Z'),
    );
    await users.save(user);

    const now = new Date('2026-09-20T10:00:00.000Z');
    const link = BankLink.start({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: user.id,
      provider: 'sandbox',
      providerConnectionId: 'sandbox:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      redirectUri: 'mobile://bank/callback',
      now,
    }).activate(now);
    await links.save(link);
    expect((await links.getById(link.id))?.status).toBe('active');

    const gocardless = BankLink.start({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: user.id,
      provider: 'gocardless',
      providerConnectionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      redirectUri: 'mobile://bank/callback',
      now,
    });
    await links.save(gocardless);
    expect((await links.getById(gocardless.id))?.provider).toBe('gocardless');

    const bank = Account.createBank({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      userId: user.id,
      name: 'Compte courant',
      now,
      iban: 'FR7630001007941234567890185',
      institutionName: 'Banque démo',
      bankLinkId: link.id,
      externalAccountId: 'sandbox-checking',
    });
    await accounts.save(bank);
    expect((await accounts.listByBankLink(link.id)).map((account) => account.id)).toEqual([
      bank.id,
    ]);

    const ais = LedgerRecord.createFromAis({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      userId: user.id,
      accountId: bank.id,
      signedAmountCents: -1299,
      externalId: 'sandbox-tx-carrefour',
      label: 'Carrefour',
      now,
    });
    await records.save(ais);
    expect((await records.findByExternalId(bank.id, 'sandbox-tx-carrefour'))?.note).toBe(
      'Carrefour',
    );

    const recategorized = ais.recategorize(
      'food_drinks.groceries',
      new Date('2026-09-20T11:00:00.000Z'),
    );
    await records.save(recategorized);
    const stored = await records.getById(ais.id);
    expect(stored?.categoryId).toBe('food_drinks.groceries');
    expect(stored?.categoryConfirmed).toBe(false);

    const confirmed = recategorized.setCategoryConfirmed(
      true,
      new Date('2026-09-20T12:00:00.000Z'),
    );
    await records.save(confirmed);
    expect((await records.getById(ais.id))?.categoryConfirmed).toBe(true);
  });
});
