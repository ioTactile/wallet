import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_CURRENCY,
  DEFAULT_CASH_ACCOUNT_ID,
  accountKindLabel,
} from '@wallet/shared';

import { Account } from '../domain/account.js';
import {
  AccountKindMismatch,
  AccountNotFound,
  CannotDeleteLastCashAccount,
} from '../domain/errors.js';
import { ArchiveAccount } from './archive-account.js';
import { CreateAccount } from './create-account.js';
import { DeleteAccount } from './delete-account.js';
import { EnsureDefaultCashAccount } from './ensure-default-cash-account.js';
import {
  FakeHasher,
  FakeTokenIssuer,
  FixedClock,
  InMemoryAccountRepository,
  InMemoryRecordRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  SequentialIds,
} from './fakes.js';
import { GetAccount } from './get-account.js';
import { ListAccounts } from './list-accounts.js';
import { RegisterUser } from './register-user.js';
import { UpdateAccount } from './update-account.js';

const USER_ID = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';
const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function accountsSetup() {
  const accounts = new InMemoryAccountRepository();
  const records = new InMemoryRecordRepository();
  const ids = new SequentialIds();
  const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));
  const ensureDefaultCash = new EnsureDefaultCashAccount(accounts, ids, clock);

  return {
    accounts,
    clock,
    ensureDefaultCash,
    list: new ListAccounts(accounts, ensureDefaultCash),
    get: new GetAccount(accounts),
    create: new CreateAccount(accounts, ids, clock),
    update: new UpdateAccount(accounts, clock),
    archive: new ArchiveAccount(accounts, clock),
    remove: new DeleteAccount(accounts, records),
  };
}

describe('account use cases', () => {
  it('creates a default Espèces cash account on register', async () => {
    const users = new InMemoryUserRepository();
    const refreshTokens = new InMemoryRefreshTokenRepository();
    const accounts = new InMemoryAccountRepository();
    const ids = new SequentialIds();
    const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));
    const ensureDefaultCash = new EnsureDefaultCashAccount(accounts, ids, clock);
    const register = new RegisterUser(
      users,
      refreshTokens,
      new FakeHasher(),
      new FakeTokenIssuer(),
      ids,
      clock,
      ensureDefaultCash,
    );

    const session = await register.execute({
      email: 'jordan@example.com',
      password: 'longenough',
    });
    const listed = await accounts.listByUser(session.user.id);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.kind).toBe('cash');
    expect(listed[0]?.name).toBe(accountKindLabel('cash', 'fr'));
    expect(listed[0]?.color).toBe(DEFAULT_ACCOUNT_COLOR);
    expect(listed[0]?.currency).toBe(DEFAULT_ACCOUNT_CURRENCY);
    expect(listed[0]?.id).not.toBe(DEFAULT_CASH_ACCOUNT_ID);
  });

  it('creates a default cash account when listing for a user with none', async () => {
    const { list, accounts } = accountsSetup();

    const listed = await list.execute(USER_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe('Espèces');
    expect(listed[0]?.kind).toBe('cash');
    expect(await accounts.listByUser(USER_ID)).toHaveLength(1);
  });

  it('does not create a second default cash if one already exists', async () => {
    const { list, ensureDefaultCash } = accountsSetup();
    await ensureDefaultCash.execute(USER_ID);
    await list.execute(USER_ID);
    const listed = await list.execute(USER_ID);
    expect(listed).toHaveLength(1);
  });

  it('excludes archived accounts from the default list', async () => {
    const { create, archive, list, clock } = accountsSetup();
    const cash = await create.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const extra = await create.execute(USER_ID, { kind: 'cash', name: 'Coffre' });
    clock.advance(1000);
    await archive.execute(USER_ID, extra.id, true);

    const active = await list.execute(USER_ID);
    expect(active.map((account) => account.id)).toEqual([cash.id]);

    const all = await list.execute(USER_ID, { includeArchived: true });
    expect(all.map((account) => account.id)).toEqual([cash.id, extra.id]);
  });

  it('gets an owned account and hides others', async () => {
    const { create, get } = accountsSetup();
    const account = await create.execute(USER_ID, { kind: 'cash', name: 'Espèces' });

    await expect(get.execute(USER_ID, account.id)).resolves.toEqual(account);
    await expect(get.execute(USER_ID, 'missing')).rejects.toBeInstanceOf(AccountNotFound);
    await expect(get.execute(OTHER_USER, account.id)).rejects.toBeInstanceOf(AccountNotFound);
  });

  it('creates cash without bank fields and bank with optional details', async () => {
    const { create } = accountsSetup();
    const cash = await create.execute(USER_ID, { kind: 'cash', name: '  Coffre ' });
    expect(cash.kind).toBe('cash');
    expect(cash.name).toBe('Coffre');
    expect(cash.iban).toBeNull();

    const bank = await create.execute(USER_ID, {
      kind: 'bank',
      name: 'Livret',
      iban: 'FR76',
      institutionName: 'CIC',
    });
    expect(bank.kind).toBe('bank');
    expect(bank.iban).toBe('FR76');
    expect(bank.institutionName).toBe('CIC');
    expect(bank.position).toBeGreaterThan(cash.position);
  });

  it('updates mutable fields and rejects bank details on cash', async () => {
    const { create, update, clock } = accountsSetup();
    const cash = await create.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    clock.advance(1000);

    const renamed = await update.execute(USER_ID, cash.id, {
      name: '  Vacances ',
      color: '#42a5f5',
      excludeFromStats: true,
      minBalanceCents: 0,
      maxBalanceCents: 50_00,
    });
    expect(renamed.name).toBe('Vacances');
    expect(renamed.color).toBe('#42A5F5');
    expect(renamed.excludeFromStats).toBe(true);
    expect(renamed.minBalanceCents).toBe(0);
    expect(renamed.maxBalanceCents).toBe(50_00);
    expect(renamed.kind).toBe('cash');

    await expect(update.execute(USER_ID, cash.id, { iban: 'FR76' })).rejects.toBeInstanceOf(
      AccountKindMismatch,
    );
  });

  it('cannot delete the last non-archived cash account', async () => {
    const { create, remove, archive, clock } = accountsSetup();
    const cash = await create.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const extra = await create.execute(USER_ID, { kind: 'cash', name: 'Coffre' });

    await remove.execute(USER_ID, extra.id);
    await expect(remove.execute(USER_ID, cash.id)).rejects.toBeInstanceOf(
      CannotDeleteLastCashAccount,
    );

    const spare = await create.execute(USER_ID, { kind: 'cash', name: 'Spare' });
    clock.advance(1000);
    await archive.execute(USER_ID, spare.id, true);
    await expect(remove.execute(USER_ID, cash.id)).rejects.toBeInstanceOf(
      CannotDeleteLastCashAccount,
    );
    await remove.execute(USER_ID, spare.id);
  });

  it('deletes a bank account and archives cash', async () => {
    const { create, remove, archive, get, clock } = accountsSetup();
    await create.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const bank = await create.execute(USER_ID, { kind: 'bank', name: 'CIC' });
    await remove.execute(USER_ID, bank.id);
    await expect(get.execute(USER_ID, bank.id)).rejects.toBeInstanceOf(AccountNotFound);

    const extra = await create.execute(USER_ID, { kind: 'cash', name: 'Coffre' });
    clock.advance(1000);
    const archived = await archive.execute(USER_ID, extra.id, true);
    expect(archived.archivedAt).toEqual(clock.now());
  });

  it('unarchives an account when archived is false', async () => {
    const { create, archive, list, clock } = accountsSetup();
    const cash = await create.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const extra = await create.execute(USER_ID, { kind: 'cash', name: 'Coffre' });
    clock.advance(1000);
    await archive.execute(USER_ID, extra.id, true);

    clock.advance(1000);
    const restored = await archive.execute(USER_ID, extra.id, false);
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toEqual(clock.now());
    expect((await list.execute(USER_ID)).map((account) => account.id)).toEqual([cash.id, extra.id]);
  });
});

describe('InMemoryAccountRepository', () => {
  it('saves, lists, and deletes accounts', async () => {
    const repo = new InMemoryAccountRepository();
    const account = Account.createCash({
      id: 'id-1',
      userId: USER_ID,
      name: 'Espèces',
      now: new Date('2026-09-20T10:00:00.000Z'),
    });
    await repo.save(account);
    expect(await repo.getById(account.id)).toEqual(account);
    expect(await repo.listByUser(USER_ID)).toEqual([account]);
    await repo.delete(account.id);
    expect(await repo.getById(account.id)).toBeNull();
  });
});
