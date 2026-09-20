import type { Account } from '../domain/account.js';
import { AccountNotFound } from '../domain/errors.js';
import type { AccountRepository, Clock } from '../domain/ports.js';

export class ArchiveAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, accountId: string, archived: boolean): Promise<Account> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }
    const next = archived ? account.archive(this.clock.now()) : account.unarchive(this.clock.now());
    await this.accounts.save(next);
    return next;
  }
}
