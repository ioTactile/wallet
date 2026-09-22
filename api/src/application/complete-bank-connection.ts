import { Account } from '../domain/account.js';
import { BankLinkNotCompletable, BankLinkNotFound } from '../domain/errors.js';
import type { BankConnection } from '../domain/bank-connection.js';
import type { AccountRepository, BankLinkRepository, Clock, IdGenerator } from '../domain/ports.js';
import { nextPosition } from './ensure-default-cash-account.js';
import type { SyncBankAccount } from './sync-bank-account.js';

export class CompleteBankConnection {
  constructor(
    private readonly links: BankLinkRepository,
    private readonly accounts: AccountRepository,
    private readonly bank: BankConnection,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly sync: SyncBankAccount,
  ) {}

  async execute(userId: string, connectionId: string): Promise<Account[]> {
    const link = await this.links.getById(connectionId);
    if (!link || link.userId !== userId) {
      throw new BankLinkNotFound();
    }
    if (link.status === 'revoked') {
      throw new BankLinkNotCompletable();
    }

    await this.bank.ensureConsentForLink({
      providerConnectionId: link.providerConnectionId,
      linkId: link.id,
      userId,
    });

    const now = this.clock.now();
    const active = link.activate(now);
    if (active !== link) {
      await this.links.save(active);
    }

    const externalAccounts = await this.bank.listAccounts(active.providerConnectionId);
    const existing = await this.accounts.listByBankLink(active.id);
    const byExternalId = new Map(
      existing
        .filter((account) => account.externalAccountId != null)
        .map((account) => [account.externalAccountId, account]),
    );

    const synced: Account[] = [];
    for (const external of externalAccounts) {
      let account = byExternalId.get(external.externalId);
      if (!account) {
        const owned = await this.accounts.listByUser(userId, { includeArchived: true });
        account = Account.createBank({
          id: this.ids.generate(),
          userId,
          name: external.name,
          now,
          iban: external.iban,
          institutionName: external.institutionName,
          bankLinkId: active.id,
          externalAccountId: external.externalId,
          position: nextPosition(owned),
        });
        await this.accounts.save(account);
      }
      await this.sync.execute(userId, account.id);
      const updated = await this.accounts.getById(account.id);
      if (updated) {
        synced.push(updated);
      }
    }
    return synced;
  }
}
