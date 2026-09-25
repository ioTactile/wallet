import type {
  Account,
  CreateAccountBody,
  CreateRecordBody,
  Record as WalletRecord,
} from '@wallet/shared';

import { AccountApiError, RecordApiError } from '@/domain/errors';
import type {
  AccountRepository,
  Clock,
  IdGenerator,
  RecordRepository,
  WriteQueue,
} from '@/domain/ports';
import type { PendingWrite } from '@/domain/pending-write';

export function shouldKeepQueuedWrite(error: unknown): boolean {
  if (error instanceof RecordApiError || error instanceof AccountApiError) {
    return error.code === 'unauthorized' || error.code === 'idempotency_in_progress';
  }
  return true;
}

export class FlushWriteQueue {
  constructor(
    private readonly records: RecordRepository,
    private readonly accounts: AccountRepository,
    private readonly queue: WriteQueue,
  ) {}

  async execute(): Promise<number> {
    let flushed = 0;
    for (const item of await this.queue.list()) {
      try {
        if (item.kind === 'create_record') {
          await this.records.create(item.body, item.idempotencyKey);
        } else {
          await this.accounts.create(item.body, item.idempotencyKey);
        }
        await this.queue.remove(item.id);
        flushed += 1;
      } catch (error) {
        if (shouldKeepQueuedWrite(error)) {
          return flushed;
        }
        await this.queue.remove(item.id);
      }
    }
    return flushed;
  }
}

export class InMemoryWriteQueue implements WriteQueue {
  items: PendingWrite[] = [];

  async list(): Promise<PendingWrite[]> {
    return [...this.items];
  }

  async enqueue(item: PendingWrite): Promise<void> {
    this.items = [...this.items.filter((entry) => entry.id !== item.id), item];
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== id);
  }
}

export class InMemoryIdGenerator implements IdGenerator {
  private n = 0;

  generate(): string {
    this.n += 1;
    return `id-${this.n}`;
  }
}

export class InMemoryClock implements Clock {
  constructor(private current = '2026-09-20T10:00:00.000Z') {}

  nowIso(): string {
    return this.current;
  }
}

export type { Account, CreateAccountBody, CreateRecordBody, WalletRecord };
