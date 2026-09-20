import type { Account } from '../domain/account.js';
import { AccountNotFound } from '../domain/errors.js';
import type { AccountRepository } from '../domain/ports.js';

export class GetAccount {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(userId: string, accountId: string): Promise<Account> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }
    return account;
  }
}
