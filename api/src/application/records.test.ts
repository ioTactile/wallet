import { describe, expect, it } from 'vitest';

import {
  AccountNotFound,
  CannotDeleteAccountWithRecords,
  InvalidRecord,
  ManualRecordOnBank,
  RecordNotFound,
} from '../domain/errors.js';
import { CreateAccount } from './create-account.js';
import { CreateRecord } from './create-record.js';
import { DeleteAccount } from './delete-account.js';
import { DeleteRecord, GetRecord, ListRecords } from './list-records.js';
import {
  FixedClock,
  InMemoryAccountRepository,
  InMemoryRecordRepository,
  SequentialIds,
} from './fakes.js';
import { GetAccountBalances } from './get-account-balances.js';
import { mapRecord } from './map-record.js';
import { UpdateRecord } from './update-record.js';

const USER_ID = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';
const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FROM = '2026-09-01T00:00:00.000Z';
const TO = '2026-09-30T23:59:59.000Z';

function setup() {
  const accounts = new InMemoryAccountRepository();
  const records = new InMemoryRecordRepository();
  const ids = new SequentialIds();
  const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));
  return {
    accounts,
    records,
    clock,
    createAccount: new CreateAccount(accounts, ids, clock),
    create: new CreateRecord(records, accounts, ids, clock),
    list: new ListRecords(records),
    get: new GetRecord(records),
    update: new UpdateRecord(records, accounts, clock),
    remove: new DeleteRecord(records),
    balances: new GetAccountBalances(records),
    deleteAccount: new DeleteAccount(accounts, records),
  };
}

describe('record use cases', () => {
  it('creates a cash expense and lists it in the period with signed totals', async () => {
    const { createAccount, create, list } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });

    const record = await create.execute(USER_ID, {
      kind: 'expense',
      accountId: cash.id,
      categoryId: 'food_drinks.groceries',
      amountCents: 199,
      note: 'Courses',
    });

    expect(record.kind).toBe('expense');
    expect(record.amountCents).toBe(199);
    const dto = mapRecord(record);
    expect(dto.kind).toBe('expense');
    if (dto.kind !== 'expense') throw new Error('expected expense');
    expect(dto.accountId).toBe(cash.id);

    const listed = await list.execute(USER_ID, { from: FROM, to: TO });
    expect(listed.records).toHaveLength(1);
    expect(listed.records[0]?.kind).toBe('expense');
    expect(listed.periodNetCents).toBe(-199);
    expect(listed.openingBalanceCents).toBe(0);
  });

  it('rejects manual expense on a bank account and missing accounts', async () => {
    const { createAccount, create } = setup();
    const bank = await createAccount.execute(USER_ID, { kind: 'bank', name: 'CIC' });

    await expect(
      create.execute(USER_ID, {
        kind: 'expense',
        accountId: bank.id,
        categoryId: 'food_drinks',
        amountCents: 100,
      }),
    ).rejects.toBeInstanceOf(ManualRecordOnBank);

    await expect(
      create.execute(USER_ID, {
        kind: 'expense',
        accountId: 'missing',
        categoryId: 'food_drinks',
        amountCents: 100,
      }),
    ).rejects.toBeInstanceOf(AccountNotFound);
  });

  it('creates a transfer between cash and bank and nets it when listing all accounts', async () => {
    const { createAccount, create, list, balances } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const bank = await createAccount.execute(USER_ID, { kind: 'bank', name: 'CIC' });

    await create.execute(USER_ID, {
      kind: 'transfer',
      fromAccountId: cash.id,
      toAccountId: bank.id,
      amountCents: 40_00,
    });

    const all = await list.execute(USER_ID, { from: FROM, to: TO });
    expect(all.records).toHaveLength(1);
    expect(all.periodNetCents).toBe(0);

    const cashOnly = await list.execute(USER_ID, {
      from: FROM,
      to: TO,
      accountIds: [cash.id],
    });
    expect(cashOnly.periodNetCents).toBe(-40_00);

    const byAccount = await balances.execute(USER_ID);
    expect(byAccount.get(cash.id)).toBe(-40_00);
    expect(byAccount.get(bank.id)).toBe(40_00);
  });

  it('uses records before the period as opening balance', async () => {
    const { createAccount, create, list, clock } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    await create.execute(USER_ID, {
      kind: 'income',
      accountId: cash.id,
      categoryId: 'income.refunds',
      amountCents: 1000,
      bookedAt: '2026-08-15T10:00:00.000Z',
    });
    clock.advance(1000);
    await create.execute(USER_ID, {
      kind: 'expense',
      accountId: cash.id,
      categoryId: 'food_drinks',
      amountCents: 200,
    });

    const listed = await list.execute(USER_ID, { from: FROM, to: TO });
    expect(listed.records).toHaveLength(1);
    expect(listed.openingBalanceCents).toBe(1000);
    expect(listed.periodNetCents).toBe(-200);
  });

  it('updates note, category and clearing of an owned expense', async () => {
    const { createAccount, create, update, get, clock } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const record = await create.execute(USER_ID, {
      kind: 'expense',
      accountId: cash.id,
      categoryId: 'food_drinks',
      amountCents: 100,
    });
    clock.advance(1000);

    const updated = await update.execute(USER_ID, record.id, {
      categoryId: 'shopping.home_garden',
      note: 'Amazon',
      clearing: 'uncleared',
    });
    expect(updated.categoryId).toBe('shopping.home_garden');
    expect(updated.note).toBe('Amazon');
    expect(updated.clearing).toBe('uncleared');
    expect((await get.execute(USER_ID, record.id)).note).toBe('Amazon');
  });

  it('converts an expense to a transfer and back to an expense', async () => {
    const { createAccount, create, update, list } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const bank = await createAccount.execute(USER_ID, { kind: 'bank', name: 'CIC' });
    const record = await create.execute(USER_ID, {
      kind: 'expense',
      accountId: cash.id,
      categoryId: 'food_drinks',
      amountCents: 199,
    });

    const transfer = await update.execute(USER_ID, record.id, {
      kind: 'transfer',
      toAccountId: bank.id,
    });
    expect(transfer.kind).toBe('transfer');
    expect(transfer.accountId).toBe(cash.id);
    expect(transfer.counterpartyAccountId).toBe(bank.id);
    expect(transfer.categoryId).toBeNull();

    const all = await list.execute(USER_ID, { from: FROM, to: TO });
    expect(all.periodNetCents).toBe(0);

    const restored = await update.execute(USER_ID, record.id, {
      kind: 'expense',
      categoryId: 'food_drinks.groceries',
    });
    expect(restored.kind).toBe('expense');
    expect(restored.accountId).toBe(cash.id);
    expect(restored.categoryId).toBe('food_drinks.groceries');
  });

  it('converts income to a transfer incoming onto the original account', async () => {
    const { createAccount, create, update } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const bank = await createAccount.execute(USER_ID, { kind: 'bank', name: 'CIC' });
    const record = await create.execute(USER_ID, {
      kind: 'income',
      accountId: cash.id,
      categoryId: 'income.refunds',
      amountCents: 500,
    });

    const transfer = await update.execute(USER_ID, record.id, {
      kind: 'transfer',
      fromAccountId: bank.id,
    });
    expect(transfer.kind).toBe('transfer');
    expect(transfer.accountId).toBe(bank.id);
    expect(transfer.counterpartyAccountId).toBe(cash.id);
  });

  it('hides records of other users and rejects empty updates on missing ids', async () => {
    const { createAccount, create, get, remove } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const record = await create.execute(USER_ID, {
      kind: 'income',
      accountId: cash.id,
      categoryId: 'income.refunds',
      amountCents: 50,
    });

    await expect(get.execute(OTHER_USER, record.id)).rejects.toBeInstanceOf(RecordNotFound);
    await expect(remove.execute(OTHER_USER, record.id)).rejects.toBeInstanceOf(RecordNotFound);
    await remove.execute(USER_ID, record.id);
    await expect(get.execute(USER_ID, record.id)).rejects.toBeInstanceOf(RecordNotFound);
  });

  it('refuses to delete an account that still has records', async () => {
    const { createAccount, create, deleteAccount } = setup();
    await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const extra = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Coffre' });
    await create.execute(USER_ID, {
      kind: 'expense',
      accountId: extra.id,
      categoryId: 'food_drinks',
      amountCents: 10,
    });

    await expect(deleteAccount.execute(USER_ID, extra.id)).rejects.toBeInstanceOf(
      CannotDeleteAccountWithRecords,
    );
  });

  it('rejects writing on an archived cash account', async () => {
    const { accounts, createAccount, create, clock } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    clock.advance(1000);
    await accounts.save(cash.archive(clock.now()));

    await expect(
      create.execute(USER_ID, {
        kind: 'expense',
        accountId: cash.id,
        categoryId: 'food_drinks',
        amountCents: 10,
      }),
    ).rejects.toBeInstanceOf(InvalidRecord);
  });
});
