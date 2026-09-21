import type { ListRecordsQuery, RecordsResponse } from '@wallet/shared';

import { CannotDeleteAisRecord, RecordNotFound } from '../domain/errors.js';
import type { RecordRepository } from '../domain/ports.js';
import { mapRecord, summarizeRecords } from './map-record.js';

export class ListRecords {
  constructor(private readonly records: RecordRepository) {}

  async execute(userId: string, query: ListRecordsQuery): Promise<RecordsResponse> {
    const mapped = (await this.records.listByUser(userId)).map(mapRecord);
    return summarizeRecords(mapped, query.from, query.to, query.accountIds);
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
