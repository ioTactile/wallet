import { isManualLedger, type UpdateRecordBody } from '@wallet/shared';

import type { Account } from '../domain/account.js';
import {
  AccountNotFound,
  CannotMutateAisRecord,
  InvalidRecord,
  ManualRecordOnBank,
  RecordNotFound,
} from '../domain/errors.js';
import type { AccountRepository, Clock, RecordRepository } from '../domain/ports.js';
import type { LedgerRecord } from '../domain/record.js';

export class UpdateRecord {
  constructor(
    private readonly records: RecordRepository,
    private readonly accounts: AccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, recordId: string, input: UpdateRecordBody): Promise<LedgerRecord> {
    const record = await this.records.getById(recordId);
    if (!record || record.userId !== userId) {
      throw new RecordNotFound();
    }

    const now = this.clock.now();
    let next = record;

    if (record.isAis) {
      if (
        input.amountCents != null ||
        input.bookedAt != null ||
        input.accountId != null ||
        input.clearing != null
      ) {
        throw new CannotMutateAisRecord();
      }
    }

    if (input.kind != null && input.kind !== record.kind) {
      next = await this.convertKind(userId, next, input, now);
    } else if (next.kind === 'transfer') {
      if (input.categoryId != null || input.accountId != null) {
        throw new InvalidRecord('Transfers have no category or single account');
      }
      const fromId = input.fromAccountId ?? next.accountId;
      const toId = input.toAccountId ?? next.counterpartyAccountId;
      if (toId == null) {
        throw new InvalidRecord('Transfers require a destination account');
      }
      if (input.fromAccountId != null || input.toAccountId != null) {
        await this.requireActiveAccount(userId, fromId);
        await this.requireActiveAccount(userId, toId);
        next = next.setTransferAccounts(fromId, toId, now);
      }
    } else {
      if (input.fromAccountId != null || input.toAccountId != null) {
        throw new InvalidRecord('Expense and income have a single account');
      }
      if (input.accountId != null) {
        const account = await this.requireActiveAccount(userId, input.accountId);
        if (!isManualLedger(account.kind)) {
          throw new ManualRecordOnBank();
        }
        next = next.moveToAccount(account.id, now);
      }
      if (input.categoryId != null) {
        next = next.recategorize(input.categoryId, now);
      }
    }

    if (input.amountCents != null) {
      next = next.setAmount(input.amountCents, now);
    }
    if (input.bookedAt != null) {
      next = next.setBookedAt(new Date(input.bookedAt), now);
    }
    if (input.clearing != null) {
      next = next.setClearing(input.clearing, now);
    }
    if (input.note != null) {
      next = next.setNote(input.note, now);
    }

    await this.records.save(next);
    return next;
  }

  private async convertKind(
    userId: string,
    record: LedgerRecord,
    input: UpdateRecordBody,
    now: Date,
  ): Promise<LedgerRecord> {
    if (input.kind === 'transfer') {
      const otherId = record.kind === 'income' ? input.fromAccountId : input.toAccountId;
      if (otherId == null) {
        throw new InvalidRecord('Transfers require a destination account');
      }
      await this.requireActiveAccount(userId, record.accountId);
      await this.requireActiveAccount(userId, otherId);
      return record.convertToTransfer(otherId, now);
    }

    if (input.kind !== 'expense' && input.kind !== 'income') {
      throw new InvalidRecord('Invalid kind');
    }
    if (input.categoryId == null) {
      throw new InvalidRecord('Category is required');
    }
    return record.convertToLedger(input.kind, input.categoryId, now);
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
