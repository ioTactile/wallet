import type {
  CreateRecordBody,
  Record as WalletRecord,
  RecordsResponse,
  UpdateRecordBody,
} from '@wallet/shared';

import type { ListRecordsOptions } from '@/domain/list-options';
import type { Clock, IdGenerator, RecordRepository, WriteQueue } from '@/domain/ports';

import { shouldKeepQueuedWrite } from './write-queue';

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
  constructor(
    private readonly records: RecordRepository,
    private readonly queue: WriteQueue,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(body: CreateRecordBody): Promise<WalletRecord> {
    const idempotencyKey = this.ids.generate();
    const pendingId = this.ids.generate();
    await this.queue.enqueue({
      id: pendingId,
      kind: 'create_record',
      body,
      idempotencyKey,
      enqueuedAt: this.clock.nowIso(),
    });
    try {
      const created = await this.records.create(body, idempotencyKey);
      await this.queue.remove(pendingId);
      return created;
    } catch (error) {
      if (!shouldKeepQueuedWrite(error)) {
        await this.queue.remove(pendingId);
      }
      throw error;
    }
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
