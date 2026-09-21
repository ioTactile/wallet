import { isManualLedger, type CreateRecordBody } from '@wallet/shared';

import type { Account } from '../domain/account.js';
import { AccountNotFound, InvalidRecord, ManualRecordOnBank } from '../domain/errors.js';
import type { AccountRepository, Clock, IdGenerator, RecordRepository } from '../domain/ports.js';
import { LedgerRecord } from '../domain/record.js';

export class CreateRecord {
  constructor(
    private readonly records: RecordRepository,
    private readonly accounts: AccountRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, input: CreateRecordBody): Promise<LedgerRecord> {
    const now = this.clock.now();
    const bookedAt = input.bookedAt ? new Date(input.bookedAt) : now;

    if (input.kind === 'transfer') {
      const from = await this.requireActiveAccount(userId, input.fromAccountId);
      const to = await this.requireActiveAccount(userId, input.toAccountId);
      const record = LedgerRecord.createTransfer({
        id: this.ids.generate(),
        userId,
        accountId: from.id,
        counterpartyAccountId: to.id,
        amountCents: input.amountCents,
        now,
        bookedAt,
        clearing: input.clearing,
        note: input.note,
      });
      await this.records.save(record);
      return record;
    }

    const account = await this.requireActiveAccount(userId, input.accountId);
    if (!isManualLedger(account.kind)) {
      throw new ManualRecordOnBank();
    }

    const payload = {
      id: this.ids.generate(),
      userId,
      accountId: account.id,
      categoryId: input.categoryId,
      amountCents: input.amountCents,
      now,
      bookedAt,
      clearing: input.clearing,
      note: input.note,
    };
    const record =
      input.kind === 'expense'
        ? LedgerRecord.createExpense(payload)
        : LedgerRecord.createIncome(payload);
    await this.records.save(record);
    return record;
  }

  private async requireActiveAccount(userId: string, accountId: string): Promise<Account> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }
    if (account.archivedAt) {
      throw new InvalidRecord('Account is archived');
    }
    return account;
  }
}
