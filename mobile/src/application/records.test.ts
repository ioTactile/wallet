import { describe, expect, it } from '@jest/globals';

import { CreateRecord, DeleteRecord, GetRecord, ListRecords, UpdateRecord } from './records';
import { InMemoryRecordRepository, makeExpenseRecord } from './fakes';

function useCases(repo = new InMemoryRecordRepository()) {
  return {
    repo,
    list: new ListRecords(repo),
    get: new GetRecord(repo),
    create: new CreateRecord(repo),
    update: new UpdateRecord(repo),
    remove: new DeleteRecord(repo),
  };
}

describe('records', () => {
  it('lists records in a period and can create an expense', async () => {
    const { repo, list, create, get } = useCases();
    repo.records = [makeExpenseRecord()];

    const listed = await list.execute({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });
    expect(listed.records).toHaveLength(1);
    expect(listed.periodNetCents).toBe(-199);

    const created = await create.execute({
      kind: 'expense',
      accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      categoryId: 'food_drinks',
      amountCents: 100,
    });
    expect(created.kind).toBe('expense');
    await expect(get.execute(created.id)).resolves.toEqual(created);
  });

  it('updates a note and deletes an owned record', async () => {
    const { repo, update, remove, get } = useCases();
    repo.records = [makeExpenseRecord()];

    const updated = await update.execute(makeExpenseRecord().id, { note: 'Amazon' });
    expect(updated.note).toBe('Amazon');

    await remove.execute(makeExpenseRecord().id);
    await expect(get.execute(makeExpenseRecord().id)).rejects.toMatchObject({
      code: 'record_not_found',
    });
  });

  it('converts an expense to a transfer toward another account', async () => {
    const { repo, update } = useCases();
    repo.records = [makeExpenseRecord()];

    const updated = await update.execute(makeExpenseRecord().id, {
      kind: 'transfer',
      toAccountId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });
    expect(updated.kind).toBe('transfer');
    if (updated.kind !== 'transfer') {
      throw new Error('expected transfer');
    }
    expect(updated.fromAccountId).toBe(makeExpenseRecord().accountId);
    expect(updated.toAccountId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  });
});
