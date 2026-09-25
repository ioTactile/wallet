import type { ListRecordsQuery } from '@wallet/shared';

import { CannotDeleteAisRecord, RecordNotFound } from '../domain/errors.js';
import { summarizeLedgerRecords, type ListedRecords } from '../domain/ledger-summary.js';
import type { RecordRepository } from '../domain/ports.js';

export class ListRecords {
  constructor(private readonly records: RecordRepository) {}

  async execute(userId: string, query: ListRecordsQuery): Promise<ListedRecords> {
    const all = await this.records.listByUser(userId);
    return summarizeLedgerRecords(all, new Date(query.from), new Date(query.to), query.accountIds);
  }
}

export class GetRecord {
  constructor(private readonly records: RecordRepository) {}

  async execute(userId: string, recordId: string) {
    const record = await this.records.getById(recordId);
    if (!record || record.userId !== userId) {
      throw new RecordNotFound();
    }
    return record;
  }
}

export class DeleteRecord {
  constructor(private readonly records: RecordRepository) {}

  async execute(userId: string, recordId: string): Promise<void> {
    const record = await this.records.getById(recordId);
    if (!record || record.userId !== userId) {
      throw new RecordNotFound();
    }
    if (record.isAis) {
      throw new CannotDeleteAisRecord();
    }
    await this.records.delete(record.id);
  }
}
