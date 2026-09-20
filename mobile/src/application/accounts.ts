import type { Account, CreateAccountBody, UpdateAccountBody } from '@wallet/shared';

import type { AccountRepository, ListAccountsOptions } from '@/domain/ports';

export class ListAccounts {
  constructor(private readonly accounts: AccountRepository) {}

  execute(options?: ListAccountsOptions): Promise<Account[]> {
    return this.accounts.list(options);
  }
}

export class GetAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string): Promise<Account> {
    return this.accounts.getById(id);
  }
}

export class CreateCashAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(input: Omit<Extract<CreateAccountBody, { kind: 'cash' }>, 'kind'>): Promise<Account> {
    return this.accounts.create({ ...input, kind: 'cash' });
  }
}

export class UpdateAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string, body: UpdateAccountBody): Promise<Account> {
    return this.accounts.update(id, body);
  }
}

export class ArchiveAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string, archived: boolean): Promise<Account> {
    return this.accounts.archive(id, archived);
  }
}

export class DeleteAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string): Promise<void> {
    return this.accounts.delete(id);
  }
}
