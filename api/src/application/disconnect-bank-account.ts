import type { Account } from '../domain/account.js';
import { AccountNotFound, CannotDisconnectAccount } from '../domain/errors.js';
import type { BankConnection } from '../domain/bank-connection.js';
import type { AccountRepository, BankLinkRepository, Clock } from '../domain/ports.js';

export class DisconnectBankAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly links: BankLinkRepository,
    private readonly bank: BankConnection,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, accountId: string): Promise<Account> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }
    if (account.kind !== 'bank') {
      throw new CannotDisconnectAccount();
    }

    const now = this.clock.now();
    const archived = account.archive(now);
    await this.accounts.save(archived);

    if (account.bankLinkId == null) {
      return archived;
    }

    const siblings = await this.accounts.listByBankLink(account.bankLinkId);
    const otherActive = siblings.some(
      (candidate) => candidate.id !== account.id && candidate.archivedAt === null,
    );
    if (otherActive) {
      return archived;
    }

    const link = await this.links.getById(account.bankLinkId);
    if (link && link.status !== 'revoked') {
      await this.bank.revoke(link.providerConnectionId);
      await this.links.save(link.revoke(now));
    }
    return archived;
  }
}
