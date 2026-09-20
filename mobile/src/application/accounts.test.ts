import { describe, expect, it } from '@jest/globals';
import { DEFAULT_ACCOUNT_COLOR } from '@wallet/shared';

import { AccountApiError } from '@/domain/ports';

import {
  ArchiveAccount,
  CreateCashAccount,
  DeleteAccount,
  GetAccount,
  ListAccounts,
  UpdateAccount,
} from './accounts';
import { InMemoryAccountRepository, makeBankAccount, makeCashAccount } from './fakes';

function useCases(repo = new InMemoryAccountRepository()) {
  return {
    repo,
    list: new ListAccounts(repo),
    get: new GetAccount(repo),
    createCash: new CreateCashAccount(repo),
    update: new UpdateAccount(repo),
    archive: new ArchiveAccount(repo),
    delete: new DeleteAccount(repo),
  };
}

describe('accounts', () => {
  it('lists active accounts and can include archived ones', async () => {
    const { repo, list } = useCases();
    repo.accounts = [
      makeCashAccount({ name: 'Espèces' }),
      makeBankAccount({ archivedAt: '2026-09-19T10:00:00.000Z' }),
    ];

    await expect(list.execute()).resolves.toEqual([makeCashAccount({ name: 'Espèces' })]);
    const withArchived = await list.execute({ includeArchived: true });
    expect(withArchived).toHaveLength(2);
  });

  it('creates a cash account with integer balanceCents at 0', async () => {
    const { createCash, get } = useCases();
    const created = await createCash.execute({
      name: 'Coffre',
      currency: 'EUR',
      color: DEFAULT_ACCOUNT_COLOR,
      excludeFromStats: false,
    });

    expect(created.kind).toBe('cash');
    expect(created.name).toBe('Coffre');
    expect(created.balanceCents).toBe(0);
    expect(created).not.toHaveProperty('iban');
    await expect(get.execute(created.id)).resolves.toEqual(created);
  });

  it('updates name, color, stats flag and balance alerts', async () => {
    const { repo, update } = useCases();
    repo.accounts = [makeCashAccount()];

    const next = await update.execute(repo.accounts[0]!.id, {
      name: 'Vacances',
      color: '#42A5F5',
      excludeFromStats: true,
      minBalanceCents: 0,
      maxBalanceCents: 10_000,
    });

    expect(next.name).toBe('Vacances');
    expect(next.color).toBe('#42A5F5');
    expect(next.excludeFromStats).toBe(true);
    expect(next.minBalanceCents).toBe(0);
    expect(next.maxBalanceCents).toBe(10_000);
  });

  it('archives and unarchives an account', async () => {
    const { repo, archive, list } = useCases();
    repo.accounts = [makeCashAccount()];
    const id = repo.accounts[0]!.id;

    const archived = await archive.execute(id, true);
    expect(archived.archivedAt).toBeTruthy();
    await expect(list.execute()).resolves.toEqual([]);

    const restored = await archive.execute(id, false);
    expect(restored.archivedAt).toBeNull();
    await expect(list.execute()).resolves.toHaveLength(1);
  });

  it('deletes a cash account when another active cash remains', async () => {
    const { repo, delete: remove } = useCases();
    repo.accounts = [
      makeCashAccount({ id: '11111111-1111-4111-8111-111111111111' }),
      makeCashAccount({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Coffre',
        position: 1,
      }),
    ];

    await remove.execute('22222222-2222-4222-8222-222222222222');
    expect(repo.accounts.map((account) => account.id)).toEqual([
      '11111111-1111-4111-8111-111111111111',
    ]);
  });

  it('refuses to delete the last active cash account', async () => {
    const { repo, delete: remove } = useCases();
    repo.accounts = [makeCashAccount(), makeBankAccount()];

    await expect(remove.execute(repo.accounts[0]!.id)).rejects.toBeInstanceOf(AccountApiError);
    await expect(remove.execute(repo.accounts[0]!.id)).rejects.toMatchObject({
      code: 'cannot_delete_last_cash_account',
    });
    expect(repo.accounts).toHaveLength(2);
  });

  it('disconnects a bank account by deleting it', async () => {
    const { repo, delete: remove } = useCases();
    repo.accounts = [makeCashAccount(), makeBankAccount()];

    await remove.execute(repo.accounts[1]!.id);
    expect(repo.accounts.map((account) => account.kind)).toEqual(['cash']);
  });
});
