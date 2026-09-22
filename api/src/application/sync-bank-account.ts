import { canSyncFromBank, suggestCategory, type CategoryMemory } from '@wallet/shared';

import { AccountNotFound, CannotSyncAccount } from '../domain/errors.js';
import type { BankConnection } from '../domain/bank-connection.js';
import type {
  AccountRepository,
  BankLinkRepository,
  Clock,
  IdGenerator,
  RecordRepository,
} from '../domain/ports.js';
import { LedgerRecord } from '../domain/record.js';

export type SyncBankAccountResult = {
  importedCount: number;
};

export class SyncBankAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly records: RecordRepository,
    private readonly links: BankLinkRepository,
    private readonly bank: BankConnection,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, accountId: string): Promise<SyncBankAccountResult> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }
    if (
      !canSyncFromBank(account.kind) ||
      account.bankLinkId == null ||
      account.externalAccountId == null
    ) {
      throw new CannotSyncAccount();
    }
    if (account.archivedAt) {
      throw new CannotSyncAccount('Account is archived');
    }

    const link = await this.links.getById(account.bankLinkId);
    if (!link || link.userId !== userId || !link.isActive) {
      throw new CannotSyncAccount();
    }

    const now = this.clock.now();
    const transactions = await this.bank.listTransactions(
      link.providerConnectionId,
      account.externalAccountId,
      account.lastSyncedAt ? { from: account.lastSyncedAt } : undefined,
    );

    const history = categoryMemory(await this.records.listByUser(userId));
    let importedCount = 0;
    for (const transaction of transactions) {
      if (transaction.signedAmountCents === 0) {
        continue;
      }
      const existing = await this.records.findByExternalId(account.id, transaction.externalId);
      if (!existing) {
        const kind = transaction.signedAmountCents < 0 ? 'expense' : 'income';
        await this.records.save(
          LedgerRecord.createFromAis({
            id: this.ids.generate(),
            userId,
            accountId: account.id,
            signedAmountCents: transaction.signedAmountCents,
            externalId: transaction.externalId,
            label: transaction.label,
            categoryId:
              suggestCategory({
                label: transaction.label,
                kind,
                accountId: account.id,
                history,
              }) ?? undefined,
            bookedAt: transaction.bookedAt,
            clearing: transaction.pending ? 'uncleared' : 'cleared',
            now,
          }),
        );
        importedCount += 1;
        continue;
      }
      await this.records.save(
        existing.applyAisSnapshot(
          {
            signedAmountCents: transaction.signedAmountCents,
            bookedAt: transaction.bookedAt,
            pending: transaction.pending,
            label: transaction.label,
          },
          now,
        ),
      );
    }

    await this.accounts.save(account.markSynced(now));
    await this.links.save(link.markSynced(now));
    return { importedCount };
  }
}

function categoryMemory(records: readonly LedgerRecord[]): CategoryMemory[] {
  return records.flatMap((record) => {
    if (record.kind === 'transfer' || record.categoryId == null) {
      return [];
    }
    return [
      {
        accountId: record.accountId,
        label: record.note,
        kind: record.kind,
        categoryId: record.categoryId,
        categoryConfirmed: record.categoryConfirmed,
      },
    ];
  });
}
