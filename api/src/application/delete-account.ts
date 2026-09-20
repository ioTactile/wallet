import { AccountNotFound, CannotDeleteLastCashAccount } from '../domain/errors.js';
import type { AccountRepository } from '../domain/ports.js';

export class DeleteAccount {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(userId: string, accountId: string): Promise<void> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }

    if (account.kind === 'cash' && account.archivedAt === null) {
      const others = await this.accounts.listByUser(userId, { includeArchived: true });
      const otherActiveCash = others.filter(
        (candidate) =>
          candidate.kind === 'cash' && candidate.archivedAt === null && candidate.id !== account.id,
      );
      if (otherActiveCash.length === 0) {
        throw new CannotDeleteLastCashAccount();
      }
    }

    await this.accounts.delete(account.id);
  }
}
