import { describe, expect, it } from '@jest/globals';
import { DEFAULT_ACCOUNT_COLOR, type CreateRecordBody } from '@wallet/shared';

import { RecordApiError } from '@/domain/errors';

import { CreateCashAccount } from './accounts';
import { InMemoryAccountRepository, InMemoryRecordRepository } from './fakes';
import { CreateRecord } from './records';
import {
  FlushWriteQueue,
  InMemoryClock,
  InMemoryIdGenerator,
  InMemoryWriteQueue,
} from './write-queue';

describe('offline write queue', () => {
  it('sends an Idempotency-Key and clears the queue on successful create', async () => {
    const records = new InMemoryRecordRepository();
    const queue = new InMemoryWriteQueue();
    const create = new CreateRecord(records, queue, new InMemoryIdGenerator(), new InMemoryClock());

    const body: CreateRecordBody = {
      kind: 'expense',
      accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      categoryId: 'food_drinks',
      amountCents: 100,
    };
    const created = await create.execute(body);

    expect(created.kind).toBe('expense');
    expect(records.lastCreateKey).toBe('id-1');
    expect(await queue.list()).toEqual([]);
  });

  it('keeps the pending write when the network fails so flush can retry with the same key', async () => {
    const records = new InMemoryRecordRepository();
    records.createError = new TypeError('Network request failed');
    const queue = new InMemoryWriteQueue();
    const create = new CreateRecord(records, queue, new InMemoryIdGenerator(), new InMemoryClock());

    await expect(
      create.execute({
        kind: 'expense',
        accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        categoryId: 'food_drinks',
        amountCents: 100,
      }),
    ).rejects.toBeInstanceOf(TypeError);

    const pending = await queue.list();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      kind: 'create_record',
      idempotencyKey: 'id-1',
    });

    records.createError = null;
    const flush = new FlushWriteQueue(records, new InMemoryAccountRepository(), queue);
    await flush.execute();

    expect(await queue.list()).toEqual([]);
    expect(records.lastCreateKey).toBe('id-1');
    expect(records.records).toHaveLength(1);
  });

  it('drops the queued write on a domain API error', async () => {
    const records = new InMemoryRecordRepository();
    records.createError = new RecordApiError('manual_record_on_bank');
    const queue = new InMemoryWriteQueue();
    const create = new CreateRecord(records, queue, new InMemoryIdGenerator(), new InMemoryClock());

    await expect(
      create.execute({
        kind: 'expense',
        accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        categoryId: 'food_drinks',
        amountCents: 100,
      }),
    ).rejects.toMatchObject({ code: 'manual_record_on_bank' });

    expect(await queue.list()).toEqual([]);
  });

  it('queues cash account creates with a stable Idempotency-Key', async () => {
    const accounts = new InMemoryAccountRepository();
    accounts.createError = new TypeError('offline');
    const queue = new InMemoryWriteQueue();
    const create = new CreateCashAccount(
      accounts,
      queue,
      new InMemoryIdGenerator(),
      new InMemoryClock(),
    );

    await expect(
      create.execute({
        name: 'Coffre',
        currency: 'EUR',
        color: DEFAULT_ACCOUNT_COLOR,
        excludeFromStats: false,
      }),
    ).rejects.toBeInstanceOf(TypeError);

    const pending = await queue.list();
    expect(pending).toEqual([
      expect.objectContaining({
        kind: 'create_account',
        idempotencyKey: 'id-1',
        body: expect.objectContaining({ kind: 'cash', name: 'Coffre' }),
      }),
    ]);
  });
});
