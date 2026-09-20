import type { Account } from '../domain/account.js';
import type { AccountRepository } from '../domain/ports.js';
import type { EnsureDefaultCashAccount } from './ensure-default-cash-account.js';

export class ListAccounts {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly ensureDefaultCash: EnsureDefaultCashAccount,
  ) {}

  async execute(userId: string, options?: { includeArchived?: boolean }): Promise<Account[]> {
    await this.ensureDefaultCash.execute(userId);
    return this.accounts.listByUser(userId, options);
  }
}
