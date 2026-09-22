import { describe, expect, it } from 'vitest';

import { AIS_EXPENSE_CATEGORY_ID, AIS_INCOME_CATEGORY_ID } from '@wallet/shared';

import {
  AccountNotFound,
  BankLinkNotCompletable,
  BankLinkNotFound,
  CannotDeleteAisRecord,
  CannotDisconnectAccount,
  CannotMutateAisRecord,
  CannotSyncAccount,
} from '../domain/errors.js';
import { CreateAccount } from './create-account.js';
import { CompleteBankConnection } from './complete-bank-connection.js';
import { DisconnectBankAccount } from './disconnect-bank-account.js';
import { FakeBankConnection, SANDBOX_CHECKING_EXTERNAL_ID } from './fake-bank-connection.js';
import {
  FixedClock,
  InMemoryAccountRepository,
  InMemoryBankLinkRepository,
  InMemoryRecordRepository,
  SequentialIds,
} from './fakes.js';
import { DeleteRecord, GetRecord } from './list-records.js';
import { StartBankConnection } from './start-bank-connection.js';
import { SyncBankAccount } from './sync-bank-account.js';
import { UpdateRecord } from './update-record.js';

const USER_ID = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';
const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REDIRECT = 'mobile://bank/callback';

function setup() {
  const accounts = new InMemoryAccountRepository();
  const records = new InMemoryRecordRepository();
  const links = new InMemoryBankLinkRepository();
  const ids = new SequentialIds();
  const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));
  const bank = new FakeBankConnection('http://127.0.0.1:3000');
  const sync = new SyncBankAccount(accounts, records, links, bank, ids, clock);
  return {
    accounts,
    records,
    links,
    clock,
    bank,
    createAccount: new CreateAccount(accounts, ids, clock),
    start: new StartBankConnection(links, bank, ids, clock),
    complete: new CompleteBankConnection(links, accounts, bank, ids, clock, sync),
    sync,
    disconnect: new DisconnectBankAccount(accounts, links, bank, clock),
    update: new UpdateRecord(records, accounts, clock),
    getRecord: new GetRecord(records),
    deleteRecord: new DeleteRecord(records),
  };
}

describe('bank connection use cases', () => {
  it('starts a pending sandbox consent with an authorize URL', async () => {
    const { start, links } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    expect(started.id).toBe('id-1');
    expect(started.authorizationUrl).toContain('/bank/sandbox/authorize');
    expect(started.authorizationUrl).toContain('connectionId=id-1');
    expect((await links.getById(started.id))?.status).toBe('pending');
    expect((await links.getById(started.id))?.provider).toBe('sandbox');
  });

  it('completes a connection by creating the demo bank account and importing AIS records', async () => {
    const { start, complete, records } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    const accounts = await complete.execute(USER_ID, started.id);

    expect(accounts).toHaveLength(1);
    const bank = accounts[0]!;
    expect(bank.kind).toBe('bank');
    expect(bank.name).toBe('Compte courant');
    expect(bank.iban).toBe('FR7630001007941234567890185');
    expect(bank.institutionName).toBe('Banque démo');
    expect(bank.externalAccountId).toBe(SANDBOX_CHECKING_EXTERNAL_ID);
    expect(bank.lastSyncedAt).toEqual(new Date('2026-09-20T10:00:00.000Z'));

    const imported = await records.listByUser(USER_ID);
    expect(imported).toHaveLength(8);
    expect(imported.some((record) => record.kind === 'income')).toBe(true);
    expect(imported.filter((record) => record.kind === 'expense').length).toBeGreaterThan(0);
    expect(imported.find((record) => record.note === 'Café')?.clearing).toBe('uncleared');
    expect(imported.every((record) => record.categoryConfirmed === false)).toBe(true);
    expect(imported.find((record) => record.note === 'Carrefour')?.categoryId).toBe(
      'food_drinks.groceries',
    );
    expect(imported.find((record) => record.note === 'Salaire')?.categoryId).toBe(
      'income.wage_invoices',
    );
    expect(imported.find((record) => record.note === 'EDF')?.categoryId).toBe(
      'housing.energy_utilities',
    );
    expect(imported.find((record) => record.note === 'Spotify')?.categoryId).toBe(
      'life_entertainment.tv_streaming',
    );
    expect(imported.find((record) => record.note === 'Loyer')?.categoryId).toBe('housing.rent');
    expect(imported.find((record) => record.note === 'Remboursement')?.categoryId).toBe(
      'income.refunds',
    );
    expect(imported.find((record) => record.note === 'Restaurant')?.categoryId).toBe(
      'food_drinks.restaurant_fast_food',
    );
    expect(imported.find((record) => record.note === 'Café')?.categoryId).toBe(
      'food_drinks.bar_cafe',
    );
  });

  it('is idempotent on complete and preserves user categories on resync', async () => {
    const { start, complete, sync, records, update, clock, bank } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    const [account] = await complete.execute(USER_ID, started.id);
    const again = await complete.execute(USER_ID, started.id);
    expect(again).toHaveLength(1);
    expect(again[0]?.id).toBe(account?.id);
    expect(await records.listByUser(USER_ID)).toHaveLength(8);

    const carrefour = (await records.listByUser(USER_ID)).find(
      (record) => record.note === 'Carrefour',
    )!;
    clock.advance(1000);
    await update.execute(USER_ID, carrefour.id, { categoryId: 'food_drinks.groceries' });

    bank.extraTransactions.push({
      externalId: 'sandbox-tx-extra',
      accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
      signedAmountCents: -12_00,
      bookedAt: new Date('2026-09-21T10:00:00.000Z'),
      label: 'Boulangerie',
      pending: false,
    });
    const result = await sync.execute(USER_ID, account!.id);
    expect(result.importedCount).toBe(1);
    const listed = await records.listByUser(USER_ID);
    expect(listed).toHaveLength(9);
    expect(listed.find((record) => record.id === carrefour.id)?.categoryId).toBe(
      'food_drinks.groceries',
    );
    expect(listed.find((record) => record.note === 'Boulangerie')?.categoryId).toBe(
      AIS_EXPENSE_CATEGORY_ID,
    );
    expect(listed.find((record) => record.note === 'Boulangerie')?.categoryConfirmed).toBe(false);
    expect(bank.lastFrom).toEqual(new Date('2026-09-20T10:00:00.000Z'));
  });

  it('prefills a known label without confirming it', async () => {
    const { start, complete, sync, records, bank } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    const [account] = await complete.execute(USER_ID, started.id);
    bank.extraTransactions.push({
      externalId: 'sandbox-tx-leclerc',
      accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
      signedAmountCents: -76_40,
      bookedAt: new Date('2026-09-21T10:00:00.000Z'),
      label: 'E.LECLERC CB*0098',
      pending: false,
    });

    await sync.execute(USER_ID, account!.id);
    const leclerc = (await records.listByUser(USER_ID)).find((record) =>
      record.note.includes('LECLERC'),
    );
    expect(leclerc?.categoryId).toBe('food_drinks.groceries');
    expect(leclerc?.categoryConfirmed).toBe(false);
  });

  it('remembers a confirmed category for the same account label without confirming the new record', async () => {
    const { start, complete, sync, records, update, clock, bank } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    const [account] = await complete.execute(USER_ID, started.id);
    bank.extraTransactions.push({
      externalId: 'sandbox-tx-qingle',
      accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
      signedAmountCents: 6_00,
      bookedAt: new Date('2026-09-21T10:00:00.000Z'),
      label: 'VIR INST MLLE QINGLET',
      pending: false,
    });
    await sync.execute(USER_ID, account!.id);
    const first = (await records.listByUser(USER_ID)).find((record) =>
      record.note.includes('QINGLET'),
    )!;
    expect(first.categoryId).toBe(AIS_INCOME_CATEGORY_ID);
    expect(first.categoryConfirmed).toBe(false);

    clock.advance(1000);
    await update.execute(USER_ID, first.id, {
      categoryId: 'income.refunds',
      categoryConfirmed: true,
    });

    bank.extraTransactions.push({
      externalId: 'sandbox-tx-qingle-2',
      accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
      signedAmountCents: 12_00,
      bookedAt: new Date('2026-09-22T10:00:00.000Z'),
      label: 'VIR INST MLLE QINGLET',
      pending: false,
    });
    clock.advance(1000);
    await sync.execute(USER_ID, account!.id);

    const imported = (await records.listByUser(USER_ID)).filter((record) =>
      record.note.includes('QINGLET'),
    );
    expect(imported).toHaveLength(2);
    const second = imported.find((record) => record.id !== first.id);
    expect(second?.categoryId).toBe('income.refunds');
    expect(second?.categoryConfirmed).toBe(false);
    expect(imported.find((record) => record.id === first.id)?.categoryConfirmed).toBe(true);
  });

  it('does not rewrite a confirmed category when the bank snapshot is applied again', async () => {
    const { start, complete, sync, records, update, clock } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    const [account] = await complete.execute(USER_ID, started.id);
    const carrefour = (await records.listByUser(USER_ID)).find(
      (record) => record.note === 'Carrefour',
    )!;
    clock.advance(1000);
    await update.execute(USER_ID, carrefour.id, { categoryConfirmed: true });

    const result = await sync.execute(USER_ID, account!.id);
    expect(result.importedCount).toBe(0);
    const kept = await records.getById(carrefour.id);
    expect(kept?.categoryId).toBe('food_drinks.groceries');
    expect(kept?.categoryConfirmed).toBe(true);
  });

  it('rejects complete/sync/disconnect for the wrong user or cash accounts', async () => {
    const { start, complete, sync, disconnect, createAccount } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    await expect(complete.execute(OTHER_USER, started.id)).rejects.toBeInstanceOf(BankLinkNotFound);
    await expect(complete.execute(USER_ID, 'missing')).rejects.toBeInstanceOf(BankLinkNotFound);

    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    await expect(sync.execute(USER_ID, cash.id)).rejects.toBeInstanceOf(CannotSyncAccount);
    await expect(disconnect.execute(USER_ID, cash.id)).rejects.toBeInstanceOf(
      CannotDisconnectAccount,
    );
    await expect(sync.execute(USER_ID, 'missing')).rejects.toBeInstanceOf(AccountNotFound);
  });

  it('archives a bank account on disconnect and revokes the sandbox consent', async () => {
    const { start, complete, disconnect, links, bank, sync } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    const [account] = await complete.execute(USER_ID, started.id);
    const disconnected = await disconnect.execute(USER_ID, account!.id);
    expect(disconnected.archivedAt).not.toBeNull();
    expect((await links.getById(started.id))?.status).toBe('revoked');
    await expect(sync.execute(USER_ID, account!.id)).rejects.toBeInstanceOf(CannotSyncAccount);
    await expect(complete.execute(USER_ID, started.id)).rejects.toBeInstanceOf(
      BankLinkNotCompletable,
    );
    await expect(bank.listAccounts(`sandbox:${started.id}`)).rejects.toThrow('revoked');
  });

  it('allows recategorizing an AIS record but forbids amount edits and deletion', async () => {
    const { start, complete, records, update, deleteRecord } = setup();
    const started = await start.execute(USER_ID, REDIRECT);
    await complete.execute(USER_ID, started.id);
    const ais = (await records.listByUser(USER_ID)).find((record) => record.note === 'Carrefour')!;

    const recategorized = await update.execute(USER_ID, ais.id, {
      categoryId: 'food_drinks.groceries',
      note: 'Courses',
    });
    expect(recategorized.categoryId).toBe('food_drinks.groceries');
    expect(recategorized.note).toBe('Courses');

    await expect(update.execute(USER_ID, ais.id, { amountCents: 10 })).rejects.toBeInstanceOf(
      CannotMutateAisRecord,
    );
    await expect(deleteRecord.execute(USER_ID, ais.id)).rejects.toBeInstanceOf(
      CannotDeleteAisRecord,
    );
  });

  it('converts an AIS expense to a transfer and still matches it on the next sync', async () => {
    const { start, complete, createAccount, records, update, sync } = setup();
    const cash = await createAccount.execute(USER_ID, { kind: 'cash', name: 'Espèces' });
    const started = await start.execute(USER_ID, REDIRECT);
    const [bank] = await complete.execute(USER_ID, started.id);
    const ais = (await records.listByUser(USER_ID)).find((record) => record.note === 'Carrefour')!;

    const transfer = await update.execute(USER_ID, ais.id, {
      kind: 'transfer',
      toAccountId: cash.id,
    });
    expect(transfer.kind).toBe('transfer');
    expect(transfer.accountId).toBe(bank!.id);
    expect(transfer.counterpartyAccountId).toBe(cash.id);
    expect(transfer.externalId).toBe(ais.externalId);

    const synced = await sync.execute(USER_ID, bank!.id);
    expect(synced.importedCount).toBe(0);
    const kept = await records.getById(ais.id);
    expect(kept?.kind).toBe('transfer');
    expect(kept?.counterpartyAccountId).toBe(cash.id);
  });
});
