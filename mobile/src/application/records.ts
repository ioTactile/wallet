import type {
  CreateRecordBody,
  Record as WalletRecord,
  RecordsResponse,
  UpdateRecordBody,
} from '@wallet/shared';

import type { ListRecordsOptions, RecordRepository } from '@/domain/ports';

export class ListRecords {
  constructor(private readonly records: RecordRepository) {}

  execute(options: ListRecordsOptions): Promise<RecordsResponse> {
    return this.records.list(options);
  }
}

export class GetRecord {
  constructor(private readonly records: RecordRepository) {}

  execute(id: string): Promise<WalletRecord> {
    return this.records.getById(id);
  }
}

export class CreateRecord {
  constructor(private readonly records: RecordRepository) {}

  execute(body: CreateRecordBody): Promise<WalletRecord> {
    return this.records.create(body);
  }
}

export class UpdateRecord {
  constructor(private readonly records: RecordRepository) {}

  execute(id: string, body: UpdateRecordBody): Promise<WalletRecord> {
    return this.records.update(id, body);
  }
}

export class DeleteRecord {
  constructor(private readonly records: RecordRepository) {}

  execute(id: string): Promise<void> {
    return this.records.delete(id);
  }
}
